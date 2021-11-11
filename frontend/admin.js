'use strict';

function showAddAdmin() {
    $('#addOrDeleteSection').hide();
    $('#addOrDeleteStudent').hide();
    $('#displaySummaryTable').hide();
    $('#displayTable').show();
    $('#addAdmin').show();
}

function showAddStudent() {
    $('#addOrDeleteSection').hide();
    $('#addAdmin').hide();
    $('#displaySummaryTable').hide();
    $('#displayTable').show();
    $('#addOrDeleteStudent').show();
}

function showSection() {
    $('#addOrDeleteStudent').hide();
    $('#addAdmin').hide();
    $('#displaySummaryTable').hide();
    $('#displayTable').show();
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

