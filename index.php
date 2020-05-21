<!DOCTYPE html>
<html lang="en">
  <head>
    <!-- standard metadata -->
    <meta charset="utf-8" />
    <meta name="description" content="Fitch-style proof editor and checker" />
    <meta name="author" content="Kevin C. Klement" />
    <meta name="copyright" content="© Kevin C. Klement" />
    <meta name="keywords" content="logic,proof,deduction" />
    
    <!-- facebook opengraph stuff -->
    <meta property="og:title" content="Fitch-style proof editor and checker" />
    <meta property="og:image" content="sample.png" />
    <meta property="og:description" content="Fitch-style proof proof editor and checker" />

    <!-- if mobile ready
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="mobile-web-app-capable" content="yes" /> -->

    <!-- web icon -->
    <link rel="shortcut icon" href="favicon.ico" type="image/x-icon" />

    <title>proof checker</title>

    <!-- page style from https://github.com/dhg/Skeleton -->
    <link rel="stylesheet" href="normalize.css">
    <link rel="stylesheet" href="skeleton.css">
    <link href="https://fonts.googleapis.com/css?family=Noto+Sans" rel="stylesheet" type="text/css">
    <link rel="icon" href="/assets/logicproofchecker.png">
    <link rel="stylesheet" type="text/css" href="semantic/semantic.min.css">
    <link rel="stylesheet" type="text/css" href="index.css">
    <link href="https://fonts.googleapis.com/css?family=Josefin+Sans" rel="stylesheet">    
    <script 
    src="https://code.jquery.com/jquery-3.1.1.min.js" 
    integrity="sha256-hVVnYaiADRTO2PzUGmuLJr8BLUSjGIZsDYGmIJLv2b8=" 
    crossorigin="anonymous">
    </script>
    <script src="semantic/semantic.min.js"></script>
    <script src="https://apis.google.com/js/platform.js" async defer></script>
    <meta name="google-signin-client_id" content="171509471210-8d883n4nfjebkqvkp29p50ijqmt6c5nd.apps.googleusercontent.com">
    <style>
      body {font-family: "Noto Sans";}
      a, a:hover, a:visited, a:focus, a:active {color: #0c1c8c; text-decoration: none; font-weight: bold ;}
      label, legend { display: inline-block; } 
    </style>
    <!-- css file -->
    <link rel="stylesheet" type="text/css" href="proofs.css" />

  </head>
  <body>
  <div id="top-menu" class="ui menu" style = "height : 60px;">
        <div class="header item">
          <h1 id="title"><a href="index.php">Proof Checker</a></h1>
        </div>
        <a href="help.html" class="item">
          Help
        </a>
        <a href="references.html" class="item">
          References
        </a>
        <a href="rules.html" class="item">
          Logic Rules
        </a>
        <a id="adminLink" href="admin.html" class="item" style="display: none;">
          Admin
        </a>
        <div class="right menu">
          <div class="header item"><a id="user-email" class="item"></a></div>
          <div class="g-signin2 item" data-onsuccess="onSignIn"></div>
        </div>
    </div>

  <!-- middle stuff -->
      <div id="load-container" >
        <div style="float: left;"> 
          <label for="loadproof">load unfinished proofs: </label>
          <select id="loadproof">
            <option> waiting for server...</option>
          </select>
        </div>
        <!--  -->
        <div style="float: left; padding-left: .9rem;"> 
          <label for="loadrepo">load repository problems: </label>
          <select id="loadrepo" data-content="Loading repository problems will lock the 'name your proof', 'Premise', and 'Conclusion' inputs. To resart press the 'resart proof checking from scratch' button or refesh the page.">
            <option> waiting for server...</option>
          </select>
        </div>
         <!--  -->
         <div style="float: left; padding-left: .9rem;"> 
          <label for="loadfinshedrepo">finished repository problems: </label>
          <select id="loadfinishedrepo" data-content="Finished repository problems will lock the 'name your proof', 'Premise', and 'Conclusion' inputs. To resart press the 'resart proof checking from scratch' button or refesh the page.">
            <option> waiting for server...</option>
          </select>
        </div>
      </div>
      
      <div class="ui vertically divided grid" style="clear: both;">
          <div class="two column row" style="padding:1.5rem;padding-top:1rem;">
            <div class="column">
              
                    <h3 id="textarea-header" class="ui top attached header">
                      Check Your Proof:
                    </h3>
                    <div id="textarea-container" class="ui attached segment">

                        <div id="nameyourproof" style="padding-bottom: 14px;">
                          <label>name your proof:</label>
                          <div class="ui input" >
                            <input id="proofName" type="text" placeholder="proof name" data-content="Naming your proof will allow you to finish it later if it is incomplete 👍🏽">
                          </div>
                        </div>

                      <input type="radio" name="tflfol" id="tflradio" checked /> <label for="tflradio">Propositional </label>
                      <input type="radio" name="tflfol" id="folradio" /> <label for="folradio">First-Order</label><br /><br />
                      Premises (separate with “,” or “;”):<br />
                      <input id="probpremises" /><br /><br />
                      Conclusion:<br />
                      <input id="probconc" /><br /><br />
                      <button type="button" id="createProb">create problem</button><br /><br />
                        
                      <h3 id="problabel" style="display: none;">Proof:</h3>
                      <p id="proofdetails" style="display: none;"></p>
                      <div id="theproof"></div>
                      <br>
                      <br>
                      
                      
                           
                    </div>

            </div>
            
            <div class="column" style="margin-left: 0;">

                <h3 id="textarea-header" class="ui top attached header">
                  How to Use the Checker:
                </h3>
                <div id="textarea-container" class="ui attached segment">

                  <strong><p style="text-decoration: underline;">Symbols:</p></strong>
                  <table id="symkey">
                      <tr><td>For negation you may use any of the symbols:</td><td> <span class="tt">¬ ~ ∼ - −</span></td></tr>
                      <tr><td>For conjunction you may use any of the symbols:</td><td> <span class="tt">∧ ^ &amp; . · *</span></td></tr>
                      <tr><td>For disjunction you may use any of the symbols:</td><td> <span class="tt">∨ v</span></td></tr>
                      <tr><td>For the biconditional you may use any of the symbols:</td><td> <span class="tt">↔ ≡ &lt;-&gt; &lt;&gt;</span> (or in TFL only: <span class="tt">=</span>)</td></tr>
                      <tr><td>For the conditional you may use any of the symbols:</td><td> <span class="tt">→ ⇒ ⊃ -&gt; &gt;</span></td></tr>
                      <tr><td>For the universal quantifier (FOL only), you may use any of the symbols:</td><td> <span class="tt">∀x (∀x) Ax (Ax) (x) ⋀x</span></tr>
                      <tr><td>For the existential quantifier (FOL only), you may use any of the symbols:</td><td> <span class="tt">∃x (∃x) Ex (Ex) ⋁x</span></tr>
                      <tr><td>For a contradiction you may use any of the symbols:</td><td> <span class="tt"> ⊥ XX #</span></td></tr>
                  </table>

                  <strong><p style="text-decoration: underline;">The following buttons do the following things:</p></strong><br>
                  <table id="key">
                          <tr><td><a>×</a></td><td>= delete this line</td></tr>
                          <tr><td><a><img src="../assets/new.png" alt="|+"/></a></td><td>= add a line below this one</td></tr>
                          <tr><td><a><img src="../assets/newsp.png" alt="||+" /></a></td><td>= add a new subproof below this line</td></tr>
                          <tr><td><a><img src="../assets/newb.png" alt="&lt;+" /></a></td><td>= add a new line below this subproof to the parent subproof</td></tr>
                          <tr><td><a><img src="../assets/newspb.png" alt="&lt;|+" /></a></td><td>= add a new subproof below this subproof to the parent subproof</td></tr>
                  </table>

                </div>

            </div>
          </div>
        </div>

        <hr style="margin-bottom: 15px;">
        <img id="logo" src="/assets/logicproofchecker.png">
        <p id="bottom">Capstone 2019</p>
        <p id="bottom">Logic Proof Checker</p>
        <p id="bottom">Jay Arellano / Mustafa Al Asadi / Gautam Tata / Ben Lenz</p>
        <br>
      </div>
  <script>
    // work with existing code
    const adminUsers = ["gbruns@csumb.edu"];
    const insertMode = (window.location.search.indexOf("mode=insert") > -1);

    function onSignIn(googleUser) {
      var profile = googleUser.getBasicProfile();
      let email = profile.getEmail();
      let name = profile.getName();

      let id_token = googleUser.getAuthResponse().id_token;
      sessionStorage.setItem("id_token", id_token);

      // work with existing code
      sessionStorage.setItem("userlogged", email);

      $('#user-email').text(email);

      // show admin links
      if ( adminUsers.indexOf(email) > -1 ) {
        sessionStorage.setItem("administrator", true);
        console.log("you are an administrator");

        $('#adminLink').show();

        if ( insertMode ) {
          $('#nameyourproof').show();
          $("#textarea-header").html("Add new proof to problem repository");
        } else {
          $('#nameyourproof').hide();
        }
      }

      $("#load-container").show();
      $("#nameyourproof").show();

      loadSelect();
      repoloadSelect();
      finishedrepoloadSelect();
    }
  </script>
  <script type="text/javascript" charset="utf-8" src="ajax.js"></script>
  <script type="text/javascript" charset="utf-8" src="syntax.js"></script>
  <script type="text/javascript" charset="utf-8" src="proofs.js"></script>
  <script type="text/javascript" src="index.js"></script>
  </body>
</html>
