'use strict';

// work with existing code
const adminUsers = ["gbruns@csumb.edu", "cohunter@csumb.edu"];
const insertMode = (window.location.search.indexOf("mode=insert") > -1);

const repositoryData = {
  'userProofs': [],
  'repoProofs': [],
  'completedUserProofs': []
}

// This function is called by the Google Sign-in Button
function onSignIn(googleUser) {
  console.log("onSignIn", googleUser);
  User.onSignIn(googleUser);
}

class User {
  // Constructor is called from User.onSignIn - not intended for direct use.
  constructor(googleUser) {
    this.profile = googleUser.getBasicProfile();
    this.domain = googleUser.getHostedDomain();
    this.email = this.profile.getEmail();
    this.name = this.profile.getName();

    if ( adminUsers.indexOf(this.email) > -1 ) {
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

  attachSignInChangeListener() {
    gapi.auth2.getAuthInstance().isSignedIn.listen(this.signInChangeListener);

    return this;
  }

  signInChangeListener(loggedIn) {
    console.log('Sign in status changed', loggedIn);
    if ( !loggedin ) {
      window.location.reload();
    }
  }

  static onSignIn(googleUser) {
    console.log("STATIC", googleUser, googleUser.getBasicProfile().getEmail());

    new User(googleUser)
    .initializeDisplay()
    .loadProofs();
  }

  static isSignedIn() {
    return gapi.auth2.getAuthInstance().isSignedIn.get();
  }

  static isAdministrator() {
    return adminUsers.indexOf(gapi.auth2.getAuthInstance.currentUser.get().getBasicProfile().getEmail()) > -1;
  }

  // Check if the current time (in unix timestamp) is after the token's expiration
  static isTokenExpired() {
    return + new Date() > gapi.auth2.getAuthInstance().currentUser.get().getAuthResponse().expires_at;
  }

  // Retrieve the last cached token
  static getIdToken() {
    return gapi.auth2.getAuthInstance().currentUser.get().getAuthResponse().id_token;
  }

  // Get a newly issued token (returns a promise)
  static refreshToken() {
    return gapi.auth2.getAuthInstance().currentUser.get().reloadAuthResponse();
  }
}

// Verifies signed in and valid token, then calls authenticatedBackendPOST
// Returns a promise which resolves to the response body or undefined
function backendPOST(path_str, data_obj) {
  if ( !User.isSignedIn() ) {
    console.error('Cannot send POST request to backend from unknown user.');
    alert('You are not signed in. Please sign in and then try again, or refresh the page.');
    return;
  }

  if ( User.isTokenExpired() ) {
    console.warn('Token expired; attempting to refresh token.');
    return User.refreshToken().then( googleUser => authenticatedBackendPOST(path_str, data_obj, googleUser.id_token) );
  } else {
    return authenticatedBackendPOST(path_str, data_obj, User.getIdToken());
  }
}

// Send a POST request to the backend, with auth token included
function authenticatedBackendPOST(path_str, data_obj, id_token) {
  // Send the token as part of the post data rather than a custom header
  // No preflight check is needed for a 'simple request'.
  // https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS#Simple_requests
  let postData = Object.assign({
    id_token: id_token
  }, data_obj);

  return $.ajax({
    url: '/backend/' + path_str,
    method: 'POST',
    data: JSON.stringify(postData),
    dataType: 'json',
    contentType: 'application/json; charset=utf-8'
  }).then(
    (data, textStatus, jqXHR) => {
      return data;
    },
    (jqXHR, textStatus, errorThrown) => {
      console.error(textStatus, errorThrown);
    }
  )
}

//$("#downloadRepo").click(function(){
function getCSV() {
  backendPOST('proofs', { selection: 'downloadrepo' }).then(
    (data) => {
      console.log("downloadRepo", data);

      if ( !Array.isArray(data) || data.length < 1 ) {
        console.error('No proofs received.');
        return;
      }

      let csv_header = Object.keys(data[0]).join(',') + '\n';

      let csv = data.reduce( (rows, proof) => {
        return rows + Object.values(proof).reduce( (accum, elem) => {
          if ( Array.isArray(elem) ) {
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
  });
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
    }
  );
}

// load repository problems
function loadRepoProofs() {
  backendPOST('proofs', { selection: 'repo' }).then(
    (data) => {
      console.log("loadRepoProofs", data);
      repositoryData.repoProofs = data;

      prepareSelect('#repoProofSelect', data);
      $('#repoProofSelect').data('repositoryDataKey', 'repoProofs');
    }
  );
}

// load user's completed proofs
function loadUserCompletedProofs() {
  backendPOST('proofs', { selection: 'completedrepo' }).then(
    (data) => {
      console.log("loadUserCompletedProofs", data);
      repositoryData.completedUserProofs = data;

      prepareSelect('#userCompletedProofSelect', data);
      $('#userCompletedProofSelect').data('repositoryDataKey', 'completedProofs')
    }
  );
}

$(document).ready(function() {
  // Populate form when any of the select elements changes
  $('.proofSelect').change( (event) => {
    let selectedDataId = event.target.value;
    let selectedDataSetName = $(event.target).data('repositoryDataKey');
    let selectedDataSet = repositoryData[selectedDataSetName];

    // == means '3' is equal to 3
    let selectedProof = selectedDataSet.filter( proof => proof.Id == selectedDataId );

    if ( !selectedProof || selectedProof.length < 1 ) {
      console.error("Selected proof ID not found.");
      return;
    }

    selectedProof = selectedProof[0];

    let conclusion = parseIt(fixWffInputStr(selectedProof.Conclusion));
    let proofDisplayData = selectedProof.Premise.map( elem => {
      return {
        "wffstr": wffToString(parseIt(fixWffInputStr(elem)), false),
        "jstr": "Pr"
      }
    });

    proofDisplayData.concat(selectedProof.Logic.map( (elem, idx) => {
      return {
        "wffstr": wffToString(parseIt(fixWffInputStr(elem)), false),
        "jstr": selectedProof.Rules[idx]
      }
    }));

    let probstr = proofDisplayData.map( (elem) => prettyStr(elem.wffstr) ).join(', ');
    $('#proofdetails').html("Construct a proof for the argument: " + probstr + " ∴ " + wffToString(conclusion, true));

    document.getElementById("tflradio").checked = true;
    document.getElementById("folradio").checked = !(selectedProof.ProofType === "prop");

    $('#probpremises').val( selectedProof.Premise.join(', ') );
    $('#probconc').val( selectedProof.Conclusion );
    $('#proofName').val( selectedProof.ProofName );

    if ( selectedDataSetName == "repoProofs" || selectedDataSetName == "completedProofs" ) {
      document.getElementById("proofName").disabled = true;
      document.getElementById("probconc").disabled = true;
      document.getElementById("probpremises").disabled = true;
    }

    $('#theproof').data('repoProblem', false);
    if ( selectedDataSetName == "repoProofs" || selectedProof.RepoProblem == "true" ) {
      $('#theproof').data('repoProblem', true);
    }

    $('#theproof').empty();
    $('#proofdetails').show();
    makeProof( document.getElementById('theproof'), proofDisplayData, wffToString(conclusion, false));
  });

  //creating a problem based on premise and conclusion
  $("#createProb").click( function() {
    predicateSettings = (document.getElementById("folradio").checked);
    var pstr = document.getElementById("probpremises").value;
    pstr = pstr.replace(/^[,;\s]*/,'');
    pstr = pstr.replace(/[,;\s]*$/,'');
    var prems = pstr.split(/[,;\s]*[,;][,;\s]*/);
    var sofar = [];
    for (var a=0; a<prems.length; a++) {
      if (prems[a] != '') {
        var w = parseIt(fixWffInputStr(prems[a]));
        if (!(w.isWellFormed)) {
          alert('Premise ' + (a+1) + ' is not well formed.');
          return;
          }
        if ((predicateSettings) && (!(w.allFreeVars.length == 0))) {
          alert('Premise ' + (a+1) + ' is not closed.');
          return;
        }
        sofar.push({
          "wffstr": wffToString(w, false),
          "jstr": "Pr"
        });
      }
    }
    var conc = fixWffInputStr(document.getElementById("probconc").value);
    var cw = parseIt(conc);
    if (!(cw.isWellFormed)) {
      alert('Conclusion is not well formed.');
      return;
    }
    if ((predicateSettings) && (!(cw.allFreeVars.length == 0))) {
      alert('The conclusion is not closed.');
      return;
    }
    document.getElementById("problabel").style.display = "block";
    document.getElementById("proofdetails").style.display = "block";
    var probstr = '';
    for (var k=0; k<sofar.length; k++) {
      probstr += prettyStr(sofar[k].wffstr);
        if ((k+1) != sofar.length) {
        probstr += ', ';
      }
    }
    document.getElementById("proofdetails").innerHTML = "Construct a proof for the argument: " + probstr + " ∴ " +  wffToString(cw, true);
    var tp = document.getElementById("theproof");
    tp.innerHTML = '';
    makeProof(tp, sofar, wffToString(cw, false));
  });
  //end creating a problem based on premise and conclusion

  $('#proofName').popup({ on: 'hover' });
  $('#repoProofSelect').popup({ on: 'hover' });
  $('#userCompletedProofSelect').popup({ on: 'hover' });

  // Admin modal
  $('#adminLink').click( (event) => {
    $('.ui.modal').modal('show');
  });

  $('.downloadCSV').click( () => getCSV() );

  $('.changeInsertMode').click( () => console.log('TODO: enter insert mode') );
  // End admin modal
});