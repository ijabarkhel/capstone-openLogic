package datastore
import (
	"errors"
)
// Implements the IProofStore interface
type MockDataStore struct {
	
}

func (m *MockDataStore) Empty() error {
	return nil
}

func (m *MockDataStore) GetAllAttemptedRepoProofs() (error, []Proof) {
	return errors.New("Not implemented"), nil
}

func (m *MockDataStore) GetRepoProofs() (error, []Proof) {
	return errors.New("Not implemented"), nil
}

func (m *MockDataStore) GetUserProofs(user UserWithEmail) (error, []Proof) {
	return errors.New("Not implemented"), nil
}

func (m *MockDataStore) GetUserCompletedProofs(user UserWithEmail) (error, []Proof) {
	return errors.New("Not implemented"), nil
}

func (m *MockDataStore) Store(Proof) error {
	return nil
}

func (m *MockDataStore) UpdateAdmins(admin_users map[string]bool) {
	return
}