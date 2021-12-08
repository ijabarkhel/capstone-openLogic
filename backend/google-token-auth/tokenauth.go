package tokenauth

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"sync"
	"time"
)

type TokenData struct {
	Iss               string // "accounts.google.com"
	Azp               string
	Aud               string
	Sub               string
	Hd                string
	Email             string
	Email_verified    string
	At_hash           string
	Name              string // "Corey Hunter"
	Picture           string // "https://lh4.googleusercontent.com/-qvtvJDBlbvU/AAAAAAAAAAI/AAAAAAAAAAA/AMZuucnRE4tpBC_h0n7AR6XRU-zmL0W8_w/s96-c/photo.jpg"
	Given_name        string // "Corey"
	Family_name       string // "Hunter"
	Locale            string // "en"
	Iat               int64  `json:"iat,string"` // "1590043835"
	Exp               int64  `json:"exp,string"` // "1590047435"
	Jti               string
	Alg               string
	Kid               string
	Type              string `json:"type"` // "JWT"
	Error             string // not present unless error
	Error_description string // also not usually present
}

func (td TokenData) GetEmail() string {
	return td.Email
}

type cachedTokenData struct {
	data  TokenData
	valid bool
}

var (
	authorized_domains    = map[string]bool{}
	authorized_client_ids = map[string]bool{}

	// These are the required entries for Google-issued tokens
	authorized_issuers = map[string]bool{
		"accounts.google.com":         true,
		"https://accounts.google.com": true,
	}

	token_cache = struct {
		sync.RWMutex
		val map[string]*cachedTokenData
	}{val: make(map[string]*cachedTokenData)}
)

// This should be called once, during server start.
func SetAuthorizedDomains(domains []string) {
	for _, domain := range domains {
		authorized_domains[domain] = true
	}
}

// This should be called once, during server start.
func SetAuthorizedClientIds(clients []string) {
	for _, client := range clients {
		authorized_client_ids[client] = true
	}
}

// Verify a Google-issued JWT token
// return the token data and whether it is valid
func Verify(token string) (TokenData, bool) {
	tok_cached, err := getFromCache(token)
	if err == nil {
		// Return data and validity from cache (does not respect expiration)
		return tok_cached.data, tok_cached.valid
	}

	tok, err := decodeByApi(token)
	if err != nil {
		log.Println("token decode error", err)
		return tok, false
	}

	valid := isValid(tok)

	go addToCache(token, tok, valid)

	return tok, valid
}

// Verify a Google-issued JWT token
// return the token data and whether it is admin and valid
func VerifyAdmin(token string, admin_users map[string]bool) (TokenData, bool) {
	tok_cached, err := getFromCache(token)
	if err == nil {
		// Return data and validity from cache (does not respect expiration)
		return tok_cached.data, tok_cached.valid
	}

	tok, err := decodeByApi(token)
	if err != nil {
		log.Println("token decode error", err)
		return tok, false
	}

	valid := isAdmin(tok, admin_users)

	go addToCache(token, tok, valid)

	return tok, valid
}

// Middleware to validate a Google-issued JWT before processing the request
// Assumes the request is NOT cross-origin, and so does not send CORS headers
func WithValidToken(next http.Handler) http.Handler {
	return http.HandlerFunc(func (w http.ResponseWriter, req *http.Request) {
		if req.Method != "POST" || req.Body == nil {
			http.Error(w, "Request not authorized.", 401);
			return
		}

		log.Println(req.Header.Get("X-Auth-Token"))
		
		tok, valid := Verify(req.Header.Get("X-Auth-Token"))
		if !valid {
			http.Error(w, "Token not valid.", 401)
			return
		}

		ctx := context.WithValue(req.Context(), "tok", tok)

		next.ServeHTTP(w, req.WithContext(ctx))
	})
}

// Middleware to validate a Google-issued JWT before processing the request
// Assumes the request is NOT cross-origin, and so does not send CORS headers
func WithValidAdminToken(next http.Handler, admin_users map[string]bool) http.Handler {
	return http.HandlerFunc(func (w http.ResponseWriter, req *http.Request) {
		if req.Method != "POST" || req.Body == nil {
			http.Error(w, "Request not authorized.", 401);
			return
		}

		log.Println(req.Header.Get("X-Auth-Token"))
		
		tok, valid := VerifyAdmin(req.Header.Get("X-Auth-Token"), admin_users)
		if !valid {
			http.Error(w, "Token not valid.", 401)
			return
		}

		ctx := context.WithValue(req.Context(), "tok", tok)

		next.ServeHTTP(w, req.WithContext(ctx))
	})
}

func getFromCache(token string) (*cachedTokenData, error) {
	token_cache.RLock()
	defer token_cache.RUnlock()

	tok, found := token_cache.val[token]
	if !found {
		return &cachedTokenData{}, errors.New("Not found")
	}
	return tok, nil
}

func addToCache(token string, data TokenData, valid bool) {
	token_cache.Lock()
	defer token_cache.Unlock()

	token_cache.val[token] = &cachedTokenData{
		data:  data,
		valid: valid,
	}
}

func init() {
	// Launch goroutine to periodically remove expired cache entries
	go func() {
		for range time.NewTicker(500 * time.Second).C {
			pruneCache()
		}
	}()
}

// Remove expired tokens from the cache
func pruneCache() {
	log.Println("Cache prune started")
	token_cache.Lock()
	defer token_cache.Unlock()

	for token, cached_token := range token_cache.val {
		if time.Now().After(time.Unix(cached_token.data.Exp, 0)) {
			log.Printf("Removing expired token: +%v", cached_token.data)
			delete(token_cache.val, token)
		} else {
			log.Printf("Keeping unexpired token: %+v", cached_token.data)
		}
	}
}

// Use the Google OAUTH2 API to verify the token's signature and
// retrieve the token data as JSON. The API also checks expiration.
func decodeByApi(token string) (TokenData, error) {
	var data TokenData
	var client = &http.Client{Timeout: 5 * time.Second}

	response, err := client.Get("https://oauth2.googleapis.com/tokeninfo?id_token=" + token)
	if err != nil {
		return data, err
	}
	defer response.Body.Close()

	if err = json.NewDecoder(response.Body).Decode(&data); err != nil {
		return data, err
	}

	return data, nil
}

// Check token data for validity
// https://developers.google.com/identity/sign-in/web/backend-auth#verify-the-integrity-of-the-id-token
// Returns true (valid token) or false (invalid)
func isValid(td TokenData) bool {
	// Validate domain
	if !authorized_domains[td.Hd] {
		log.Printf("Unauthorized domain: %#v", td.Hd)
		return false
	}

	// Validate Aud(ience)
	if !authorized_client_ids[td.Aud] {
		log.Printf("Unauthorized client ID: %#v", td.Aud)
		return false
	}

	// Validate Iss(uer)
	if !authorized_issuers[td.Iss] {
		log.Printf("Unauthorized issuer: %#v", td.Iss)
		return false
	}

	// Validate Exp(iration)
	expTime := time.Unix(td.Exp, 0)
	if time.Now().After(expTime) {
		log.Printf("Expired token")
		return false
	}

	return true
}

// Check token data for validity and adminship
// https://developers.google.com/identity/sign-in/web/backend-auth#verify-the-integrity-of-the-id-token
// Returns true (valid token) or false (invalid)
func isAdmin(td TokenData, admin_users map[string]bool ) bool {
	// validate admin
	if !admin_users[td.Email] {
		log.Printf("Unauthorized admin: %#v", td.Email)
		return false
	}

	return isValid(td)
}
