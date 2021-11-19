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
    let userObject;
    let adminEmail = $('#adminEmail').val();
    let adminName = $('#adminName').val();
    let addAsAdmin = $('#checkAdmin').val();
    let addAsInstructor = $('#checkInstructor').val();

    if (adminEmail && adminName) {
      console.log(adminEmail);
      console.log(adminName);
      if ($('#checkAdmin').is(":checked")){
	 $('#showError').text('');
         userData = new User(adminEmail, adminName, addAsAdmin);
         console.log(addAsAdmin);
      } else if ($('#checkInstructor').is(":checked")) {
	 $('#showError').text('');
         userData = new User(adminEmail, adminName, addAsInstructor);
         console.log(addAsInstructor);
      }  else {
	 $('#showError').text('Error: check admin or instructor');
      }
       /*backendPost('addAdmin', userData).then(
	(data) => {
	  console.log('admin or instructor added', data);
	}, console.log)
	*/
    } else {
	 $('#showError').text('Error: enter admin or instructor email and name to add');
    }
}
function deleteAdmin() {
    let adminEmail = $('#adminEmail').val();
    if (adminEmail) {
      $('#showError').text('');
      console.log(adminEmail);

       /*let userData = new User(adminEmail, adminName, "admin");

       backendPost('deleteAdmin', adminEmail).then(
	(data) => {
	  console.log('admin or instructor deleted', data);
	}, console.log)
	*/
    } else {
	 $('#showError').text('Error: enter admin or instructor email to delete');
    }
}

function addStudentToSection() {
    let studentEmail = $('#studentEmail').val();
    let sectionName = $('#sectionName').val();
    if (studentEmail && sectionName) {
      $('#showError2').text('');
      console.log(studentEmail);
      console.log(sectionName);

       /*let sectionObject = new Section(studentEmail, sectionName, "student");

       backendPost('addStudentToSection', sectionObject).then(
	(data) => {
	  console.log('admin or instructor deleted', data);
	}, console.log)
	*/
    } else {
	 $('#showError2').text('Error: enter student email and section name to add');
    }
}

function deleteStudentFromSection() {
    let studentEmail = $('#studentEmail').val();
    let sectionName = $('#sectionName').val();
    if (studentEmail && sectionName) {
      $('#showError2').text('');
      console.log(studentEmail);
      console.log(sectionName);

       /*let sectionObject = new Section(studentEmail, sectionName, "student");

       backendPost('deleteStudentFromSection', sectionObject).then(
	(data) => {
	  console.log('student deleted from deleted', data);
	}, console.log)
	*/
    } else {
	 $('#showError2').text('Error: enter student email and section name to delete');
    }
}

function createSection() {
    let sectionName = $('#sectionName2').val();
    if (sectionName) {
      $('#showError3').text('');
      console.log(sectionName);

       /*let sectionObject = new Section(studentEmail, sectionName, "student");

       backendPost('createSection', sectionName).then(
	(data) => {
	  console.log('section created', data);
	}, console.log)
	*/
    } else {
	 $('#showError3').text('Error: enter section name to add');
    }
}

function deleteSection() {
    let sectionName = $('#sectionName2').val();
    if (sectionName) {
      $('#showError3').text('');
      console.log(sectionName);

       /*backendPost('deleteSection', sectionName).then(
	(data) => {
	  console.log('section deleted', data);
	}, console.log)
	*/
    } else {
	 $('#showError3').text('Error: enter section name to delete');
    }
}

function displaySummary() {
    let sectionName = $('#sectionName3').val();
    if (sectionName) {
      $('#showError4').text('');
      console.log(sectionName);

       /*backendPost('getSectionData', sectionName).then(
	(data) => {
	  console.log('section data received', data);
	}, console.log)
	*/
    } else {
	 $('#showError4').text('Error: enter section name to display summary of the section');
    }
}

$(document).ready(function () {

  $('.displaySummaryBtn').click( () =>  {
    console.log("Iam in");
    $('#displaySummaryTable').show();
  });
  $('#adminSignIn').show();

});

