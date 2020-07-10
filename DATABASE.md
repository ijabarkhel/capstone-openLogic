# Database Schema & Info

The database is SQLite3, there is a single persistent table (proofs), and another non-persistent table (admins) and view (admin_repoproblems) that are recreated by the application during startup.

## `proofs` table

### `proofs` table columns

```
id              INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
entryType       TEXT,
userSubmitted   TEXT,
proofName       TEXT,
proofType       TEXT,
Premise         TEXT,
Logic           TEXT,
Rules           TEXT,
proofCompleted  TEXT,
timeSubmitted   DATETIME,
Conclusion      TEXT,
repoProblem     TEXT
```

| Column      | Description |
| ----------- | ----------- |
| `id`          | A numeric row ID, automatic increment, set by SQLite during row insertion. |
| `entryType`   | 'proof'        |
| `userSubmitted` | The email address of the user who submitted the proof in this row. |
| `proofName` | A user-defined name for the proof. |
| `proofType` | Either 'prop' (propositional/tfl) or 'fol' (first order logic) |
| `Premise` | Array of premise strings, stored as a JSON string. |
| `Logic` | Array of logic strings, stored as a JSON string. |
| `Rules` | Array of rule strings, stored as a JSON string. |
| `proofCompleted` | Either 'true', 'false', or 'error'. |
| `timeSubmitted` | Set to current server time by SQLite during insertion as [datetime('now')](https://sqlite.org/lang_datefunc.html) |
| `Conclusion` | String representing the wanted or proven conclusion. |
| `repoProblem` | Either 'true' or 'false'. When admin users publish a proof, that proof will have `repoProblem` set to `true`. When users start working on a published repo problem, the row storing their work on that problem will also have `repoProblem` set to `true`. 

### `proofs` table indexes

There is a `UNIQUE` index on `(userSubmitted, proofName)` to enable the application to update saved proofs as the user works on them.

## `admins` table

This table is generated during startup by the backend. Just a simple table with one column to store an admin email address, and a row for each admin email defined in `admin_users` in the backend.

```
email       TEXT
```

## `admin_repoproblems` view

This view is used only when an admin user requests a CSV download of student problems. The purpose is to make the query to validate that the problems the students solved match the problems the admin user created. Because it is a view, it is defined by a query.

```
CREATE VIEW admin_repoproblems (userSubmitted, Premise, Conclusion)
AS
    SELECT userSubmitted, Premise, Conclusion
    FROM proofs
    WHERE userSubmitted IN (SELECT email FROM admins)
```