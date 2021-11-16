'use strict';

function showAddAdmin() {
    $('#addOrDeleteSection').hide();
    $('#addOrDeleteStudent').hide();
    $('#displaySummary').hide();
    $('#displaySummaryTable').hide();
    $('#addAdmin').show();
}

function showAddStudent() {
    $('#addOrDeleteSection').hide();
    $('#addAdmin').hide();
    $('#displaySummary').hide();
    $('#displaySummaryTable').hide();
    $('#addOrDeleteStudent').show();
}

function showSection() {
    $('#addOrDeleteStudent').hide();
    $('#addAdmin').hide();
    $('#displaySummaryTable').hide();
    $('#displaySummary').hide();
    $('#addOrDeleteSection').show();
}

function showSummary() {
    $('#addOrDeleteStudent').hide();
    $('#addAdmin').hide();
    $('#addOrDeleteSection').hide();
    $('#displaySummary').show();
}

function addAdmin() {
    let adminEmail = $('#adminEmail').text();
    if (adminEmail) {
       let userData = new User(adminEmail, adminName, "admin");

       backendPost('addAdmin', userData).then(
	(data) => {
	  console.log('admin added', data);
	}, console.log)

    }
}


$(document).ready(function () {

  $('.displaySummaryBtn').click( () =>  {
    console.log("Iam in");
    $('#displaySummaryTable').show();
  });

});

