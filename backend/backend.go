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
		"ijabarkhel@csumb.edu": true,
		"dediriweera@csumb.edu": true,
		"whayden@csumb.edu": true,
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

func (env *Env) addAdmin(w http.ResponseWriter, req *http.Request) {
	//var user userWithEmail
	//user = req.Context().Value("tok").(userWithEmail)

	var user datastore.User

	if err := json.NewDecoder(req.Body).Decode(&user); err != nil {
                log.Println(err)
                http.Error(w, err.Error(), 400)
                return
        }

	log.Printf("%+v", user)

	if len(user.Email) == 0 {
                http.Error(w, "enter email to add admin", 400)
                return
        }


	if len(user.Name) == 0 {
                http.Error(w, "enter fullname to add admin", 400)
                return
        }

	if err := env.ds.AddAdmin(user); err != nil {
                http.Error(w, err.Error(), 500)
                return
        }

	w.Header().Set("Content-Type", "application/json")
	io.WriteString(w, `{"success": "true"}`)
}

func (env *Env) deleteAdmin(w http.ResponseWriter, req *http.Request) {
	//var user userWithEmail
	//user = req.Context().Value("tok").(userWithEmail)

	var adminEmail string

	if err := json.NewDecoder(req.Body).Decode(&adminEmail); err != nil {
                log.Println(err)
                http.Error(w, err.Error(), 400)
                return
        }

	log.Printf("%+v", adminEmail)

	if len(adminEmail) == 0 {
                http.Error(w, "enter email to delete admin", 400)
                return
        }

	if err := env.ds.DeleteAdmin(adminEmail); err != nil {
                http.Error(w, err.Error(), 500)
                return
        }

	w.Header().Set("Content-Type", "application/json")
	io.WriteString(w, `{"success": "true"}`)
}


func (env *Env) addStudentToSection(w http.ResponseWriter, req *http.Request) {

	var section datastore.Section

	if err := json.NewDecoder(req.Body).Decode(&section); err != nil {
                log.Println(err)
                http.Error(w, err.Error(), 400)
                return
        }

	log.Printf("%+v", section)

	if len(section.UserEmail) == 0 {
                http.Error(w, "enter email for user to add it to section", 400)
                return
        }

	if len(section.Name) == 0 {
                http.Error(w, "enter section name to add a student in it", 400)
                return
        }

	if err := env.ds.AddStudentToSection(section); err != nil {
                http.Error(w, err.Error(), 500)
                return
        }

	w.Header().Set("Content-Type", "application/json")
	io.WriteString(w, `{"success": "true"}`)
}

func (env *Env) deleteStudentFromSection(w http.ResponseWriter, req *http.Request) {

	var section datastore.Section

	if err := json.NewDecoder(req.Body).Decode(&section); err != nil {
                log.Println(err)
                http.Error(w, err.Error(), 400)
                return
        }
	log.Printf("%+v", section)

	if len(section.UserEmail) == 0 {
                http.Error(w, "enter email for user to delete it from section", 400)
                return
        }

	if len(section.Name) == 0 {
                http.Error(w, "enter section name to delete a student", 400)
                return
        }

	if err := env.ds.DeleteStudentFromSection(section); err != nil {
                http.Error(w, err.Error(), 500)
                return
        }

	w.Header().Set("Content-Type", "application/json")
	io.WriteString(w, `{"success": "true"}`)
}

func (env *Env) createSection(w http.ResponseWriter, req *http.Request) {
	user := req.Context().Value("tok").(userWithEmail)
	var section datastore.Section
	var sectionName string

	if err := json.NewDecoder(req.Body).Decode(&sectionName); err != nil {
                log.Println(err)
                http.Error(w, err.Error(), 400)
                return
        }

	log.Printf("%+v", sectionName)

	if len(sectionName) == 0 {
                http.Error(w, "enter section name to create section", 400)
                return
        }
	section.UserEmail = user.GetEmail()
	section.Name = sectionName
	section.Role = "Admin"

	if err := env.ds.CreateSection(section); err != nil {
                http.Error(w, err.Error(), 500)
                return
        }

	w.Header().Set("Content-Type", "application/json")
	io.WriteString(w, `{"success": "true"}`)
}

func (env *Env) deleteSection(w http.ResponseWriter, req *http.Request) {

	var sectionName string

	if err := json.NewDecoder(req.Body).Decode(&sectionName); err != nil {
                log.Println(err)
                http.Error(w, err.Error(), 400)
                return
        }

	log.Printf("%+v", sectionName)

	if len(sectionName) == 0 {
                http.Error(w, "enter section name to delete section", 400)
                return
        }

	if err := env.ds.DeleteSection(sectionName); err != nil {
                http.Error(w, err.Error(), 500)
                return
        }

	w.Header().Set("Content-Type", "application/json")
	io.WriteString(w, `{"success": "true"}`)
}

func (env *Env) getSectionData(w http.ResponseWriter, req *http.Request) {

	var sectionName string

	if err := json.NewDecoder(req.Body).Decode(&sectionName); err != nil {
                log.Println(err)
                http.Error(w, err.Error(), 400)
                return
        }

	log.Printf("%+v", sectionName)

	if len(sectionName) == 0 {
                http.Error(w, "enter section name to create section", 400)
                return
        }

	sectionData, err := env.ds.GetSectionData(sectionName)
	if err != nil{
		log.Fatal(err)
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(sectionData)

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
	solution.UserEmail = "whayden@csumb.edu"//
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
func handlerTest(w http.ResponseWriter, req *http.Request) {
	w.Write([]byte("Hello world"))
}

func serveFile(w http.ResponseWriter, req *http.Request) {
	http.ServeFile(w, req, "/admin.html");
}

func (env *Env) dbGetTest(w http.ResponseWriter, req *http.Request){
	type problemArray struct {
		Problems	[]datastore.Problem
	}
	var problems problemArray
	temp, err := env.ds.DbGetTest()
	problems.Problems = temp
	if err != nil{
		log.Fatal(err)
	}
	output, err := json.Marshal(problems.Problems)
	if err != nil{
		log.Fatal(err)
	}
	w.Header().Set("Content-Type", "application/json")
	w.Write(output)
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
		log.Println("database connection failed to initialize")
		log.Fatal(err)
	}
	defer ds.Close()
	//create the tables if they do not exist
	ds.CreateTables();

	// Add the admin users to the database for use in queries
	//ds.UpdateAdmins(admin_users)
	
	Env := &Env{ds} // Put the instance into a struct to share between threads
	
	doClearDatabase := flag.Bool("cleardb", false, "Remove all proofs from the database")
	doPopulateDatabase := flag.Bool("populate", false, "Add sample data to the public repository.")
	portPtr := flag.String("port", "8080", "Port to listen on")

	flag.Parse() // Check for command-line arguments
	if *doClearDatabase {
		log.Println("cleardb")
		//Env.clearDatabase()
	}
	if *doPopulateDatabase {
		log.Println("popdb")
		//Env.populateTestData()
	}

	// Initialize token auth/cache
	tokenauth.SetAuthorizedDomains(authorized_domains)
	tokenauth.SetAuthorizedClientIds(authorized_client_ids)

	// method saveproof : POST : JSON <- id_token, proof
	http.Handle("/saveproof", tokenauth.WithValidToken(http.HandlerFunc(Env.saveProof)))

	// method addAdmin : POST : JSON <- id_token, admin
	http.Handle("/addAdmin", tokenauth.WithValidAdminToken(http.HandlerFunc(Env.addAdmin), admin_users))

	// method user : POST : JSON -> [proof, proof, ...]
	http.Handle("/proofs", tokenauth.WithValidToken(http.HandlerFunc(Env.getProofs)))

	// method deleteAdmin : POST : JSON <- id_token, admin
	http.Handle("/deleteAdmin", tokenauth.WithValidAdminToken(http.HandlerFunc(Env.deleteAdmin), admin_users))

	// method addStudentToSection : POST : JSON <- id_token, admin
	http.Handle("/addStudentToSection", tokenauth.WithValidAdminToken(http.HandlerFunc(Env.addStudentToSection), admin_users))

	// method deleteStudentFromSection : POST : JSON <- id_token, admin
	http.Handle("/deleteStudentFromSection", tokenauth.WithValidAdminToken(http.HandlerFunc(Env.deleteStudentFromSection), admin_users))

	// method createSection : POST : JSON <- id_token, admin
	http.Handle("/createSection", tokenauth.WithValidAdminToken(http.HandlerFunc(Env.createSection), admin_users))

	// method deleteSection : POST : JSON <- id_token, admin
	http.Handle("/deleteSection", tokenauth.WithValidAdminToken(http.HandlerFunc(Env.deleteSection), admin_users))

	// method getSectionData : POST : JSON <- id_token, admin
	http.Handle("/getSectionData", tokenauth.WithValidAdminToken(http.HandlerFunc(Env.getSectionData), admin_users))

	http.Handle("/dbgettest", http.HandlerFunc(Env.dbGetTest))
	http.Handle("/dbposttest", http.HandlerFunc(Env.dbPostTest))
	http.Handle("/test",http.HandlerFunc(handlerTest))

	log.Println("Server started on: 127.0.0.1:"+(*portPtr) )
	// Get admin users -- this is a public endpoint, no token required
	// Can be changed to require token, but would reduce cacheability
	http.Handle("/admins", http.HandlerFunc(getAdmins))
	http.Handle("/admin.html", tokenauth.WithValidAdminToken(http.HandlerFunc(serveFile), admin_users))
	log.Fatal(http.ListenAndServe("127.0.0.1:"+(*portPtr), nil))
}
