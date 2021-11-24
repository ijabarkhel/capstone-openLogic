'use strict';

function decodeJwtResponse(token) {
    var base64Url = token.split('.')[1];
    var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    var jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    return JSON.parse(jsonPayload);
};

// Verifies signed in and valid token, then calls authenticatedBackendPOST
// Returns a promise which resolves to the response body or undefined
function backendPOST(path_str, data_obj) {
   let user = new User(decodeJwtResponse(localStorage.getItem('userToken')));
   //needs to be changed, cannot use isSignedIn(), it is no longer supported.
   console.log(user);
   if (!user.isSignedIn()) {
      console.warn('Cannot send POST request to backend from unknown user.');
      if (sessionStorage.getItem('loginPromptShown') == null) {
         alert('You are not signed in.\nTo save your work, please sign in and then try again, or refresh the page.');
         sessionStorage.setItem('loginPromptShown', "true");
      }

      return Promise.reject( 'Unauthenticated user' );
   }

   if (user.isTokenExpired()) {
      console.warn('Token expired; attempting to refresh token.');
      return user.refreshToken().then(
         (googleUser) => authenticatedBackendPOST(path_str, data_obj, googleUser.id_token));
   } else {
      return authenticatedBackendPOST(path_str, data_obj, user.getIdToken());
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
    $('#addSection').hide();
    $('#deleteSection').hide();
    $('#addStudent').hide();
    $('#deleteStudent').hide();
    $('#displaySummary').hide();
    $('#deleteAdmin').hide();
    $('#displaySummaryTable').hide();
    $('#addAdmin').show();
}

function showDeleteAdmin() {
    $('#addSection').hide();
    $('#deleteSection').hide();
    $('#addStudent').hide();
    $('#deleteStudent').hide();
    $('#displaySummary').hide();
    $('#displaySummaryTable').hide();
    $('#addAdmin').hide();
    $('#deleteAdmin').show();
}

function showAddStudent() {
    $('#addSection').hide();
    $('#deleteSection').hide();
    $('#addAdmin').hide();
    $('#deleteAdmin').hide();
    $('#displaySummary').hide();
    $('#displaySummaryTable').hide();
    $('#deleteStudent').hide();
    $('#addStudent').show();
}

function showDeleteStudent() {
    $('#addAdmin').hide();
    $('#addSection').hide();
    $('#deleteSection').hide();
    $('#deleteAdmin').hide();
    $('#displaySummary').hide();
    $('#displaySummaryTable').hide();
    $('#addStudent').hide();
    $('#deleteStudent').show();
}

function showAddSection() {
    $('#deleteSection').hide();
    $('#addStudent').hide();
    $('#deleteStudent').hide();
    $('#addAdmin').hide();
    $('#deleteAdmin').hide();
    $('#displaySummaryTable').hide();
    $('#displaySummary').hide();
    $('#addSection').show();
}

function showDeleteSection() {
    $('#addSection').hide();
    $('#addStudent').hide();
    $('#deleteStudent').hide();
    $('#addAdmin').hide();
    $('#deleteAdmin').hide();
    $('#displaySummaryTable').hide();
    $('#displaySummary').hide();
    $('#deleteSection').show();
}

function showSummary() {
    $('#addSection').hide();
    $('#deleteSection').hide();
    $('#addStudent').hide();
    $('#deleteStudent').hide();
    $('#addAdmin').hide();
    $('#deleteAdmin').hide();
    $('#displaySummary').show();
}

function addAdmin() {
    let dataObject;
    let adminEmail = $('#adminEmail').val();
    let adminName = $('#adminName').val();
    let addAsAdmin = $('#checkAdmin').val();
    let addAsInstructor = $('#checkInstructor').val();

    if (adminEmail && adminName) {
      if ($('#checkAdmin').is(":checked")){
	 $('#showError').text('');
         dataObject = {'Email': adminEmail, 'Name': adminName, 'Permissions': addAsAdmin};
      } else if ($('#checkInstructor').is(":checked")) {
	 $('#showError').text('');
         dataObject = {'Email': adminEmail, 'Name': adminName, 'Permissions': addAsInstructor};
      }  else {
	 $('#showError').text('Error: check admin or instructor');
      }
      backendPOST('addAdmin', dataObject).then(
	(data) => {
	  console.log('admin or instructor added', data);
	}, console.log)
    } else {
	 $('#showError').text('Error: enter admin or instructor email and name to add');
    }
}
function deleteAdmin() {
    let adminEmail = $('#adminEmail2').val();
    if (adminEmail) {
      $('#showError2').text('');

       backendPOST('deleteAdmin', adminEmail).then(
	(data) => {
	  console.log('admin or instructor deleted', data);
	}, console.log)
    } else {
	 $('#showError2').text('Error: enter admin or instructor email to delete');
    }
}

function addStudentToSection() {
    let studentEmail = $('#studentEmail').val();
    let sectionName = $('#sectionName').val();
    if (studentEmail && sectionName) {
      $('#showError3').text('');

      let dataObject = { 'UserEmail': studentEmail, 'Name': sectionName, 'Role': "student" };

      backendPOST('addStudentToSection', dataObject).then(
	(data) => {
	  console.log('admin or instructor deleted', data);
	}, console.log)
    } else {
	 $('#showError3').text('Error: enter student email and section name to add');
    }
}

function deleteStudentFromSection() {
    let studentEmail = $('#studentEmail2').val();
    let sectionName = $('#sectionName2').val();
    if (studentEmail && sectionName) {
      $('#showError4').text('');

      let dataObject = { 'UserEmail': studentEmail, 'Name': sectionName, 'Role': "student" };

      backendPOST('deleteStudentFromSection', dataObject).then(
	(data) => {
	  console.log('student deleted from deleted', data);
	}, console.log)
    } else {
	 $('#showError4').text('Error: enter student email and section name to delete');
    }
}

function createSection() {
    let sectionName = $('#sectionName3').val();
    if (sectionName) {
      $('#showError5').text('');
      backendPOST('createSection', sectionName).then(
	(data) => {
	  console.log('section created', data);
	}, console.log)
    } else {
	 $('#showError5').text('Error: enter section name to add');
    }
}

function deleteSection() {
    let sectionName = $('#sectionName4').val();
    if (sectionName) {
      $('#showError6').text('');
      backendPOST('deleteSection', sectionName).then(
	(data) => {
	  console.log('section deleted', data);
	}, console.log)
    } else {
	 $('#showError6').text('Error: enter section name to delete');
    }
}

function displaySummary() {
    let sectionName = $('#sectionName5').val();
    if (sectionName) {
      $('#showError7').text('');
      backendPOST('getSectionData', sectionName).then(
	(data) => {
	  console.log('section data received', data);
	}, console.log)
    } else {
	 $('#showError7').text('Error: enter section name to display summary of the section');
    }
}

$(document).ready(function () {
  console.log(localStorage.getItem('userToken'));
  $('.displaySummaryBtn').click( () =>  {
    console.log("Iam in");
    $('#displaySummaryTable').show();
  });
  $('#adminSignIn').show();
});

