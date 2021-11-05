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


$(document).ready(function () {

  $('.displaySummaryBtn').click( () =>  {
    console.log("Iam in");
    $('#displaySummaryTable').show();
  });

});

