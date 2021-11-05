package datastore

import (
	"database/sql"
	_ "github.com/mattn/go-sqlite3"
)

func (p *ProofStore) Close() error {
	return p.db.Close()
}

func New(dsn string) (*ProofStore, error) {
	db, err := sql.Open("sqlite3", dsn)
	if err != nil {
		return nil, err
	}
	/*
	// Initialize database tables
	// proofs : [Premise, Logic, Rules] are JSON fields
	_, err = db.Exec(`CREATE TABLE IF NOT EXISTS proofs (
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
		return nil, err
	}

	// proofs : Unique index on (userSubmitted, proofName)
	_, err = db.Exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_user_proof
			ON proofs (userSubmitted, proofName)`)
	if err != nil {
		return nil, err
	}
	*/
	
	return &ProofStore{db: db}, nil
}