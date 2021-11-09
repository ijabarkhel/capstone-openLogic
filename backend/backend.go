package main

import (
	"encoding/json"
	"io"
	"log"
	"net/http"
	"flag"

	datastore "./datastore"
	tokenauth "./google-token-auth"
)

var (
	// Set allowed domains here.
	authorized_domains = []string{
		"csumb.edu",
	}

	// Client-side client ID from your Google Developer Console
	// Same as in the front-end index.php
	authorized_client_ids = []string{
		"684622091896-1fk7qevoclhjnhc252g5uhlo5q03mpdo.apps.googleusercontent.com",
		//"49611062474-h65v7vphkti1k1lnbfp4it0nn9omikss.apps.googleusercontent.com",
		//"266670200080-to3o173goghk64b6a0t0i04o18nt2r3i.apps.googleusercontent.com",
	}

	admin_users = map[string]bool{
        "sislam@csumb.edu":   true,
		"gbruns@csumb.edu":   true,
		"cohunter@csumb.edu": true,
	}

	// When started via systemd, WorkingDirectory is set to one level above the public_html directory
	database_uri = "file:db.sqlite3?cache=shared&mode=rwc&_journal_mode=WAL"
)

type userWithEmail interface {
	GetEmail() string
}

type Env struct {
	ds datastore.IProofStore
}

func getAdmins(w http.ResponseWriter, req *http.Request) {
	type adminUsers struct {
		Admins []string
	}
	var admins adminUsers
	for adminEmail := range admin_users {
		admins.Admins = append(admins.Admins, adminEmail)
	}
	output, err := json.Marshal(admins)
	if err != nil {
		http.Error(w, "Error returning admin users.", 500)
		return
	}

	// Allow browsers and intermediaries to cache this response for up to a day (86400 seconds)
	w.Header().Set("Cache-Control", "public, max-age=86400")
	io.WriteString(w, string(output))
}


func (env *Env) saveProof(w http.ResponseWriter, req *http.Request) {
	//var user userWithEmail
	//user = req.Context().Value("tok").(userWithEmail)
	
	var submittedProof datastore.FrontEndData

	// read the JSON-encoded value from the HTTP request and store it in submittedProof
	if err := json.NewDecoder(req.Body).Decode(&submittedProof); err != nil {
		log.Println(err)
		http.Error(w, err.Error(), 400)
		return
	}

	log.Printf("%+v", submittedProof)

	if len(submittedProof.ProofName) == 0 {
		http.Error(w, "Proof name is empty", 400)
		return
	}

	// Replace submitted email (if any) with the email from the token
	//submittedProof.UserSubmitted = user.GetEmail()

	//change old front end data to new format
	var solution datastore.Solution
	solution.ProblemId = submittedProof.Id
	solution.UserId = 0//
	solution.Logic = submittedProof.Logic
	solution.Rules = submittedProof.Rules
	solution.SolutionStatus = submittedProof.ProofCompleted

	if err := env.ds.StoreSolution(solution); err != nil {
		http.Error(w, err.Error(), 500)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	io.WriteString(w, `{"success": "true"}`)
}


func (env *Env) getProofs(w http.ResponseWriter, req *http.Request) {
	user := req.Context().Value("tok").(userWithEmail)

	if req.Method != "POST" || req.Body == nil {
		http.Error(w, "Request not accepted.", 400)
		return
	}

	// Accepted JSON fields must be defined here
	type getProofRequest struct {
		Selection string `json:"selection"`
	}

	var requestData getProofRequest

	decoder := json.NewDecoder(req.Body)

	if err := decoder.Decode(&requestData); err != nil {
		http.Error(w, "Unable to decode request body.", 400)
		return
	}

	log.Printf("%+v", requestData)

	if len(requestData.Selection) == 0 {
		http.Error(w, "Selection required", 400)
		return
	}

	log.Printf("USER: %q", user)

	var err error
	var proofs []datastore.FrontEndData
	switch requestData.Selection {
	/*
	case "user":
		log.Println("user selection")
		err, proofs = env.ds.GetUserProofs(user)

	case "repo":
		log.Println("repo selection")
		err, proofs = env.ds.GetRepoProofs()

	case "completedrepo":
		log.Println("completedrepo selection")
		err, proofs = env.ds.GetUserCompletedProofs(user)
	
	case "downloadrepo":
		log.Println("downloadrepo selection")
		if !admin_users[user.GetEmail()] {
			http.Error(w, "Insufficient privileges", 403)
			return
		}
		err, proofs = env.ds.GetAllAttemptedRepoProofs()
	*/
	default:
		http.Error(w, "invalid selection", 400)
		return
	}

	if err != nil {
		http.Error(w, "Query error", 500)
		return
	}

	log.Printf("%+v", proofs)
	userProofsJSON, err := json.Marshal(proofs)
	if err != nil {
		http.Error(w, "json marshal error", 500)
		log.Print(err)
		return
	}

	io.WriteString(w, string(userProofsJSON))

	log.Printf("%q", user)
	log.Printf("%+v", req.URL.Query())
}

// This will delete all rows, but not reset the auto_increment id
/*
func (env *Env) clearDatabase() {
	if err := env.ds.Empty(); err != nil {
		log.Fatal(err)
	}
}
*/

func (env *Env) dbGetTest(w http.ResponseWriter, req *http.Request){
	testData, err := env.ds.DbGetTest()
	if err != nil{
		log.Fatal(err)
	}
	json.NewEncoder(w).Encode(testData)
}

func (env *Env) dbPostTest(w http.ResponseWriter, req *http.Request){
	var problem datastore.Problem
	json.NewDecoder(req.Body).Decode(&problem)
	env.ds.DbPostTest(problem)

	w.Header().Set("Content-Type", "application/json")
	io.WriteString(w, `{"success": "true"}`)
}

func main() {
	log.Println("Server initializing")

	ds, err := datastore.New(database_uri)
	if err != nil {
		log.Fatal(err)
	}
	defer ds.Close()
	//create the tables if they do not exist
	ds.CreateTables();

	// Add the admin users to the database for use in queries
	//ds.UpdateAdmins(admin_users)
	
	Env := &Env{ds} // Put the instance into a struct to share between threads
	
	portPtr := flag.String("port", "8080", "Port to listen on")
	/*
	doClearDatabase := flag.Bool("cleardb", false, "Remove all proofs from the database")
	doPopulateDatabase := flag.Bool("populate", false, "Add sample data to the public repository.")
	
	
	flag.Parse() // Check for command-line arguments
	if *doClearDatabase {
		Env.clearDatabase()
	}
	if *doPopulateDatabase {
		Env.populateTestData()
	}
	*/
	var problem datastore.Problem
	problem.OwnerId = 1
	problem.ProofName = "Test"
	problem.ProofType = "prop"
	problem.Premise = []string{"P"}
	problem.Conclusion = "P"
	Env.ds.DbPostTest(problem)

	// Initialize token auth/cache
	tokenauth.SetAuthorizedDomains(authorized_domains)
	tokenauth.SetAuthorizedClientIds(authorized_client_ids)

	// method saveproof : POST : JSON <- id_token, proof
	http.Handle("/saveproof", tokenauth.WithValidToken(http.HandlerFunc(Env.saveProof)))

	// method user : POST : JSON -> [proof, proof, ...]
	http.Handle("/proofs", tokenauth.WithValidToken(http.HandlerFunc(Env.getProofs)))

	http.Handle("/dbgettest", http.HandlerFunc(Env.dbGetTest))
	http.Handle("/dbposttest", http.HandlerFunc(Env.dbPostTest))

	// Get admin users -- this is a public endpoint, no token required
	// Can be changed to require token, but would reduce cacheability
	http.Handle("/admins", http.HandlerFunc(getAdmins))
	log.Println("Server started on: 127.0.0.1:8080" )
	log.Fatal(http.ListenAndServe("127.0.0.1:"+(*portPtr), nil))
}
