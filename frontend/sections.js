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

function DisplaySections(){
    //sectiondata,problemsetdata
    
    //check the role of the user

    //grab email
    // call backendpost
    //add valid token and admin token to backend.go

    $.getJSON('/backend/admins', (admins) => {
      console.log(admins);
      try {
      adminUsers = admins['Admins'];
      } catch(e) {
    console.error('Unable to load admin users', e);
      }
    });

   //Determine if user is an admin/instructor.
   if (adminUsers.indexOf(this.email) > -1) {
      backendPOST('getSectionDataFromUserEmail',  { "email": this.email }).then(
         (data) => {
           console.log('section data received', data);
         }, console.log)
   }else{
      //email will be a student's email address.
      backendPOST('getSectionDataFromUserEmail',  { "email": this.email }).then(
         (data) => {
           console.log('section data received', data);
         }, console.log)
   }


}
