package datastore

import (
	"database/sql"
	"log"
)

func New(db *sql.DB) ProofStore {
	// Initialize database tables
	// proofs : [Premise, Logic, Rules] are JSON fields
	_, err := db.Exec(`CREATE TABLE IF NOT EXISTS proofs (
		id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
		entryType TEXT,
		userSubmitted TEXT,
		proofName TEXT,
		proofType TEXT,
		Premise TEXT,
		Logic TEXT,
		Rules TEXT,
		proofCompleted TEXT,
		timeSubmitted DATETIME,
		Conclusion TEXT,
		repoProblem TEXT
	)`)
	if err != nil {
		log.Fatal(err)
	}

	// proofs : Unique index on (userSubmitted, proofName)
	_, err = db.Exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_user_proof
			ON proofs (userSubmitted, proofName)`)
	if err != nil {
		log.Fatal(err)
	}

	return ProofStore{db: db}
}