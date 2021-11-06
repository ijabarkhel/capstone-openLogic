/**
 * The part of the front end dealing with the proof and its controls.
 *
 * The element with id 'theproof' is the proof table plus the buttons just
 * below it.
 * The element with id 'prooftable' is the proof table itself (the Fitch
 * diagram).
 */

// Class to contain proof data for submission to backend 
class Proof {
   constructor(entryType, proofName, proofType, Premise, Logic, Rules, proofCompleted, conclusion, repoProblem){
      this.entryType = entryType;
      this.proofName = proofName;
      this.proofType = proofType;
      this.Premise = Premise;
      this.Logic = Logic;
      this.Rules = Rules;
      this.proofCompleted = proofCompleted;
      this.conclusion = conclusion;
      this.repoProblem = repoProblem;
   }
}

class Problem{
   constructor(id, ownerId, proofName, proofType, premise, conclusion){
      this.id = id
      this.ownerId = ownerId
      this.proofName = proofName
      this.proofType = proofType
      this.premise = premise
      this.conclusion = conclusion
   }
}

// Function from upstream file 'ajax.js'
function AJAXPostRequest(file, fD, callback) {
   var xhttp = new XMLHttpRequest();
   // xhttp.withCredentails = true;
   xhttp.open("POST", file, true);
   xhttp.onreadystatechange = function() {
       if ((xhttp.readyState == 4) && (xhttp.status == "200")) {
           callback(xhttp.responseText);
       }
   }
   xhttp.send(fD);
}

var proofBeingChecked = false;

function processProofCheckResponse(text, context) {
   if (!(proofBeingChecked)) {
      return;
   }

   console.log("XX" + text);
   var res = JSON.parse(text);
   var restext = '';
   
   if (res.issues.length == 0) {
      if (res.concReached == true) {
         context.proofCompleted = "true";
         restext += '<span style="font-size: 150%; color: green;">☺</span> Congratulations! This proof is correct.';
      } else {
         context.proofCompleted = "false";
         restext += '<span style="font-size: 150%; color: blue;">😐</span> No errors yet, but you haven’t reached the conclusion.';
      }
   } else {
      context.proofCompleted = "error";
      restext += '<span style="font-size: 150%; color: red;">☹</span> <strong>Sorry there were errors</strong>.<br />';
      restext += res.issues.join('<br />');
   }
   proofBeingChecked.results.innerHTML = restext;
   proofBeingChecked = false;

   console.log(context.proofdata);

   let proofContainer = document.querySelector('.proofContainer')
   if (proofContainer !== null) {
      proofContainer.dispatchEvent( new CustomEvent('checkProofEvent', { detail: context }));
   }
}

// return the max nesting depth of the proof data
function maxdepth(pd) {
   var rv = 0;
   for (var i=0; i < pd.length; i++) {
      if (Array.isArray(pd[i])) {
         var newd = (maxdepth(pd[i]) + 1);
         rv = Math.max(newd,rv);
      }
   }
   return rv;
}

function countnonspacers(rs) {
   var c = 0;
   for (var i=0; i < rs.length; i++) {
      if (!(rs[i].classList.contains("spacerrow"))) {
         c++;
      }
   }
   return c;
}

//turns the proof into html for display
function dataToRows(prf, prdata, depth, md, ln) {
   var currln = ln;
   //create a new table which other elements will be added to
   var spacerrow = document.createElement("tr");
   //add the html class for formatting
   spacerrow.classList.add("spacerrow");
   //add an initial row element this one will be blank and exists for uniform spacing
   spacerrow.appendChild(document.createElement("td"));
   for (var j=0; j < depth; j++) {
      var c = document.createElement('td');
      spacerrow.appendChild(c);
      c.classList.add('midcell');
   }

   //more table datas for spacing
   spacerrow.appendChild(document.createElement("td"));
   spacerrow.appendChild(document.createElement("td"));

   var spacercell = document.createElement("td");
   spacerrow.appendChild(spacercell);
   spacercell.classList.add("spacercell");
   //the rs array will hold all the rows of the table
   //each row will have will either be a sentence or a subproof on it and the associated tags needed for proper spacing
   var rs=[spacerrow];
   for (var i=0; i < prdata.length; i++) {
      if (Array.isArray(prdata[i])) {//if the row is an array than there is a sub proof 
         nrs = dataToRows(prf, prdata[i], (depth+1), md, currln);//call this function recursivly do create the subproof
         rs = rs.concat(nrs);
         currln += countnonspacers(nrs);
      } else {//the row is a sentence
         //create the row and but in each element in to a cell aka td tag
         var newrow = document.createElement("tr");
         var rowdata = prdata[i];
         //the line num cell displays the line number of this line of the proof
         newrow.lineNumCell = document.createElement("td");
         newrow.appendChild(newrow.lineNumCell);
         currln++;
         newrow.ln = currln;
         newrow.myProof = prf;
         newrow.lineNumCell.innerHTML = currln;
         newrow.lineNumCell.classList.add('linenocell');
         //note the vertical line between the number and the sentence is created by the css class linenocell
         //if the sentence should idented this will create the cells needed for indendation
         for (var j=0; j < depth; j++) {
            var c = document.createElement('td');
            newrow.appendChild(c);
            c.classList.add('midcell');
         }

         //here is where the sentence or Well formed formula is created
         newrow.wffCell = document.createElement("td");
         newrow.wffCell.colSpan = ((md - depth) + 1);
         newrow.appendChild(newrow.wffCell);
         newrow.wffCell.classList.add("wffcell");
         if (
            (
               (rowdata.jstr == "Pr") 
               && 
               (
                  ((i+1) == prdata.length)
                  ||
                  (prdata[i+1].jstr != "Pr")
               )
            )
            ||
            ( rowdata.jstr == "Hyp" 
            )
         ) {//this checks to see if the fitch bar should go below this wff
            newrow.wffCell.classList.add("sepcell");//add the fitch bar | sepcell = seperator cell
         }
         if ((currln != prf.openline) || (prf.jopen) || (rowdata.jstr == "Pr")) {
            newrow.wffDisplay = document.createElement("span");
            newrow.wffCell.appendChild(newrow.wffDisplay);
            newrow.wffDisplay.innerHTML = prettyStr(rowdata.wffstr);
            if (rowdata.jstr != "Pr") {
               newrow.wffCell.myProof = prf;
               newrow.wffCell.myPos = currln;
               newrow.wffCell.title = "click to edit";
               newrow.wffCell.onclick = function() {            
                  this.myProof.registerInput();
                  this.myProof.openline = this.myPos;
                  this.myProof.jopen = false;
                  this.myProof.displayMe();
               } 
            } else {
               newrow.wffCell.classList.add("noclick");
            }
         } else {
            prf.oInput = document.createElement("input");
            newrow.wffCell.appendChild(prf.oInput);
            prf.oInput.title = "Insert formula for this line here.";
            prf.oInput.myPos = (currln - 1);
            prf.oInput.myProof = prf;
            prf.oInput.value = rowdata.wffstr;
            prf.oInput.classList.add("wffinput");
            prf.oInput.onchange = function() {
                  this.value = fixWffInputStr(this.value);
            }
         }
         newrow.jCell = document.createElement("td");
         newrow.appendChild(newrow.jCell);
         newrow.jCell.classList.add("jcell");
         if ((rowdata.jstr != "Hyp") && (rowdata.jstr != "Pr")) {
            if ((currln != prf.openline) || (!(prf.jopen))) {
               newrow.jCell.innerHTML = changeRuleNames(rowdata.jstr);
               if (rowdata.jstr == "") {
                  newrow.jCell.classList.add("showcell");
               }
               newrow.jCell.myPos = currln;
               newrow.jCell.myProof = prf;
               newrow.jCell.title = "click to edit";
               newrow.jCell.onclick = function() {
                  newrow.jCell.innerHTML = changeRuleNames(rowdata.jstr);
                  this.myProof.registerInput();
                  this.myProof.jopen = true;
                  this.myProof.openline = this.myPos;
                  this.myProof.displayMe();
               }
            } else {
               prf.oInput = document.createElement("input");
               newrow.jCell.appendChild(prf.oInput);
               prf.oInput.title = "Insert justification for this line here.";
               prf.oInput.myPos = (currln - 1);
               prf.oInput.myProof = prf;

               prf.oInput.value = changeRuleNames(rowdata.jstr);
               prf.oInput.classList.add("jinput");
               prf.oInput.onchange = function() {
                  this.value = changeRuleNames(fixJInputStr(unChangeRuleNames(this.value)));
               }
            }
         } else {
            newrow.jCell.classList.add("noclick");
         }
         newrow.bCell = document.createElement("td");
         newrow.appendChild(newrow.bCell);
         newrow.bCell.classList.add("buttoncell");
         if ((rowdata.jstr != "Pr") || (newrow.wffCell.classList.contains("sepcell"))) {
            if (rowdata.jstr != "Pr") {
               var dellink = document.createElement("a");
               newrow.bCell.appendChild(dellink);
               dellink.innerHTML = "×";
               dellink.title = "Delete this line.";
               dellink.myPos = (currln - 1);
               dellink.myProof = prf;
               dellink.onclick = function() {
                  this.myProof.registerInput();
                  this.myProof.openline = 0;
                  this.myProof.jopen = false;
                  this.myProof.oInput = {};
                  this.myProof.deleteLine(this.myPos);
                  this.myProof.displayMe();
               }
            }
            var addrowlink = document.createElement("a");
            var addsplink = document.createElement("a");
            newrow.bCell.appendChild(addrowlink);
            newrow.bCell.appendChild(addsplink);
            addrowlink.innerHTML = '<img src="assets/new.png" />';
            addsplink.innerHTML = '<img src="assets/newsp.png" />';
            addrowlink.myPos = (currln - 1);
            addrowlink.myProof = prf;
            addsplink.myPos = (currln - 1);
            addsplink.myProof = prf;
            addrowlink.title = "Add a line below this one.";
            addsplink.title = "Add a new subproof below this line.";
            addrowlink.onclick = function() {
               this.myProof.registerInput();
               this.myProof.addNewLine(this.myPos);
               this.myProof.displayMe();
            }
            addsplink.onclick = function() {
               this.myProof.registerInput();
               this.myProof.addNewSubProof(this.myPos);
               this.myProof.displayMe();
            }
            if (((i+1) == prdata.length) && (depth > 0)) {
               var addurowlink = document.createElement("a");
               var addusplink = document.createElement("a");
               newrow.bCell.appendChild(addurowlink);
               newrow.bCell.appendChild(addusplink);
               addurowlink.innerHTML = '<img src="assets/newb.png" />';
               addusplink.innerHTML = '<img src="assets/newspb.png" />';
               addurowlink.myPos = (currln - 1);
               addurowlink.myProof = prf;
               addusplink.myPos = (currln - 1);
               addusplink.myProof = prf;
               addurowlink.title = "Add a new line to the parent of this subproof below.";
               addusplink.title = "Add a new subproof to the parent of this subproof below.";
               addurowlink.onclick = function() {
                  this.myProof.registerInput();
                  this.myProof.addNewUPLine(this.myPos);
                  this.myProof.displayMe();
               }
               addusplink.onclick = function() {
                  this.myProof.registerInput();
                  this.myProof.addNewUPSubProof(this.myPos);
                  this.myProof.displayMe();
               }
            }
         }
         rs.push(newrow);//add the new row to the array of rows
      }
   }
   return rs;
}

function flattenArray(a, dpar) {
   var b=[];
   for (var i=0; i < a.length; i++) {
      if (Array.isArray(a[i])) {
         b = b.concat(flattenArray(a[i], dpar.concat([i])));
      } else {
         var x = {};
         x.wffstr = a[i].wffstr;            
         x.jstr = a[i].wffstr;            
         x.location = dpar.concat([i]);
         b.push(x);
      }
   }
   return b;
}

function addNLtoPD(pd, n, newsp, uppa) {
   var fa = flattenArray(pd, []);
   if ((fa.length > 0) && (n < fa.length)) {
      loc = fa[n].location;
   } else {
      loc = [n];
   }
   return putNewLineAt(pd, loc, newsp, uppa);
}

function putNewLineAt(pd, loc, newsp, uppa) {
   if ((loc.length == 1) || ( (loc.length == 2) && (uppa)  )) {
      if (newsp) {
         pd.splice(loc[0] + 1, 0, [ { "wffstr" : "", "jstr" : "Hyp" } ]); 
      } else {
         pd.splice(loc[0] + 1, 0, { "wffstr" : "", "jstr" : "" }); 
      }
   } else {
      pd[loc[0]] = putNewLineAt(pd[loc[0]], loc.slice(1), newsp, uppa);
   }
   return pd;
}

function changeWffAt(pd, loc, val) {
   if (loc.length == 1) {
      pd[loc[0]].wffstr = fixWffInputStr(val);
   } else {
      pd[loc[0]] = changeWffAt(pd[loc[0]], loc.slice(1), val);
   }
   return pd;
}

function changeWffValue(pd, pos, val) {
   var fa = flattenArray(pd, []);
   if (fa.length > 0) {
      loc = fa[pos].location;
   } else {
      loc = [0];
   }   
   return changeWffAt(pd, loc, val);
}

function changeJAt(pd, loc, val) {
   if (loc.length == 1) {
      pd[loc[0]].jstr = fixJInputStr(unChangeRuleNames(val));
   } else {
      pd[loc[0]] = changeJAt(pd[loc[0]], loc.slice(1), val);
   }
   return pd;
}

function changeJValue(pd, pos, val) {
   var fa = flattenArray(pd, []);
   if (fa.length > 0) {
      loc = fa[pos].location;
   } else {
      loc = [0];
   }   
   return changeJAt(pd, loc, val);
}

function deletePDLine(pd, pos) {
   var fa = flattenArray(pd, []);
   if ((fa.length > 0) && (pos < fa.length)) {
      loc = fa[pos].location;
   } else {
      return;
   }
   if ((loc.length > 1) && (loc[(loc.length - 1)] == 0)) {
      if (confirm("Warning: this will delete the entire subproof.\nDelete anyway?")) {  
         loc.pop();
      } else {
         return pd;
      }
   }
   return delLineFromLocation(pd, loc);
}

function delLineFromLocation(pd, loc) {
   if (loc.length == 1) {
      pd.splice(loc[0], 1);
   } else {
      pd[loc[0]] = delLineFromLocation(pd[loc[0]], loc.slice(1));
   }
   return pd;
}

/**
 * Add the proof table and buttons just below the table to pardiv ("the proof") and display it
 * @param {element} pardiv the parent div element which will hold the proof table
 * @param {array}   pstart ('proof start') a 'proofdata' array containing the proof body (including premises)
 * @param {string}  conc the conclusion of the proof (a wff string)
 *
 * Note that the proof table element has an attribute 'proofdata', which is
 * a 'proofdata' array (the internal representation of a proof)
 */
function makeProof(pardiv, pstart, conc) {
   //create the html table tag that will hold the proof
   var p = document.createElement("table");
   pardiv.appendChild(p);
   p.classList.add("prooftable");
   p.proofdata = pstart;
   p.numPrems = 0;
   for (var i=0; i < pstart.length; i++) {
      if ((pstart[i].hasOwnProperty("jstr")) && (pstart[i].jstr=="Pr")) {
         p.numPrems++;
      }
   }
   p.wantedConc = conc;
   p.parentDiv = pardiv;
   p.openline = 1;
   p.jopen = false;
   p.oInput = {};

   //
   // associated elements
   //
   
   p.buttonDiv = document.createElement("div");
   pardiv.appendChild(p.buttonDiv);
   p.buttonDiv.classList.add("buttondiv");
   
   p.results = document.createElement("div");
   pardiv.appendChild(p.results);
   p.results.classList.add("resultsdiv");

   // check proof button
   p.checkButton = document.createElement("button");
   p.checkButton.type = "button";
   p.checkButton.id = "checkButton";
   p.checkButton.innerHTML = "check proof";
   p.checkButton.myP = p;		
   pardiv.appendChild(p.checkButton);
   p.checkButton.onclick = function() {
      this.myP.registerInput();
      this.myP.openline = 0;
      this.myP.jopen = false;
      this.myP.oInput = {};
      this.myP.displayMe();
      this.myP.startCheckMe();
   }
   
   // start over button
   p.startOverButton = document.createElement("button");
   p.startOverButton.type = "button";
   p.startOverButton.id = "startOverButton"
   p.startOverButton.innerHTML = "start over";
   p.startOverButton.start = pstart.slice(0);    // a shallow copy of pstart
   p.startOverButton.myPardiv = pardiv;
   p.startOverButton.conc = conc;
   p.startOverButton.myP = p;
   pardiv.appendChild(p.startOverButton);
   p.startOverButton.onclick = function() {
      this.myP.parentNode.removeChild(this.myP.checkButton);
      this.myP.parentNode.removeChild(this.myP.startOverButton);
      this.myP.parentNode.removeChild(this.myP.togglePublicButton);
      this.myP.parentNode.removeChild(this.myP.results);
      this.myP.parentNode.removeChild(this.myP.buttonDiv);
      this.myP.parentNode.removeChild(this.myP);
      makeProof(this.myPardiv, this.pstart, this.conc);
   }
   
   // Admin button -- add to repository
   if (typeof User !== 'undefined' && User.isSignedIn() && User.isAdministrator()) {
      p.togglePublicButton = document.createElement('button');
      p.togglePublicButton.type = "button";
      let publicStatus = $('#repoProblem').val() || 'false';
      if (publicStatus === 'false') {
         p.togglePublicButton.textContent = "make public";
      } else {
         p.togglePublicButton.textContent = "make private";
      }

      p.togglePublicButton.id = "togglePublicButton";
      pardiv.appendChild(p.togglePublicButton);
   }
   
   p.deleteLine = function(n) {
      this.proofdata = deletePDLine(this.proofdata, n);
   }
   p.addNewLine = function(n) {
      this.proofdata = addNLtoPD(this.proofdata, n, false,false);
      this.openline = (n+2);
      this.jopen = false;
   }
   p.addNewSubProof = function(n) {
      this.proofdata = addNLtoPD(this.proofdata, n, true,false);
      this.openline = (n+2);
      this.jopen = false;      
   }
   p.addNewUPLine = function(n) {
      this.proofdata = addNLtoPD(this.proofdata, n, false,true);
      this.openline = (n+2);
      this.jopen = false;
   }
   p.addNewUPSubProof = function(n) {
      this.proofdata = addNLtoPD(this.proofdata, n, true,true);
      this.openline = (n+2);
      this.jopen = false;
   }
   p.registerWff = function(pos, val) {
      this.proofdata = changeWffValue(this.proofdata, pos, val);
   }
   p.registerJ = function(pos, val) {
      this.proofdata = changeJValue(this.proofdata, pos, val);
   }
   p.registerInput = function() {
      if (!(this.oInput.tagName == "INPUT")) {
         return;
      }
      if (this.oInput.classList.contains("wffinput")) {
         this.registerWff(this.oInput.myPos, this.oInput.value);
      }
      if (this.oInput.classList.contains("jinput")) {
         this.registerJ(this.oInput.myPos, this.oInput.value);
      }
   }
   
   //this function sends the proof to the checkproof.php to make sure it is correct
   p.startCheckMe = function() {
      proofBeingChecked = this;
      this.results.innerHTML = '<img src="assets/wait.gif" alt="[wait]" /> Checking …';
      var fD = new FormData();
      fD.append("predicateSettings", predicateSettings.toString());

      //
      const deepUnchange = (proofLine) => Array.isArray(proofLine) ?
         proofLine.map(deepUnchange) :
         Object.assign({}, proofLine, {
            jstr: unChangeRuleNames(proofLine.jstr)
         });

      fD.append("proofData", JSON.stringify(this.proofdata.map(deepUnchange)));
      fD.append("wantedConc", this.wantedConc);
      fD.append("numPrems", this.numPrems);
      AJAXPostRequest('checkproof.php', fD, (text) => {
         processProofCheckResponse(text, this);
      });
   }
   
   p.displayMe = function() {
      this.innerHTML = '';
      var md = maxdepth(this.proofdata);
      var rs = dataToRows(this, this.proofdata, 0, md, 0);
      for (var i=0; i < rs.length; i++) {
         this.appendChild(rs[i]);
      }
      var tds = this.getElementsByTagName("td");
      var lasttd = tds[tds.length -1];
      this.buttonDiv.innerHTML = '';
      var bts=lasttd.getElementsByTagName("a");
      for (var i=0; i < bts.length; i++) {
         var b = bts[i];
         var imgs = b.getElementsByTagName("img");
         if (imgs.length > 0) {
            var a=document.createElement("button");
            a.type = "button";
            var im=document.createElement("img");
            im.src = imgs[0].src;
            var sp=document.createElement("span");
            console.log(im.src);
            if (im.src.match("new.png")) {
               sp.innerHTML = "new line";
               a.title = "Add a new line at end.";
            }
            if (im.src.match("newsp.png")) {
               sp.innerHTML = "new subproof";
               a.title = "Start a new subproof at end.";
            }
            if (im.src.match("newb.png")) {
               sp.innerHTML = "finish subproof; add line";
               a.title = "Finish this subproof, and add a line to parent.";
            }
            if (im.src.match("newspb.png")) {
               sp.innerHTML = "finish subproof; start another";
               a.title = "Finish this subproof, and add start a new one in parent.";
            }

            this.buttonDiv.appendChild(a);
            a.appendChild(im);
            a.appendChild(sp);
            a.myProof = bts[i].myProof;
            a.myPos = bts[i].myPos;
            a.onclick = bts[i].onclick;
         }
      }
      if (this.buttonDiv.getElementsByTagName("button").length == 0) {
         var a=document.createElement("button");
         a.type = "button";
         this.buttonDiv.appendChild(a);
         a.innerHTML = '<img src="assets/new.png" /><span>new line</span>';
         a.title = 'Add a new line.';
         a.myProof = this;
         a.onclick = function() {
            this.myProof.addNewLine(0);
            this.myProof.openline = 1;
            this.myProof.displayMe();
         };
         var b=document.createElement("button");
         b.type = "button";
         this.buttonDiv.appendChild(b);
         b.innerHTML = '<img src="assets/newsp.png" /><span>new subproof</span>';
         b.title = 'Add a new subproof.';
         b.myProof = this;
         b.onclick = function() {
            this.myProof.addNewSubProof(0);
            this.myProof.openline = 1;
            this.myProof.displayMe();
         };
      }
      
      try { this.oInput.focus(); } catch(err) { };
   }
   /*if (pstart.length == 0)  {
      p.proofdata = [ { "wffstr" : "", "jstr" : "" } ];
   }*/
   p.displayMe();
   return p;
}

// Change names during display
const changeRuleNames = (rule) => typeof rule === 'string' && rule
   .replace(/dne/i, "Double Negation")
   .replace("→E",   "Modus Ponens")
   .replace("MT",   "Modus Tollens")
   .replace("DS",   "Modus Tollendo Ponens")
   .replace("RAA",  "Reductio Ad Absurdum")
   .replace("∧E",   "Simplification")
   .replace("∨I",   "Addition")
   .replace("∧I",   "Adjunction")
   .replace("↔E",   "Equivalence")
   .replace("↔I",   "Bicondition")
   .replace("→I",   "Conditional derivation")
   .replace("=E",   "Substitution of identicals")
   .replace("=I",   "Identity introduction")
   .replace("∀E",   "Universal instantiation")
   .replace("∀I",   "Universal derivation")
   .replace("∃I",   "Existential generalization")
   .replace("∃E",   "Existential instantiation")
   .replace("Rep",  "Repeat");

// When submitting to the PHP backend, rule names must be changed back
const unChangeRuleNames = (rule) => typeof rule === 'string' && rule
   .replace(/double negation/i,       "DNE")
   .replace(/modus ponens/i,          "→E")
   .replace(/modus tollens/i,         "MT")
   .replace(/modus tollendo ponens/i, "DS")
   .replace(/reductio ad absurdum/i,  "RAA")
   .replace(/simplification/i,        "∧E")
   .replace(/addition/i,              "∨I")
   .replace(/adjunction/i,            "∧I")
   .replace(/equi[v∨]alence/i,       "↔E")
   .replace(/bicondition/i,           "Bicondition")
   .replace(/conditional deri[v∨]ation/i,  "→I")
   .replace(/identity introduction/i,      "=I")
   .replace(/substitution of identicals/i, "=E")
   .replace(/uni[v∨]ersal instantiation/i, "∀E")
   .replace(/uni[v∨]ersal derivation/i,    "∀I")
   .replace(/existential generalization/i, "∃I")
   .replace(/existential instantiation/i,  "∃E")
   .replace(/repeat/i, "Rep");
