'use strict';

const repositoryData = {
   'userProofs': [],
   'repoProofs': [],
   'completedUserProofs': []
}

let adminUsers = [];

/**
 * This function is called by the Google Sign-in Button
 * @param {*} googleUser 
 */

 ///
 //An EXAMPLE OF A DECODED JWT RESPONSE
//  header
// {
//   "alg": "RS256",
//   "kid": "f05415b13acb9590f70df862765c655f5a7a019e", // JWT signature
//   "typ": "JWT"
// }
// payload
// {
//   "iss": "https://accounts.google.com", // The JWT's issuer
//   "nbf":  161803398874,
//   "aud": "314159265-pi.apps.googleusercontent.com", // Your server's client ID
//   "sub": "3141592653589793238", // The unique ID of the user's Google Account
//   "hd": "gmail.com", // If present, the host domain of the user's GSuite email address
//   "email": "elisa.g.beckett@gmail.com", // The user's email address
//   "email_verified": true, // true, if Google has verified the email address
//   "azp": "314159265-pi.apps.googleusercontent.com",
//   "name": "Elisa Beckett",
//                             // If present, a URL to user's profile picture
//   "picture": "https://lh3.googleusercontent.com/a-/e2718281828459045235360uler",
//   "given_name": "Elisa",
//   "family_name": "Beckett",
//   "iat": 1596474000, // Unix timestamp of the assertion's creation time
//   "exp": 1596477600, // Unix timestamp of the assertion's expiration time
//   "jti": "abc161803398874def"
// }
 /////////
 function handleCredentialResponse(response) {
   // decodeJwtResponse() is a custom function defined by you
   // to decode the credential response.
   const responsePayload = decodeJwtResponse(response.credential);

   console.log("ID: " + responsePayload.sub);
   console.log("Hosted Domain: " + responsePayload.hd);
   console.log('Full Name: ' + responsePayload.name);
   console.log('Given Name: ' + responsePayload.given_name);
   console.log('Family Name: ' + responsePayload.family_name);
   console.log("Image URL: " + responsePayload.picture);
   console.log("Email: " + responsePayload.email);
   new User(responsePayload)
      .initializeDisplay()
      .loadProofs();
}
///////
////

//******Updated onSignin function*******
function onSignIn(googleUser) {
   console.log("onSignIn", googleUser);

   //*****new addition to function.(for migration process, test later.)
   google.accounts.id.initialize({
      client_id: '266670200080-to3o173goghk64b6a0t0i04o18nt2r3i.apps.googleusercontent.com',
      callback: handleCredentialResponse
   });
   google.accounts.id.prompt();
   //******
   

   // This response will be cached after the first page load
   $.getJSON('/backend/admins', (admins) => {
      try {
	 adminUsers = admins['Admins'];
      } catch(e) {
	 console.error('Unable to load admin users', e);
      }

      new User(googleUser)
	 .initializeDisplay()
	 .loadProofs();
   });
}

//onSignOut function for user.
function onSignOut(googleUser) {

}

/**
 * Class for functionality specific to user sign-in/authentication
 */
class User {
   // Constructor is called from User.onSignIn - not intended for direct use.
   constructor(googleUser) {
      // this.profile = googleUser.getBasicProfile();
      // this.domain = googleUser.getHostedDomain();
      // this.email = this.profile.getEmail();
      // this.name = this.profile.getName();
      this.profile = googleUser.sub //sub contains the unique ID of the google user.
      this.domain = googleUser.hd; //hd is hosted domain.
      this.email = googleUser.email; 
      this.name = googleUser.name;

      if (adminUsers.indexOf(this.email) > -1) {
	 console.log('Logged in as an administrator.');
	 this.showAdminFunctionality();
      }

      this.attachSignInChangeListener();
      return this;
   }

   initializeDisplay() {
      $('#user-email').text(this.email);
      $('#load-container').show();
      $('#nameyourproof').show();

      return this;
   }

   showAdminFunctionality() {
      $('#adminLink').show();

      return this;
   }

   loadProofs() {
      loadUserProofs();
      loadRepoProofs();
      loadUserCompletedProofs();

      return this;
   }

   //These need to be changed.
   //Remove any references to auth2.attachClickHandler() and its registered callback handlers.
   //Remove any references to listen(), auth2.currentUser, and auth2.isSignedIn.
   attachSignInChangeListener() {
      //what is being used to determine a user's signin status?
      //Plausible solution: use JWT's user ID and attach signInListener().
      //gapi.auth2.getAuthInstance() as well as isSignedIn is no longer supported.
      googleUser.sub.isSignedIn.listen(this.signInChangeListener);
      //this.profile.signInChangeListener();
      return this;
   }
   
   signInChangeListener(loggedIn) {
      console.log('Sign in status changed', loggedIn);
      window.location.reload();
   }

   static isSignedIn() {
      //return gapi.auth2.getAuthInstance().isSignedIn.get();
      //return true if signed in, return false if not signed in.
      if(googleUser.email_verified == "true"){
         return true;
      }else{
         return false;
      }
   }

   static isAdministrator() {
      //return adminUsers.indexOf(gapi.auth2.getAuthInstance().currentUser.get().getBasicProfile().getEmail()) > -1;
      return adminUsers.indexOf(googleUser.sub.getEmail()) > -1;
   }

   // Check if the current time (in unix timestamp) is after the token's expiration
   static isTokenExpired() {
      //return + new Date() > gapi.auth2.getAuthInstance().currentUser.get().getAuthResponse().expires_at;
      return  + new Date() > googleUser.exp;
   }

   // Retrieve the last cached token
   static getIdToken() {
      //return gapi.auth2.getAuthInstance().currentUser.get().getAuthResponse().id_token;
      return googleUser.sub;
   }

   // Get a newly issued token (returns a promise)
   //INCOMPLETE
   static refreshToken() {
      //return gapi.auth2.getAuthInstance().currentUser.get().reloadAuthResponse();
      //RESEARCH how to refresh token using JWT.
      googleUser.reloadAuthResponse();
   }
}

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
   )
}

// For administrators only - backend requires valid admin token
function getCSV() {
   backendPOST('proofs', { selection: 'downloadrepo' }).then(
      (data) => {
	 console.log("downloadRepo", data);

	 if (!Array.isArray(data) || data.length < 1) {
            console.error('No proofs received.');
            return;
	 }

	 let csv_header = Object.keys(data[0]).join(',') + '\n';

	 let csv = data.reduce( (rows, proof) => {
            return rows + Object.values(proof).reduce( (accum, elem) => {
               if (Array.isArray(elem)) {
		  return accum + ',"' + elem.join('|') + '"';
               }
               return accum + ',"' + elem + '"';
            }) + '\n';
	 }, csv_header);

	 let downloadLink = document.createElement('a');
	 downloadLink.download = "Student_Problems.csv";
	 downloadLink.href = 'data:text/csv;charset=utf-8,' + encodeURI(csv);
	 downloadLink.target = '_blank';
	 downloadLink.click();
      }, console.log);
}

const prepareSelect = (selector, options) => {
   let elem = document.querySelector(selector);

   // Remove all child nodes from the select element
   $(elem).empty();

   // Create placeholder option
   elem.appendChild(
      new Option('Select...', null, true, true)
   );

   // Set placeholder to disabled so it does not show as selectable
   elem.querySelector('option').setAttribute('disabled', 'disabled');

   // Add option elements for the options
   (options) && options.forEach( proof => {
      let option = new Option(proof.ProofName, proof.Id);
      elem.appendChild(option);
   });
}

// load user's incomplete proofs
function loadUserProofs() {
   backendPOST('proofs', { selection: 'user' }).then(
      (data) => {
	 console.log("loadSelect", data);
	 repositoryData.userProofs = data;
	 prepareSelect('#userProofSelect', data);
	 $('#userProofSelect').data('repositoryDataKey', 'userProofs')
      }, console.log
   );
}

// load repository problems
function loadRepoProofs() {
   backendPOST('proofs', { selection: 'repo' }).then(
      (data) => {
	 console.log("loadRepoProofs", data);
	 repositoryData.repoProofs = data;

	 //prepareSelect('#repoProofSelect', data);
	 let elem = document.querySelector('#repoProofSelect');
	 $(elem).empty();

	 elem.appendChild(
            new Option('Select...', null, true, true)
	 );

	 let currentRepoUser;
	 (data) && data.forEach( proof => {
            if (currentRepoUser !== proof.UserSubmitted) {
               currentRepoUser = proof.UserSubmitted;
               elem.appendChild(
		  new Option(proof.UserSubmitted, null, false, false)
               );
            }
            elem.appendChild(
               new Option(proof.ProofName, proof.Id)
            );
	 });

	 // Make section headers not selectable
	 $('#repoProofSelect option[value=null]').attr('disabled', 'disabled');

	 $('#repoProofSelect').data('repositoryDataKey', 'repoProofs');
      }, console.log
   );
}

// load user's completed proofs
function loadUserCompletedProofs() {
   backendPOST('proofs', { selection: 'completedrepo' }).then(
      (data) => {
	 console.log("loadUserCompletedProofs", data);
	 repositoryData.completedUserProofs = data;
	 prepareSelect('#userCompletedProofSelect', data);
	 $('#userCompletedProofSelect').data('repositoryDataKey', 'completedUserProofs')
      }, console.log
   );
}

$(document).ready(function() {

   // store proof when check button is clicked
   $('.proofContainer').on('checkProofEvent', (event) => {
      console.log(event, event.detail, event.detail.proofdata);

      let proofData = event.detail.proofdata;

      let Premises = [].concat(proofData.filter( elem => elem.jstr == "Pr" ).map( elem => elem.wffstr ));

      // The Logic and Rules arrays used to contain lines of the proof, but
      // this only worked for proofs with no subproofs.
      // Now Logic is always a array containing a single string, and Rules is
      // always an empty array.
      let Logic = [JSON.stringify(proofData)],
          Rules = [];

      let entryType = "proof"; // What is this meant to be used for?

      let proofName = $('.proofNameSpan').text() || "n/a";
      let repoProblem = $('#repoProblem').val() || "false";
      let proofType = predicateSettings ? "fol" : "prop";

      let proofCompleted = event.detail.proofCompleted;
      let conclusion = event.detail.wantedConc;

      let postData = new Proof(entryType, proofName, proofType, Premises, Logic, Rules,
			       proofCompleted, conclusion, repoProblem);

      console.log('saving proof', postData);
      backendPOST('saveproof', postData).then(
	 (data) => {
	    console.log('proof saved', data);
	    
	    if (postData.proofCompleted == "true") {
               loadUserCompletedProofs();
	    } else {
               loadUserProofs();
	    }
		
            loadRepoProofs();
	 }, console.log)
   });

   // admin users - publish problems to public repo
   $('.proofContainer').on('click', '#togglePublicButton', (event) => {
      let proofName = $('.proofNameSpan').text();
      if (!proofName || proofName == "") {
	 proofName = prompt("Please enter a name for your proof:");
      }
      if (!proofName) {
	 console.error('No proof name entered');
	 return;
      }

      if (!proofName.startsWith('Repository - ')) {
	 proofName = 'Repository - ' + proofName;
      }
      $('.proofNameSpan').text(proofName);

      let publicStatus = $('#repoProblem').val() || 'false';
      if (publicStatus === 'false') {
	 $('#repoProblem').val('true');
	 $('#togglePublicButton').fadeOut().text('Make Private').fadeIn();
      } else {
	 $('#repoProblem').val('false');
	 $('#togglePublicButton').fadeOut().text('Make Public').fadeIn();
      }

      $('#checkButton').click();
   });

   // populate form when any repository proof selected
   $('.proofSelect').change( (event) => {
      // get the name of the selected item and the selected repository
      let selectedDataId = event.target.value;
      let selectedDataSetName = $(event.target).data('repositoryDataKey');

      // get the proof from the repository (== means '3' is equal to 3)
      let selectedDataSet = repositoryData[selectedDataSetName];
      let selectedProof = selectedDataSet.filter( proof => proof.Id == selectedDataId );
      if (!selectedProof || selectedProof.length < 1) {
	 console.error("Selected proof ID not found.");
	 return;
      }
      selectedProof = selectedProof[0];
      console.log('selected proof', selectedProof);

      // set repoProblem if proof originally loaded from the repository select
      if (selectedDataSetName == 'repoProofs' || selectedProof.repoProblem == "true") {
	 $('#repoProblem').val('true');
      } else {
	 $('#repoProblem').val('false');
      }

      // attach the proof body to the proofContainer
      if (Array.isArray(selectedProof.Logic) && Array.isArray(selectedProof.Rules)) {
	 $('.proofContainer').data({
            'Logic': selectedProof.Logic,
            'Rules': selectedProof.Rules
	 });
      }

      // set proofName, probpremises, and probconc; then click on #createProb
      // (add a small delay to show the user what's being done)
      let delayTime = 200;
      $.when(
	 $('#folradio').prop('checked', true),
	 // Checking this radio button will uncheck the other radio button
	 $('#tflradio').prop('checked', (selectedProof.ProofType == 'prop')),
	 $('#proofName').delay(delayTime).val(selectedProof.ProofName),
	 $('#probpremises').delay(delayTime).val(selectedProof.Premise.join(',')),
	 $('#probconc').delay(delayTime).val(selectedProof.Conclusion)
      ).then(
	 function () {
            $('#createProb').click();
	 }
      );
   });

   // create a problem based on premise and conclusion
   // get the proof name, premises, and conclusion from the document
   $("#createProb").click( function() {
      // predicateSettings is a global var defined in syntax_upstream.js
      predicateSettings = (document.getElementById("folradio").checked);
      let premisesString = document.getElementById("probpremises").value;
      let conclusionString = document.getElementById("probconc").value;
      let proofName = document.getElementById('proofName').value;
      createProb(proofName, premisesString, conclusionString);
   });

   $('.newProof').click( event => {
      resetProofUI();

      // reset 'repoProblem'
      $('#repoProblem').val('false');

      $('.createProof').slideDown();
      $('.proofContainer').slideUp();
   });

   $('#proofName').popup({ on: 'hover' });
   $('#repoProofSelect').popup({ on: 'hover' });
   $('#userCompletedProofSelect').popup({ on: 'hover' });

   // Admin modal
   $('#adminLink').click( (event) => {
      $('.ui.modal').modal('show');
   });

   $('.downloadCSV').click( () => getCSV() );
   // End admin modal
});

function resetProofUI() {
   $('#proofName').val('');			// clear name
   $('#tflradio').prop('checked', true);	// set to Propositional
   $('#probpremises').val('');			// clear premises
   $('#probconc').val('');			// clear conclusion
   $('.proofNameSpan').text('');		// clear proof name
   $('#theproof').empty();			// remove all HTML from 'theproof' element
   $('.proofContainer').removeData();		// clear proof body

   // reset all select boxes to "Select..." (the first option element)
   $('#load-container select option:nth-child(1)').prop('selected', true);
}

// predicateSettings = (document.getElementById("folradio").checked);
// var pstr = document.getElementById("probpremises").value;
// var conc = fixWffInputStr(document.getElementById("probconc").value);
function createProb(proofName, premisesString, conclusionString) {

   // verify the premises are well-formed
   let pstr = premisesString.replace(/^[,;\s]*/,'');
   pstr = pstr.replace(/[,;\s]*$/,'');
   let prems = pstr.split(/[,;\s]*[,;][,;\s]*/);

   // verify the conclusion is well-formed
   let conc = fixWffInputStr(conclusionString);
   var cw = parseIt(conc);
   if (!(cw.isWellFormed)) {
      alert('The conclusion ' + fixWffInputStr(conc) + ', is not well formed.');
      return false;
   }
   if ((predicateSettings) && (!(cw.allFreeVars.length == 0))) {
      alert('The conclusion is not closed.');
      return false;
   }

   // set the body of the proof
   // If the proof body is attached to the proofContainerData as array Logic[],
   // get the proof body from that.  Otherwise initialize the proof body from
   // the premises.
   // Note: for legacy reasons Logic always contains a single element -- the
   // JSON encoding of the proof data.
   let proofdata = [];
   let proofContainerData = $('.proofContainer').data();
   if (proofContainerData.hasOwnProperty('Logic')) {
      if (Array.isArray(proofContainerData.Logic) && proofContainerData.Logic.length > 0) {
	 proofdata = JSON.parse(proofContainerData.Logic[0])
      } else {
	 console.warn('Error/unexpected: Logic is not a non-empty array', proofContainerData);
      }
   } else {
      for (let a=0; a<prems.length; a++) {
	 if (prems[a] != '') {
	    let w = parseIt(fixWffInputStr(prems[a]));
	    if (!(w.isWellFormed)) {
               alert('Premise ' + (a+1) + ', ' + fixWffInputStr(prems[a]) + ', is not well formed.');
               return false;
            }
	    if ((predicateSettings) && (!(w.allFreeVars.length == 0))) {
               alert('Premise ' + (a+1) + ' is not closed.');
               return false;
	    }
	    proofdata.push({
               "wffstr": wffToString(w, false),
               "jstr": "Pr"
	    });
	 }
      }
   }

   $('.createProof').slideUp();
   resetProofUI();
   $('.proofContainer').show();
   $('.proofNameSpan').text(proofName);

   // set the argument (premises/conclusion)  string
   var probstr = '';
   for (var k=0; k < prems.length; k++) {
      probstr += prettyStr(prems[k]);
      if ((k+1) < prems.length) {
	 probstr += ', ';
      }
   }
   document.getElementById("proofdetails").innerHTML = "Construct a proof for the argument: " + probstr + " ∴ " +  wffToString(cw, true);

   var tp = document.getElementById("theproof");
   makeProof(tp, proofdata, wffToString(cw, false));
   return true;
}
