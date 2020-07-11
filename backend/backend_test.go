package main

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	datastore "./datastore"
)

func TestGetAdmins(t *testing.T) {
	req, err := http.NewRequest("GET", "/admins", nil)
	if err != nil {
		t.Fatal(err)
	}

	responseRecorder := httptest.NewRecorder()
	handler := http.HandlerFunc(getAdmins)

	handler.ServeHTTP(responseRecorder, req)

	if status := responseRecorder.Code; status != http.StatusOK {
		t.Errorf("getAdmins received bad status code: got %v want %v", responseRecorder.Code, http.StatusOK)
	}

	expected := `{"Admins":["gbruns@csumb.edu","cohunter@csumb.edu"]}`
	if responseRecorder.Body.String() != expected {
		t.Errorf("getAdmins returned unexpected body: got %v want %v", responseRecorder.Body.String(), expected)
	}
}

type MockUserWithEmail struct {
	Email string
}

func (u MockUserWithEmail) GetEmail() string {
	return u.Email
}

func TestSaveProof(t *testing.T) {
	ctx := context.WithValue(context.Background(), "tok", MockUserWithEmail{ "cohunter@csumb.edu" })
	req, err := http.NewRequestWithContext(ctx, "POST", "/saveproof", strings.NewReader(`{"proofName":"TestSaveProof"}`))
	if err != nil {
		t.Fatal(err)
	}

	responseRecorder := httptest.NewRecorder()

	var mds datastore.MockDataStore

	Env := &Env{&mds}

	handler := http.HandlerFunc(Env.saveProof)

	handler.ServeHTTP(responseRecorder, req)
	if status := responseRecorder.Code; status != http.StatusOK {
		t.Errorf("SaveProof received bad status code: got %v want %v", responseRecorder.Code, http.StatusOK)
	}

	expected := `{"success": "true"}`
	if responseRecorder.Body.String() != expected {
		t.Errorf("SaveProof returned unexpected body: got %v want %v", responseRecorder.Body.String(), expected)
	}
}