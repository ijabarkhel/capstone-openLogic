'use strict';

// Verifies signed in and valid token, then calls authenticatedBackendPOST
// Returns a promise which resolves to the response body or undefined
function backendPOST(path_str, data_obj) {
   //needs to be changed, cannot use isSignedIn(), it is no longer supported.
   if (!User.isSignedIn()) {
      console.warn('Cannot send POST request to backend from unknown user.');
      if (sessionStorage.getItem('loginPromptShown') == null) {
         alert('You are not signed in.\nTo save your work, please sign in and then try again, or refresh the page.');
         sessionStorage.setItem('loginPromptShown', "true");
      }

      return Promise.reject( 'Unauthenticated user' );
   }

   if (User.isTokenExpired()) {
      console.warn('Token expired; attempting to refresh token.');
      return User.refreshToken().then(
         (googleUser) => authenticatedBackendPOST(path_str, data_obj, googleUser.id_token));
   } else {
      return authenticatedBackendPOST(path_str, data_obj, User.getIdToken());
   }
}

// Send a POST request to the backend, with auth token included
function authenticatedBackendPOST(path_str, data_obj, id_token) {
   return $.ajax({
      url: '/backend/' + path_str,
      method: 'POST',
      data: JSON.stringify(data_obj),
      dataType: 'json',
      contentType: 'application/json; charset=utf-8',
      headers: {
         'X-Auth-Token': id_token
      }
   }).then(
      (data, textStatus, jqXHR) => {
         return data;
      },
      (jqXHR, textStatus, errorThrown) => {
         console.error(textStatus, errorThrown);
      }
   );
}

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
    let userData;
    let adminEmail = $('#adminEmail').val();
    let adminName = $('#adminName').val();
    let addAsAdmin = $('#checkAdmin').val();
    let addAsInstructor = $('#checkInstructor').val();

    if (adminEmail && adminName) {
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
      backendPOST('addAdmin', userData).then(
	(data) => {
	  console.log('admin or instructor added', data);
	}, console.log)
    } else {
	 $('#showError').text('Error: enter admin or instructor email and name to add');
    }
}
function deleteAdmin() {
    let adminEmail = $('#adminEmail').val();
    if (adminEmail) {
      $('#showError').text('');

      //let userData = new User(adminEmail, adminName, "admin");

       backendPost('deleteAdmin', adminEmail).then(
	(data) => {
	  console.log('admin or instructor deleted', data);
	}, console.log)
    } else {
	 $('#showError').text('Error: enter admin or instructor email to delete');
    }
}

function addStudentToSection() {
    let studentEmail = $('#studentEmail').val();
    let sectionName = $('#sectionName').val();
    if (studentEmail && sectionName) {
      $('#showError2').text('');

      let sectionObject = new Section(studentEmail, sectionName, "student");

      backendPOST('addStudentToSection', sectionObject).then(
	(data) => {
	  console.log('admin or instructor deleted', data);
	}, console.log)
    } else {
	 $('#showError2').text('Error: enter student email and section name to add');
    }
}

function deleteStudentFromSection() {
    let studentEmail = $('#studentEmail').val();
    let sectionName = $('#sectionName').val();
    if (studentEmail && sectionName) {
      $('#showError2').text('');

       let sectionObject = new Section(studentEmail, sectionName, "student");

       backendPOST('deleteStudentFromSection', sectionObject).then(
	(data) => {
	  console.log('student deleted from deleted', data);
	}, console.log)
    } else {
	 $('#showError2').text('Error: enter student email and section name to delete');
    }
}

function createSection() {
    let sectionName = $('#sectionName2').val();
    if (sectionName) {
      $('#showError3').text('');

      let sectionObject = new Section(studentEmail, sectionName, "student");

      backendPOST('createSection', sectionName).then(
	(data) => {
	  console.log('section created', data);
	}, console.log)
    } else {
	 $('#showError3').text('Error: enter section name to add');
    }
}

function deleteSection() {
    let sectionName = $('#sectionName2').val();
    if (sectionName) {
      $('#showError3').text('');

      backendPOST('deleteSection', sectionName).then(
	(data) => {
	  console.log('section deleted', data);
	}, console.log)
    } else {
	 $('#showError3').text('Error: enter section name to delete');
    }
}

function displaySummary() {
    let sectionName = $('#sectionName3').val();
    if (sectionName) {
      $('#showError4').text('');

      backendPOST('getSectionData', sectionName).then(
	(data) => {
	  console.log('section data received', data);
	}, console.log)
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

