'use strict';
//class to hold the proof information
class Proof{
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

function makeProof(proofContainer, proofStartData, conclusion) {
   return new UIProof(proofContainer, proofStartData, conclusion)
   .createDivs()
   .createButtons()
   .displayMe();
}

class UIProof {
   constructor(proofContainer, proofStartData, conclusion) {
      this.proofContainer = proofContainer;
      
      this.proofTable = $('<table>', {
         class: 'prooftable'
      }).appendTo(this.proofContainer)[0];

      this.proofData = proofStartData;

      this.premiseCount = proofStartData.reduce(
         (count, elem) => count + (elem.hasOwnProperty("jstr") && elem.jstr == "Pr"), 0
      );

      this.wantedConclusion = conclusion;

      this.openline = 1; // ???
      this.jopen = false;
      this.oInput = {};

      return this;
   }

   createDivs() {
      this.buttonDiv = document.createElement('div');
      this.proofContainer.appendChild(this.buttonDiv);
      
      this.resultsDiv = document.createElement('div');
      this.proofContainer.appendChild(this.resultsDiv);

      return this;
   }

   createButtons() {
      $('<button>', {
         type: 'button',
         text: 'Check Proof',
         class: 'checkbutton'
      })
      .appendTo(this.proofContainer)
      .click( event => {
         console.log(event);
   
         this.registerInput();
         this.openline = 0;
         this.jopen = false;
         this.oInput = {};
         this.displayMe();
         this.startCheckMe();
      });
   
      $('<button>', {
         type: "button",
         text: "Start Over"
      })
      .appendTo(this.proofContainer)
      .data({
         'start': this.proofStartData,
   
      })
      .click( event => {
         console.log(event);
         this.proofContainer.empty();
         $('#proofdetails').hide();
         $('#theproof').empty();
   
         makeProof(this.proofContainer, this.proofStartData, conclusion);
       });
   
      $('<p>').appendTo(this.proofContainer);
   
      $('<button>', {
         type: "button",
         text: "Restart Proof Checking from Scratch"
      })
      .appendTo(this.proofContainer)
      .click( () => location.reload() );
   
      if ( insertMode && User.isAdministrator() ) {
         $('<button>', {
            type: "button",
            text: "PUSH PROOF TO DB"
         })
         .appendTo(this.proofContainer)
         .click( (event) => {
            console.log(event);
            this.repoProblem = "true";
            this.proofCompleted = "false";
            this.storeProofToBackend();
         });
      }

      return this;
   }

   storeProofToBackend() {
      this.Premise = [].concat(this.proofData.filter( elem => elem.jstr == "Pr" ).map( elem => elem.wffstr ));

      this.Logic = [];
      this.Rules = [];
      this.proofData.filter( elem => elem.jstr != "Pr" ).forEach(
         elem => {
            this.Logic.push(elem.wffstr);
            this.Rules.push(elem.jstr);
         }
      );

      this.entryType = "proof";
      this.proofName = "n/a";
      if ( $('#proofName').val() ) {
         this.proofName = $('#proofName').val();
      }
      if ( this.repoProblem && !this.proofName.startsWith('Repository') ) {
         this.proofName = 'Repository - ' + this.proofName;
      }

      this.proofType = "prop";
      if ( document.getElementById('folradio').checked ) {
         this.proofType = "fol";
      }

      let postData = this.getProof();
      console.log(postData);

      backendPOST('saveproof', postData).then( data => {
         console.log("proof saved", data);
         loadUserProofs();
         loadRepoProofs();
      });
   }

   // Previously Defined Functions
   deleteLine(n) {
      this.proofData = deletePDLine(this.proofData, n)
   }

   addNewLine(n) {
      this.proofData = addNLtoPD(this.proofData, n, false, false);
      this.openline = (n+2);
      this.jopen = false;
   }

   addNewSubProof(n) {
      this.proofData = addNLtoPD(this.proofData, n, true, false);
      this.openline = (n+2);
      this.jopen = false;      
   }
   addNewUPLine(n) {
      this.proofData = addNLtoPD(this.proofData, n, false, true);
      this.openline = (n+2);
      this.jopen = false;
   }
   addNewUPSubProof(n) {
      this.proofData = addNLtoPD(this.proofData, n, true, true);
      this.openline = (n+2);
      this.jopen = false;      
   }
   registerWff(pos, val) {
      this.proofData = changeWffValue(this.proofData, pos, val);
   }
   registerJ(pos, val) {
      this.proofData = changeJValue(this.proofData, pos, val);
   }
   registerInput() {
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
   startCheckMe() {
      $(this.resultsDiv).html('<img src="../assets/wait.gif" alt="[wait]" /> Checking …');
      
      //changing names of rules to match the book
      this.proofData.forEach(message => {
         if(message.jstr.toLowerCase().includes("modus ponens")){
            message.jstr = message.jstr.toLowerCase().replace("modus ponens", "→E");
            message.jstr=message.jstr.toUpperCase();
            console.log(message.jstr);
         }
         if(message.jstr.toLowerCase().includes("modus tollens")){
            message.jstr = message.jstr.toLowerCase().replace("modus tollens", "MT");
            message.jstr=message.jstr.toUpperCase();
            console.log(message.jstr);
         }  
         if(message.jstr.toLowerCase().includes("double negation")){
            message.jstr = message.jstr.toLowerCase().replace("double negation", "DNE");
            message.jstr=message.jstr.toUpperCase();
            console.log(message.jstr);
         }
         if(message.jstr.toLowerCase().includes("modus tollendo ponens")){
            message.jstr = message.jstr.toLowerCase().replace("modus tollendo ponens", "DS");
            message.jstr=message.jstr.toUpperCase();
            console.log(message.jstr);
         }
         if(message.jstr.toLowerCase().includes("simplification")){
            message.jstr = message.jstr.toLowerCase().replace("simplification", "∧E");
            message.jstr=message.jstr.toUpperCase();
            console.log(message.jstr);
         }
         if(message.jstr.toLowerCase().includes("addition")){
            message.jstr = message.jstr.toLowerCase().replace("addition", "∨I");
            message.jstr=message.jstr.toUpperCase();
            console.log(message.jstr);
         }
         if(message.jstr.toLowerCase().includes("adjunction")){
            message.jstr = message.jstr.toLowerCase().replace("adjunction", "∧I");
            message.jstr=message.jstr.toUpperCase();
            console.log(message.jstr);
         }
         if(message.jstr.toLowerCase().includes("equivalence")){
            message.jstr = message.jstr.toLowerCase().replace("equivalence", "↔E");
            message.jstr=message.jstr.toUpperCase();
            console.log(message.jstr);
         }
         if(message.jstr.toLowerCase().includes("bicondition")){
            message.jstr = message.jstr.toLowerCase().replace("bicondition", "Bicondition");
            console.log(message.jstr);
         }
         if(message.jstr.toLowerCase().includes("universal instantiation")){
            message.jstr = message.jstr.toLowerCase().replace("universal instantiation", "∀E");
            message.jstr=message.jstr.toUpperCase();
            console.log(message.jstr);
         }
         
         if(message.jstr.toLowerCase().includes("existential generalization")){
            message.jstr = message.jstr.toLowerCase().replace("existential generalization", "∃I");
            console.log(message.jstr);
         }
         
         if(message.jstr.toLowerCase().includes("existential instantiation")){
            message.jstr = message.jstr.toLowerCase().replace("existential instantiation", "∃E");
            console.log(message.jstr);
         }
         
         if(message.jstr.toLowerCase().includes("repeat")){
            message.jstr = message.jstr.toLowerCase().replace("repeat", "=I");
            console.log(message.jstr);
         }
      });

      //sending proof to be checked
      $.ajax({
         type: "POST",
         url: "checkproof.php",
         dataType: "json",
         data: {
            "predicateSettings": predicateSettings.toString(),
            "proofData" : JSON.stringify(this.proofData),
            "wantedConc" : this.wantedConclusion,
            "numPrems" : this.premiseCount
         },
         success: (data, status) => {
            console.log(data);
            
            this.proofCompleted = data.concReached.toString();

            if (data.issues.length == 0) {
               if (data.concReached == true) {
                  $(this.resultsDiv).html('<span style="font-size: 150%; color: green;">☺</span> Congratulations! This proof is correct.');
               } else {
                  $(this.resultsDiv).html('<span style="font-size: 150%; color: blue;">😐</span> No errors yet, but you haven’t reached the conclusion.');
               }
            } else {
               $(this.resultsDiv).html(
                  '<span style="font-size: 150%; color: red;">☹</span> <strong>Sorry there were errors</strong>.<br />' +
                  data.issues.join('<br />')
               );
            }

            if(User.isSignedIn() && insertMode) {
               this.repoProblem = this.repoProblem ? "true" : "false";
               this.storeProofToBackend();
            }else{
               console.log("proof not saved");
            }
         }
      });
   }
   getProof() {
      return new Proof(this.entryType, this.proofName, this.proofType, this.Premise, this.Logic, this.Rules, this.proofCompleted, this.conclusion, this.repoProblem);
   }
   displayMe() {
      $(this.proofTable).empty();
      
      dataToRows(this, this.proofData, 0, maxDepth(this.proofData), 0)
      .map( row => this.proofTable.appendChild(row) );

      let buttonLinks = $('td:last-child a:has(img[src])', this.proofTable);
      $(this.buttonDiv).empty()
      buttonLinks.map( (idx, buttonLink) => {
         console.log("buttonLink", buttonLink);
         let button = document.createElement('button');
         let span = document.createElement('span');
         let image = $('<img>', {
            src: $('img[src]', buttonLink)[0].src
         })[0];

         button.type = "button";

         if ( image.src.match("new.png") ) {
            span.textContent = "New Line";
            button.title = "Add a new line at end.";
         }
         if ( image.src.match("newsp.png") ) {
            span.textContent = "New Subproof";
            button.title = "Start a new subproof at end";
         }
         if ( image.src.match("newb.png") ) {
            span.textContent = "Finish Subproof; Add Line";
            button.title = "Finish this subproof, and add a line to parent.";
         }
         if ( image.src.match("newspb.png") ) {
            span.textContent =  "Finish Subproof; Start Another";
            button.title = "Finish this subproof, and start a new one in parent.";
         }

         this.buttonDiv.appendChild(button);
         button.appendChild(image);
         button.appendChild(span);

         // todo
         button.myProof = buttonLink.myProof;
         button.myPos = buttonLink.myPos;
         button.onclick = buttonLink.onclick;
      });

      if (this.buttonDiv.getElementsByTagName("button").length == 0) {
         $('<button>', {
            type: "button",
            html: '<img src="../assets/new.png" /><span>new line</span>',
            title: 'Add a new line.'
         }).click( () => {
            this.addNewLine(0);
            this.openline = -1;
            this.displayMe();
         }).appendTo(this.buttonDiv);

         $('<button>', {
            type: "button",
            html: '<img src="../assets/newsp.png" /><span>new subproof</span>',
            title: 'Add a new subproof.'
         }).click( () => {
            this.addNewSubProof(0);
            this.openline = -1;
            this.displayMe();
         }).appendTo(this.buttonDiv);
      }
      
      try { this.oInput.focus(); } catch(err) { };

      return this;
   }
}

function maxDepth(prdata) {
   var rv = 0;
   for (var i=0; i<prdata.length; i++) {
      if (Array.isArray(prdata[i])) {
         var newd = (maxDepth(prdata[i]) + 1);
         rv = Math.max(newd,rv);
      }
   }
   return rv;
}

function countnonspacers(rs) {
   var c = 0;
   for (var i=0; i<rs.length; i++) {
      if (!(rs[i].classList.contains("spacerrow"))) {
         c++;
      }
   }
   return c;
}

function dataToRows(prf, prdata, depth, md, ln) {
   var currln = ln;
   var spacerrow = document.createElement("tr");
   spacerrow.classList.add("spacerrow");
   spacerrow.appendChild(document.createElement("td"));
   for (var j=0; j<depth; j++) {
      var c = document.createElement('td');
      spacerrow.appendChild(c);
      c.classList.add('midcell');
   }
   spacerrow.appendChild(document.createElement("td"));
   spacerrow.appendChild(document.createElement("td"));
   var spacercell = document.createElement("td");
   spacerrow.appendChild(spacercell);
   spacercell.classList.add("spacercell");
   var rs=[spacerrow];
   for (var i=0; i<prdata.length; i++) {
      if (Array.isArray(prdata[i])) {
         nrs = dataToRows(prf, prdata[i], (depth+1), md, currln);
         rs = rs.concat(nrs);
         currln += countnonspacers(nrs);
      } else {
         var newrow = document.createElement("tr");
         var rowdata = prdata[i];
         newrow.lineNumCell = document.createElement("td");
         newrow.appendChild(newrow.lineNumCell);
         currln++;
         newrow.ln = currln;
         newrow.myProof = prf;
         newrow.lineNumCell.innerHTML = currln;
         newrow.lineNumCell.classList.add('linenocell');
         for (var j=0; j<depth; j++) {
            var c = document.createElement('td');
            newrow.appendChild(c);
            c.classList.add('midcell');
         }
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
         ) {
            newrow.wffCell.classList.add("sepcell");
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
               newrow.jCell.innerHTML = rowdata.jstr;
               
                 //Start replacing rule names here
                  
               rowdata.jstr=changeRuleNames(rowdata.jstr);
               
               newrow.jCell.innerHTML= rowdata.jstr;
            
               
               if (rowdata.jstr == "") {
                  newrow.jCell.classList.add("showcell");
               }
               newrow.jCell.myPos = currln;
               newrow.jCell.myProof = prf;
               newrow.jCell.title = "click to edit";
               newrow.jCell.onclick = function() {
                  
                  //replace rule names here after box is clicked
                  rowdata.jstr=changeRuleNames(rowdata.jstr);
                  newrow.jCell.innerHTML=rowdata.jstr;
                  
                  
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
               
               //change rule names here as well
               rowdata.jstr=changeRuleNames(rowdata.jstr);
               
               prf.oInput.value = rowdata.jstr;
               prf.oInput.classList.add("jinput");
               prf.oInput.onchange = function() {
                  this.value = fixJInputStr(this.value);
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
            addrowlink.innerHTML = '<img src="../assets/new.png" />';
            addsplink.innerHTML = '<img src="../assets/newsp.png" />';
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
               addurowlink.innerHTML = '<img src="../assets/newb.png" />';
               addusplink.innerHTML = '<img src="../assets/newspb.png" />';
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
         rs.push(newrow);
      }
   }
   console.log("rs", rs);
   return rs;
}

function flat_array(a, dpar) {
   var b=[];
   for (var i=0; i<a.length; i++) {
         if (Array.isArray(a[i])) {
            
            b = b.concat(flat_array(a[i], dpar.concat([i])));
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
   var fa = flat_array(pd, []);
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
   var fa = flat_array(pd, []);
   if (fa.length > 0) {
      loc = fa[pos].location;
   } else {
      loc = [0];
   }   
   return changeWffAt(pd, loc, val);
}

function changeJAt(pd, loc, val) {
   if (loc.length == 1) {
      pd[loc[0]].jstr = fixJInputStr(val);
   } else {
      pd[loc[0]] = changeJAt(pd[loc[0]], loc.slice(1), val);
   }
   return pd;
}

function changeJValue(pd, pos, val) {
   var fa = flat_array(pd, []);
   if (fa.length > 0) {
      loc = fa[pos].location;
   } else {
      loc = [0];
   }   
   return changeJAt(pd, loc, val);
}

function deletePDLine(pd, pos) {
   var fa = flat_array(pd, []);
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

function changeRuleNames( rule){
   
   if(rule.toLowerCase().includes("dne")    ){
      rule= rule.toLowerCase().replace("dne", "Double Negation");
   }
   if(rule.includes("→E")    ){
         rule = rule.replace("→E", "Modus Ponens");
   }
   if(rule.includes("MT")    ){
          rule = rule.replace("MT", "Modus Tollens");
   }   
   if(rule.includes("DS")    ){
       rule = rule.replace("DS", "Modus Tollendo Ponens");
   }
   if(rule.includes("∧E")    ){
      rule = rule.replace("∧E", "Simplification");
   }
   if(rule.includes("∨I")    ){
      rule = rule.replace("∨I", "Addition");
   }
   if(rule.includes("∧I")    ){
      rule = rule.replace("∧I", "Adjunction");
   }
   if(rule.includes("↔E")    ){ 
      rule = rule.replace("↔E", "equivalence");
   }
   if(rule.includes("∀E")    ){
      rule = rule.replace("∀E", "universal instantiation");
   }
   if(rule.includes("∃I")     ){
      rule = rule.replace("∃I", "existential generalization");
   }
   if(rule.includes("∃E")     ){
      rule = rule.replace("∃E", "existential instantiation");
   }
   if(rule.includes("=I")     ){
      rule = rule.replace("=I", "repeat");
   }
   
   return rule;
}