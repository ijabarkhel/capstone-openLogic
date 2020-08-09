package datastore

import (
	"database/sql"
	"encoding/json"
	"errors"
	"log"
)

type Proof struct {
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

//type ProofStore interface {
//	GetByUser(string) Proof
//}

type UserWithEmail interface {
	GetEmail() string
}

type IProofStore interface {
	Close() error
	Empty() error
	GetAllAttemptedRepoProofs() (error, []Proof)
	GetRepoProofs() (error, []Proof)
	GetUserProofs(user UserWithEmail) (error, []Proof)
	GetUserCompletedProofs(user UserWithEmail) (error, []Proof)
	Store(Proof) error
	UpdateAdmins(admin_users map[string]bool)
}

type ProofStore struct {
	db *sql.DB
}

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
}