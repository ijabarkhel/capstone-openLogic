package datastore

import (
	"database/sql"
	"encoding/json"
	"errors"
)
/**/
//type Proof struct {
type FrontEndData struct {
	Id             int   // SQL ID
	EntryType      string   // 'proof'
	UserSubmitted  string	// Used for results, ignored on user input
	ProofName      string   // user-chosen name (repo problems start with 'Repository - ')
	ProofType      string   // 'prop' (propositional/tfl) or 'fol' (first order logic)
	Premise        []string // premises of the proof; an array of WFFs
	Logic          []string // body of the proof; a JSON-encoded string
	Rules          []string // deprecated; now always an empty string
	ProofCompleted string   // 'true', 'false', or 'error'
	Conclusion     string   // conclusion of the proof
	RepoProblem    string   // 'true' if problem started from a repo problem, else 'false'
	TimeSubmitted  string
}
/**/

type Problem struct {
	Id				int
	UserEmail		string
	ProofName		string
	ProofType		string
	Premise			[]string
	Conclusion		string
}

type Solution struct {
	Id				int
	ProblemId		int
	UserEmail		string
	Logic			[]string
	Rules			[]string
	SolutionStatus	string
	TimeSubmitted	string
}

type User struct{
	Email			string
	Name			string
	Permissions		string
}

type ProblemSet struct{
	Id				int
	ProblemId 		int
	Name			string
}

type Section struct{
	Id 				int
	UserEmail		string
	Name			string
	Role			string//the user's role in the section
}

type Assignment struct {
	ProblemSetId	int
	SectionId		int
}

//type UserWithEmail interface {
//	GetEmail() string
//}

type ProofStore struct {
	db *sql.DB
}

type IProofStore interface {
	Close() error
	CreateTables() error
	StoreSolution(solution Solution) error
	GetSolutions(userEmail string, problemId int) ([]Solution, error)
	DbPostTest(problem Problem) error
	DbGetTest() ([]Problem, error)
	AddAdmin(userData User) error
	DeleteAdmin(userData string) error
	AddStudentToSection(sectionData Section) error
	DeleteStudentFromSection(sectionData Section) error
	CreateSection(sectionData Section) error
	DeleteSection(sectionName string) error
	GetSectionData(sectionName string) ([]Section, error)
	//Empty() error
	//GetAllAttemptedRepoProofs() (error, []Proof)
	//GetRepoProofs() (error, []Proof)
	//GetUserProofs(user UserWithEmail) (error, []Proof)
	//GetUserCompletedProofs(user UserWithEmail) (error, []Proof)
	//Store(Proof) error
	//UpdateAdmins(admin_users map[string]bool)
}

func (p *ProofStore) CreateTables() error {
	//create problems table
	_, err := p.db.Exec(`CREATE TABLE IF NOT EXISTS problems(
		id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,--primary key
		userEmail TEXT,--user email of the user who created this problem
		proofName TEXT,--the name of the proof
		proofType TEXT,--Either 'prop' (propositional/tfl) or 'fol' (first order logic)
		premise TEXT,--array of premise strings stored as JSON strings
		conclusion TEXT,--string representing the conclusion of the proof
		FOREIGN KEY(userEmail) REFERENCES users(id)
	);`)
	if err != nil {
		return err
	}
	//create solutions table
	_, err = p.db.Exec(`CREATE TABLE IF NOT EXISTS solutions(
		id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,--primary key
		problemId INTEGER NOT NULL,--id of the problem this solves
		userEmail TEXT NOT NULL,--email of the user who created this solution
		logic TEXT,--Array of logic strings stored as JSON
		rules TEXT,--Array of rules strings stored as JSON
		solutionStatus TEXT,--stores the result of the solution: correct, incorrect, error
		timeSubmitted DATETIME,--Time the solution was submitted to the server
		FOREIGN KEY (problemID) REFERENCES problems(id),
		FOREIGN KEY(userEmail) REFERENCES users(id)
	);
	`)
	if err != nil {
		return err
	}
	//create users table
	_, err = p.db.Exec(`CREATE TABLE IF NOT EXISTS users(
		email TEXT PRIMARY KEY,-- the user's email and unique identifer
		name TEXT,--name of the user
		permissions TEXT--the permissions this user has. example 'admin'
	);`)
	if err != nil {
		return err
	}
	//create problemSets table
	_, err = p.db.Exec(`CREATE TABLE IF NOT EXISTS problemSets(
		setId INTEGER NOT NULL,--the set that the problem is IN
		problemId INTEGER NOT NULL,--the problem
		name TEXT,--the name of the problem set
		FOREIGN KEY(problemId) REFERENCES problem(id),
		PRIMARY KEY(setID,problemID)
		);`)
	if err != nil {
		return err
	}
	//create sections table
	_, err = p.db.Exec(`CREATE TABLE IF NOT EXISTS sections(
		id INTEGER NOT NULL,--the id of the section that the user belongs to
		userEmail TEXT NOT NULL,--the email of the user who is a part of the section
		name TEXT,-- the name of the section
		role TEXT,--describes the users role in the section, professor, student, ta
		FOREIGN KEY(userEmail) REFERENCES users(Id),
		PRIMARY KEY(id,userEmail)
	);`)
	if err != nil {
		return err
	}
	//create assignments table
	_, err = p.db.Exec(`CREATE TABLE IF NOT EXISTS assignments
		problemSetId INTEGER NOT NULL,--the problem set that can be accessed by the section
		sectionId INTEGER NOT NULL,--the section that can access the problem set
		FOREIGN KEY(problemSetId) REFERENCES problemSets(setId),
		FOREIGN KEY(sectionId) REFERENCES sections(id),
		PRIMARY KEY(problemSetId, sectionId)
	);`)
	if err != nil {
		return err
	}
	return nil
}

func (p *ProofStore) getUserByEmail(userEmail string) (User, error){
	var user User
	stmt, err := p.db.Prepare(`SELECT * FROM users WHERE users.email = ?`);

	if err != nil {
		return user, err
	}
	defer stmt.Close()

	rows, err := stmt.Query(userEmail)
	if err != nil {
		return user, err
	}
	defer rows.Close()

	for rows.Next(){
		rows.Scan(&user.Email,&user.Name,&user.Permissions)
		return user, nil
	}
	return user, errors.New("No user found in table users");

}

func (p *ProofStore) AddAdmin(userData User) error{
	//start a database transaction
	tx, err := p.db.Begin()
	if err != nil {
		return errors.New("Database transaction begin error")
	}

	stmt, err := tx.Prepare(`INSERT INTO users (
							email,
							name,
							permissions)
				 VALUES (?, ?, ?)`)
	defer stmt.Close()
	_, err = stmt.Exec(userData.Email, userData.Name, userData.Permissions)
	if err != nil {
		return errors.New("Transaction prepare error")
	}

	if err != nil {
		return errors.New("Statement exec error")
	}
	tx.Commit()

	return nil
}

func (p *ProofStore) DeleteAdmin(userData string) error{
	//start a database transaction
	tx, err := p.db.Begin()
	if err != nil {
		return errors.New("Database transaction begin error")
	}

	stmt, err := tx.Prepare(`DELETE FROM users WHERE users.email = ? AND users.permissions = 'Admin'`)
	defer stmt.Close()
	if err != nil {
		return errors.New("Transaction prepare error")
	}

	_, err = stmt.Exec(userData)
	if err != nil {
		return errors.New("Statement exec error")
	}
	tx.Commit()

	return nil
}

func (p *ProofStore) AddStudentToSection(sectionData Section) error{
	//start a database transaction
	tx, err := p.db.Begin()
	if err != nil {
		return errors.New("Database transaction begin error")
	}


	stmt, err := tx.Prepare(`INSERT INTO sections (
							userEmail,
							name,
							role,)
				 VALUES (?, ?, ?)`)
	defer stmt.Close()
	if err != nil {
		return errors.New("Transaction prepare error")
	}

	_, err = stmt.Exec(sectionData.UserEmail, sectionData.Name, sectionData.Role)
	if err != nil {
		return errors.New("Statement exec error")
	}
	tx.Commit()

	return nil
}

func (p *ProofStore) DeleteStudentFromSection(sectionData Section) error{
	//start a database transaction
	tx, err := p.db.Begin()
	if err != nil {
		return errors.New("Database transaction begin error")
	}

	stmt, err := tx.Prepare(`DELETE FROM sections WHERE sections.userEmail = ? AND sections.name = ? AND sections.role = 'Student'`)
	defer stmt.Close()
	if err != nil {
		return errors.New("Transaction prepare error")
	}

	_, err = stmt.Exec(sectionData.UserEmail, sectionData.Name)
	if err != nil {
		return errors.New("Statement exec error")
	}
	tx.Commit()

	return nil
}

func (p *ProofStore) CreateSection(sectionData Section) error{
	//start a database transaction
	tx, err := p.db.Begin()
	if err != nil {
		return errors.New("Database transaction begin error")
	}

	stmt, err := tx.Prepare(`INSERT INTO section (
							userEmail,
							name,
							role)
				 VALUES (?, ?, ?)`)
	defer stmt.Close()
	_, err = stmt.Exec(sectionData.UserEmail, sectionData.Name, sectionData.Role)
	if err != nil {
		return errors.New("Transaction prepare error")
	}

	if err != nil {
		return errors.New("Statement exec error")
	}
	tx.Commit()

	return nil
}

func (p *ProofStore) DeleteSection(sectionName string) error{
	//start a database transaction
	tx, err := p.db.Begin()
	if err != nil {
		return errors.New("Database transaction begin error")
	}

	stmt, err := tx.Prepare(`DELETE FROM sections WHERE sections.name = ?`)
	defer stmt.Close()
	if err != nil {
		return errors.New("Transaction prepare error")
	}

	_, err = stmt.Exec(sectionName)
	if err != nil {
		return errors.New("Statement exec error")
	}
	tx.Commit()

	return nil
}

func (p *ProofStore) GetSectionData(sectionName string) ([]Section, error){
	rows, err := p.db.Query("SELECT * FROM sections WHERE sections.Name = ?", sectionName)
	if err != nil{
		return nil, err
	}
	defer rows.Close()
	
	var sections []Section

	for rows.Next(){
		var section Section

		rows.Scan(&section.UserEmail, &section.Name)

		if(err !=nil){
			return nil, err
		}

		sections = append(sections, section)
		return sections, nil
	}

	return sections, nil
}

func (p *ProofStore) StoreSolution(solution Solution) error{
	//start a database transaction
	tx, err := p.db.Begin()
	if err != nil {
		return errors.New("Database transaction begin error")
	}

	stmt, err := tx.Prepare(`INSERT INTO solutions (
							ProblemId,
							userEmail,
							Logic,
							Rules,
							SolutionStatus,
							TimeSubmitted,)
				 VALUES (?, ?, ?, ?, ?, datetime('now'))`)
	defer stmt.Close()
	if err != nil {
		return errors.New("Transaction prepare error")
	}

	LogicJSON, err := json.Marshal(solution.Logic)
	if err != nil {
		return errors.New("Logic marshal error")
	}
	RulesJSON, err := json.Marshal(solution.Rules)
	if err != nil {
		return errors.New("Rules marshal error")
	}
	_, err = stmt.Exec(solution.ProblemId, solution.UserEmail, LogicJSON, RulesJSON, solution.SolutionStatus)
	if err != nil {
		return errors.New("Statement exec error")
	}
	tx.Commit()

	return nil
}

func (p *ProofStore) GetSolutions(userEmail string, problemId int) ([]Solution, error){
	stmt, err := p.db.Prepare(`SELECT * FROM solutions WHERE solutions.userEmail=? AND solutions.problemId=?`)
	if err != nil{
		return nil, err
	}

	rows, err := stmt.Query(userEmail,problemId)
	if err != nil{
		return nil, err
	}
	defer rows.Close()
	
	var solutions []Solution
	for rows.Next(){
		var s Solution
		var LogicJSON string
		var RulesJSON string

		err := rows.Scan(&s.Id, &s.ProblemId, &s.UserEmail, &LogicJSON, &RulesJSON, &s.SolutionStatus, &s.TimeSubmitted)
		if err != nil{
			return nil, err
		}

		err = json.Unmarshal([]byte(LogicJSON), &s.Logic)
		if err != nil{
			return nil, err
		}

		err = json.Unmarshal([]byte(RulesJSON), &s.Rules)
		if err != nil{
			return nil, err
		}

		solutions = append(solutions, s)
	}

	return solutions, nil
}

func (p *ProofStore) DbPostTest(problem Problem) error{
	tx, err := p.db.Begin()
	if err != nil{
		return err
	}
	stmt, err := tx.Prepare(`INSERT INTO problems(userEmail, proofName, proofType, premise, conclusion) VALUES(?,?,?,?,?)`)
	if err != nil {
		return err
		//return errors.New("Transaction prepare error")
	}	
	defer stmt.Close()

	premiseJSON, err := json.Marshal(problem.Premise)
	if err != nil {
		return errors.New("Premise marshal error")
	}

	_, err = stmt.Exec(problem.UserEmail, problem.ProofName, problem.ProofType, premiseJSON, problem.Conclusion)
	if err != nil {
		return errors.New("Statement exec error")
	}
	tx.Commit()

	return nil
}

func (p *ProofStore) DbGetTest() ([]Problem, error){
	rows, err := p.db.Query("SELECT * FROM problems")
	if err != nil{
		return nil, err
	}
	defer rows.Close()
	
	var problems []Problem

	for rows.Next(){
		var problem Problem
		var PremiseJSON string

		rows.Scan(&problem.Id, &problem.UserEmail, &problem.ProofName, &problem.ProofType, &PremiseJSON, &problem.Conclusion)

		err = json.Unmarshal([]byte(PremiseJSON), &PremiseJSON)
		if(err !=nil){
			return nil, err
		}

		problems = append(problems, problem)
		return problems, nil
	}

	return problems, nil
}
/*
func (p *ProofStore) Empty() error {
	_, err := p.db.Exec(`DELETE FROM proofs`)
	return err
}
func getProofsFromRows(rows *sql.Rows) (error, []Proof) {
	var userProofs []Proof
	for rows.Next() {
		var userProof Proof
		var PremiseJSON string
		var LogicJSON string
		var RulesJSON string

		err := rows.Scan(&userProof.Id, &userProof.EntryType, &userProof.UserSubmitted, &userProof.ProofName, &userProof.ProofType, &PremiseJSON, &LogicJSON, &RulesJSON, &userProof.ProofCompleted, &userProof.TimeSubmitted, &userProof.Conclusion, &userProof.RepoProblem)
		if err != nil {
			return err, nil
		}

		if err = json.Unmarshal([]byte(PremiseJSON), &userProof.Premise); err != nil {
			return err, nil
		}
		if err = json.Unmarshal([]byte(LogicJSON), &userProof.Logic); err != nil {
			return err, nil
		}
		if err = json.Unmarshal([]byte(RulesJSON), &userProof.Rules); err != nil {
			return err, nil
		}

		userProofs = append(userProofs, userProof)
	}

	return nil, userProofs
}

func (p *ProofStore) GetAllAttemptedRepoProofs() (error, []Proof) {
	// Create 'admin_repoproblems' view
	_, err := p.db.Exec(`DROP VIEW IF EXISTS admin_repoproblems`)
	if err != nil {
		return err, nil
	}

	_, err = p.db.Exec(`CREATE VIEW admin_repoproblems (userSubmitted, Premise, Conclusion) AS SELECT userSubmitted, Premise, Conclusion FROM proofs WHERE userSubmitted IN (SELECT email FROM admins)`)
	if err != nil {
		return err, nil
	}

	stmt, err := p.db.Prepare(`SELECT id, entryType, userSubmitted, proofName, proofType, Premise, Logic, Rules, proofCompleted, timeSubmitted, Conclusion, repoProblem
								FROM proofs
								INNER JOIN admin_repoproblems ON
									proofs.Premise = admin_repoproblems.Premise AND
									proofs.Conclusion = admin_repoproblems.Conclusion`)
	if err != nil {
		return err, nil
	}
	defer stmt.Close()
	
	rows, err := stmt.Query()
	if err != nil {
		return err, nil
	}
	defer rows.Close()

	return getProofsFromRows(rows)
}

func (p *ProofStore) GetRepoProofs() (error, []Proof) {
	stmt, err := p.db.Prepare("SELECT id, entryType, userSubmitted, proofName, proofType, Premise, Logic, Rules, proofCompleted, timeSubmitted, Conclusion, repoProblem FROM proofs WHERE repoProblem = 'true' AND userSubmitted IN (SELECT email FROM admins) ORDER BY userSubmitted")
	if err != nil {
		return err, nil
	}
	defer stmt.Close()

	rows, err := stmt.Query()
	if err != nil {
		return err, nil
	}
	defer rows.Close()

	return getProofsFromRows(rows)
}

func (p *ProofStore) GetUserProofs(user UserWithEmail) (error, []Proof) {
	stmt, err := p.db.Prepare("SELECT id, entryType, userSubmitted, proofName, proofType, Premise, Logic, Rules, proofCompleted, timeSubmitted, Conclusion, repoProblem FROM proofs WHERE userSubmitted = ? AND proofCompleted != 'true' AND proofName != 'n/a'")
	if err != nil {
		return err, nil
	}
	defer stmt.Close()

	rows, err := stmt.Query(user.GetEmail())
	if err != nil {
		return err, nil
	}
	defer rows.Close()

	return getProofsFromRows(rows)
}

func (p *ProofStore) GetUserCompletedProofs(user UserWithEmail) (error, []Proof) {
	stmt, err := p.db.Prepare("SELECT id, entryType, userSubmitted, proofName, proofType, Premise, Logic, Rules, proofCompleted, timeSubmitted, Conclusion, repoProblem FROM proofs WHERE userSubmitted = ? AND proofCompleted = 'true'")
	if err != nil {
		return err, nil
	}
	defer stmt.Close()

	rows, err := stmt.Query(user.GetEmail())
	if err != nil {
		return err, nil
	}
	defer rows.Close()

	return getProofsFromRows(rows)
}

func (p *ProofStore) Store(proof Proof) error {
	tx, err := p.db.Begin()
	if err != nil {
		return errors.New("Database transaction begin error")
	}
	stmt, err := tx.Prepare(`INSERT INTO proofs (entryType,
							userSubmitted,
							proofName,
							proofType,
							Premise,
							Logic,
							Rules,
							proofCompleted,
							timeSubmitted,
							Conclusion,
							repoProblem)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?, ?)
				 ON CONFLICT (userSubmitted, proofName) DO UPDATE SET
					 	entryType = ?,
					 	proofType = ?,
					 	Premise = ?,
					 	Logic = ?,
					 	Rules = ?,
					 	proofCompleted = ?,
					 	timeSubmitted = datetime('now'),
					 	Conclusion = ?,
					 	repoProblem = ?`)
	defer stmt.Close()
	if err != nil {
		return errors.New("Transaction prepare error")
	}

	PremiseJSON, err := json.Marshal(proof.Premise)
	if err != nil {
		return errors.New("Premise marshal error")
	}
	LogicJSON, err := json.Marshal(proof.Logic)
	if err != nil {
		return errors.New("Logic marshal error")
	}
	RulesJSON, err := json.Marshal(proof.Rules)
	if err != nil {
		return errors.New("Rules marshal error")
	}
	_, err = stmt.Exec(proof.EntryType, proof.UserSubmitted, proof.ProofName, proof.ProofType,
		PremiseJSON, LogicJSON, RulesJSON, proof.ProofCompleted, proof.Conclusion, proof.RepoProblem,
		proof.EntryType, proof.ProofType, PremiseJSON, LogicJSON, RulesJSON, proof.ProofCompleted,
		proof.Conclusion, proof.RepoProblem)
	if err != nil {
		return errors.New("Statement exec error")
	}
	tx.Commit()

	return nil
}

func (p *ProofStore) UpdateAdmins(admin_users map[string]bool) {
	// Rebuild 'admins' table
	_, err := p.db.Exec(`DROP TABLE IF EXISTS admins`)
	if err != nil {
		log.Fatal(err)
	}

	_, err = p.db.Exec(`CREATE TABLE admins (
			email TEXT
		)`)
	if err != nil {
		log.Fatal(err)
	}

	stmt, err := p.db.Prepare(`INSERT INTO admins VALUES (?)`)
	if err != nil {
		log.Fatal(err)
	}
	defer stmt.Close()

	for adminEmail := range admin_users {
		_, err = stmt.Exec(adminEmail)
		if err != nil {
			log.Fatal(err)
		}
	}
}*/
