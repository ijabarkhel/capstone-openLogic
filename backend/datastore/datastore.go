package datastore

import (
	"database/sql"
	"encoding/json"
	"errors"
	"log"
)
/**/
//type Proof struct {
type FrontEndData {
	Id             string   // SQL ID
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
	OwnerId			int
	ProofName		string
	ProofType		string
	Premise			[]string
	Conclusion		string
}

type Solution struct {
	Id				int
	ProblemId		int
	UserId 			int
	Logic			[]string
	Rules			[]string
	SolutionStatus	string
	TimeSubmitted	string
}

type User struct{
	id				int
	email			string
	name			string
	permissions		string
}

type ProblemSet struct{
	id				int
	problemId 		int
	name			string
}

type Section struct{
	id 				int
	userId			int
	name			string
	role			string//the user's role in the section
}

type Assignment struct {
	problemSetId	int
	sectionId		int
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
	GetSolutions(userId int, problemId int) ([]solution, error)
	DbPostTest(problem Problem) error
	DbGetTest() Problem error
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
	_, err = db.Exec(`CREATE TABLE IF NOT EXISTS problems(
		id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,--primary key
		ownerId INTEGER,--id of user who created this argument
		proofName TEXT,--the name of the proof
		proofType TEXT,--Either 'prop' (propositional/tfl) or 'fol' (first order logic)
		premise TEXT,--array of premise strings stored as JSON strings
		conclusion TEXT,--string representing the conclusion of the proof
		FOREIGN KEY(userId) REFERENCES users(id)
	);`)
	if err != nil {
		return nil, err
	}
	//create solutions table
	_, err = db.Exec(`CREATE TABLE IF NOT EXISTS solutions(
		id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,--primary key
		problemId INTEGER NOT NULL,--id of the problem this solves
		userId INTEGER NOT NULL,--id of the user who created this solution
		logic TEXT,--Array of logic strings stored as JSON
		rules TEXT,--Array of rules strings stored as JSON
		solutionStatus TEXT,--stores the result of the solution: correct, incorrect, error
		timeSubmitted DATETIME,--Time the solution was submitted to the server
		FOREIGN KEY (problemID) REFERENCES problems(id),
		FOREIGN KEY(userId) REFERENCES users(id)
	);
	`)
	if err != nil {
		return nil, err
	}
	//create users table
	_, err = db.Exec(`CREATE TABLE IF NOT EXISTS users(
		id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,--uniquiqe user id 
		email TEXT,--email of the user
		name TEXT,--name of the user
		permissions TEXT--the permissions this user has. example 'admin'
	);`)
	if err != nil {
		return nil, err
	}
	//create problemSets table
	_, err = db.Exec(`CREATE TABLE IF NOT EXISTS problemSets(
		setId INTEGER NOT NULL,--the set that the problem is IN
		problemId INTEGER NOT NULL,--the problem
		name TEXT,--the name of the problem set
		FOREIGN KEY(problemId) REFERENCES problem(id),
		PRIMARY KEY(setID,problemID)
		);`)
	if err != nil {
		return nil, err
	}
	//create sections table
	_, err = db.Exec(`CREATE TABLE IF NOT EXISTS sections(
		id INTEGER NOT NULL,--the id of the section that the user belongs to
		userId INTEGER NOT NULL,--the id of the user
		name TEXT,-- the name of the section
		role TEXT,--describes the users role in the section, professor, student, ta
		FOREIGN KEY(userId) REFERENCES users(Id),
		PRIMARY KEY(id,userId)
	);`)
	if err != nil {
		return nil, err
	}
	//create assignments table
	_, err = db.Exec(`CREATE TABLE IF NOT EXISTS assignments
		problemSetId INTEGER NOT NULL,--the problem set that can be accessed by the section
		sectionId INTEGER NOT NULL,--the section that can access the problem set
		FOREIGN KEY(problemSetId) REFERENCES problemSets(setId),
		FOREIGN KEY(sectionId) REFERENCES sections(id),
		PRIMARY KEY(problemSetId, sectionId)
	);`)
	if err != nil {
		return nil, err
	}
	return nil, nil
}

func (p *ProofStore) getUsersById(int id) []User, error{
	stmt, err :=p.db.Prepare(`SELECT * FROM users WHERE users.id = ?`);
	if err != nil {
		return err, nil
	}
	defer stmt.Close()

	rows, err := stmt.Query(id)
	if err != nil {
		return err, nil
	}
	defer rows.Close()

	
	return rows;

}

func (p *ProofStore) StoreSolution(solution Solution) error{
	//start a database transaction
	tx, err := p.db.Begin()
	if err != nil {
		return errors.New("Database transaction begin error")
	}

	stmt, err := tx.Prepare(`INSERT INTO solutions (
							ProblemId,
							UserID,
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
	RulesJSON, err := json.Marshal(solutionoof.Rules)
	if err != nil {
		return errors.New("Rules marshal error")
	}
	_, err = stmt.Exec(solution.problemId, solution.UserId, LogicJSON, RulesJSON, solution.solutionStatus)
	if err != nil {
		return errors.New("Statement exec error")
	}
	tx.Commit()

	return nil
}

func (p *ProofStore) GetSolutions(userId int, problemId int) ([]solution, error){
	stmt, err = p.db.prepare(`SELECT * FROM solutions WHERE solutions.userId=? AND solutions.problemId=?`)
	if err != nil{
		return nil, err
	}

	rows, err := stmt.Query(userId,problemId)
	if err != nil{
		return err
	}
	defer rows.close()
	
	solutions []solution
	for rows.Next(){
		s solution
		var LogicJSON
		var RulesJSON

		err := rows.Scan(&s.id, &s.problemId, &s.userId, &logicJSON, &rulesJSON, &s.solutionStatus, &s.timeSubmitted)
		if err != nil{
			return nil, err
		}

		err = json.Unmarshal([]byte(logicJSON), &s.logic)
		if err != nil{
			return nil, err
		}

		err = json.Unmarshal([]byte(rulesJSON), &s.rules)
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

	stmt, err := tx.Prepare(`INSERT INTO problems(ownerId, proofName, proofType, premise, conclusion) VALUES(?,?,?,?,?)`)
	defer stmt.close()
	if err != nil {
		return errors.New("Transaction prepare error")
	}

	premiseJSON, err := json.Marshal(problem.premise)
	if err != nil {
		return errors.New("Premise marshal error")
	}

	_, err = stmt.Exec(p.OwnerId, p.ProofName, p.ProofType, premiseJSON, p.Conclusion)
	if err != nil {
		return errors.New("Statement exec error")
	}
	tx.Commit()

	return nil
}

func (p *ProofStore) DbGetTest() (Problem, error){
	rows, err = db.Exec("SELECT * FROM problems")
	if err != nil{
		return nil, err
	}
	defer rows.close()

	for rows.next(){
		p Problem
		var PremiseJSON

		rows.Scan(&p.Id, &p.OwnerId, &p.ProofName, &p.ProofType, &PremiseJSON, &p.Conclusion)

		err = json.Unmarshal([]byte(PremiseJSON), &PremiseJSON)
		if(err !=nil){
			return nil, err
		}

		return p, nil
	}

	return problem, nil
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