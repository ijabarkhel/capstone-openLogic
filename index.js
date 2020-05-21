sessionStorage.setItem("repoProblem", "false")

var proofsPulled;
var repoproofsPulled;
var finishedrepoproofsPulled
var user = sessionStorage.getItem("userlogged");

function firstLetterToLower(str) {
  return str.charAt(0).toLowerCase() + str.slice(1);
}

function multipleFirstLetterToLower(objArray) {
  objArray.map( obj => {
    Object.keys(obj).forEach(key => {
        obj[firstLetterToLower(key)] = obj[key];
        //delete obj[key]
    })
  })
  return objArray
}

function hasNumber(myString) {
    return /\d/.test(myString);
}

$("#downloadRepo").click(function(){
    $.ajax({
        type: "GET",
        url: "https://proofsdb.herokuapp.com/repodata",
        success: function(data,status) {
            var csv = 'id,entryType,userSubmitted, proofName, proofType, Premise, Logic, Rules, proofCompleted, timeSubmitted, Conclusion\n';
            data.forEach(element => {
                csv += element.id + ",";
                csv += element.entryType + ",";
                csv += element.userSubmitted + ",";
                csv += element.proofName + ",";
                csv += element.proofType + ",";
                var pr = "["
                for(var i = 0; i < element.premise.length; i++){
                    if(i + 1 === element.premise.length){
                        pr += element.premise[i];
                    }
                    else{
                        pr += element.premise[i] + "|"
                    }
                }
                pr += "]";
                csv += pr  + ",";
                var lo = "["
                for(var i = 0; i < element.logic.length; i++){
                    if(i + 1 === element.logic.length){
                        lo += element.logic[i];
                    }
                    else{
                        lo += element.logic[i] + "|"
                    }
                }
                lo += "]";
                csv += lo  + ",";
                var ru = "["
                for(var i = 0; i < element.rules.length; i++){
                    element.rules[i] = element.rules[i].replace(/,/, ' '); 
                    if(i + 1 === element.rules.length){
                        ru += element.rules[i];
                    }
                    else{
                        ru += element.rules[i] + "|"
                    }
                }
                ru += "]";
                csv += ru  + ",";
                csv += element.proofCompleted  + ",";
                csv += element.timeSubmitted  + ",";
                csv += element.conclusion  + ",\n";
            });
            var hiddenElement = document.createElement('a');
            hiddenElement.href = 'data:text/csv;charset=utf-8,' + encodeURI(csv);
            hiddenElement.target = '_blank';
            hiddenElement.download = 'problem repository data.csv';
            hiddenElement.click();
        },
        error: function(data,status) { //optional, used for debugging purposes
            console.log(data);
        }
    });//ajax
});

//unfinished proofs
function loadSelect(){
    $.ajax({
        type: "GET",
        url: "/backend/proofs?selection=user&token=" + sessionStorage.getItem("id_token"),
        success: function(data,status) {
            proofsPulled = multipleFirstLetterToLower(JSON.parse(data));
            console.log(proofsPulled);
            loadproofInnerHtml = "";
            loadproofInnerHtml += "<option>select one</option>"
            proofsPulled.forEach(element => {
            loadproofInnerHtml += "<option value='" + element.id + "'>" + element.proofName + "</option>"
            });
            $("#loadproof").html(loadproofInnerHtml);
        },
        error: function(data,status) { //optional, used for debugging purposes
            console.log(data);
        }
    });//ajax
}

//repo proofs
function repoloadSelect(){
    $.ajax({
        type: "GET",
        url: "/backend/proofs?selection=repo&token=" + sessionStorage.getItem("id_token"),
        success: function(data,status) {
        repoproofsPulled = multipleFirstLetterToLower(JSON.parse(data));
        console.log(repoproofsPulled);
        loadproofInnerHtml = "";
        loadproofInnerHtml += "<option>select one</option>"
        repoproofsPulled.forEach(element => {
        loadproofInnerHtml += "<option value='" + element.id + "'>" + element.proofName + "</option>"
        });
        $("#loadrepo").html(loadproofInnerHtml);
        },
        error: function(data,status) { //optional, used for debugging purposes
        console.log(data);
        }
    });//ajax
}

//finished repo proofs
function finishedrepoloadSelect(){
    $.ajax({
        type: "GET",
        url: "/backend/proofs?selection=completedrepo&token=" + sessionStorage.getItem("id_token"),
        success: function(data,status) {
        finishedrepoproofsPulled = multipleFirstLetterToLower(JSON.parse(data));
        console.log(finishedrepoproofsPulled);
        loadproofInnerHtml = "";
        loadproofInnerHtml += "<option>select one</option>"
        finishedrepoproofsPulled.forEach(element => {
        loadproofInnerHtml += "<option value='" + element.id + "'>" + element.proofName + "</option>"
        });
        $("#loadfinishedrepo").html(loadproofInnerHtml);
        },
        error: function(data,status) { //optional, used for debugging purposes
        console.log(data);
        }
    });//ajax
}

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

//loading a proof
$("#loadproof").change(function(){
  var proofId = $(this).children("option:selected").val();
  var proofwanted;

  proofsPulled.forEach(element => {
    // compare string to int
    if(element.id == proofId){
      proofwanted = element
    }
  });

  console.log(proofwanted);

  var premString = "";
  for(var i = 0; i < proofwanted.premise.length; i++){
    if(i+1 === proofwanted.premise.length){
      premString += proofwanted.premise[i];
    }
    else{
      premString += proofwanted.premise[i] + ", ";
    }
  }

  var sofar = [];
  for(var i = 0; i < proofwanted.premise.length; i++){
    var w = parseIt(fixWffInputStr(proofwanted.premise[i]));
    sofar.push({
        "wffstr": wffToString(w, false),
        "jstr": "Pr"
      });
  }
  for(var i = 0; i < proofwanted.logic.length; i++){
    var w = parseIt(fixWffInputStr(proofwanted.logic[i]));
    //var r = parseIt(fixWffInputStr(proofwanted.rules[i]));
    sofar.push({
        "wffstr": wffToString(w, false),
        "jstr": proofwanted.rules[i]
      });
  }
  var conc = fixWffInputStr(proofwanted.conclusion)
  var cw = parseIt(conc);
  var probstr = '';
  for (var k=0; k<sofar.length; k++) {
    probstr += prettyStr(sofar[k].wffstr);
      if ((k+1) != sofar.length) {
      probstr += ', ';
    }
  }
  document.getElementById("proofdetails").innerHTML = "Construct a proof for the argument: " + probstr + " ∴ " +  wffToString(cw, true);
  var tp = document.getElementById("theproof");
  $("#probpremises").val(premString);
  $("#probconc").val(proofwanted.conclusion);
  $("#proofName").val(proofwanted.proofName);
  if(proofwanted.proofType === "prop"){
    document.getElementById("tflradio").checked = true;
  }
  else{
    document.getElementById("folradio").checked = true;
  }
  $("#theproof").html("");
  $("#proofdetails").show();
  makeProof(tp, sofar, wffToString(cw, false));
});
/// end loading a proof

//loading a proof from repo
$("#loadrepo").change(function(){
  var proofId = $(this).children("option:selected").val();
  var proofwanted;

  repoproofsPulled.forEach(element => {
    if(element.id == proofId){
      proofwanted = element
    }
  });

  var premString = "";
  for(var i = 0; i < proofwanted.premise.length; i++){
    if(i+1 === proofwanted.premise.length){
      premString += proofwanted.premise[i];
    }
    else{
      premString += proofwanted.premise[i] + ", ";
    }
  }

  var sofar = [];
  for(var i = 0; i < proofwanted.premise.length; i++){
    var w = parseIt(fixWffInputStr(proofwanted.premise[i]));
    sofar.push({
        "wffstr": wffToString(w, false),
        "jstr": "Pr"
      });
  }
  for(var i = 0; i < proofwanted.logic.length; i++){
    var w = parseIt(fixWffInputStr(proofwanted.logic[i]));
    //var r = parseIt(fixWffInputStr(proofwanted.rules[i]));
    sofar.push({
        "wffstr": wffToString(w, false),
        "jstr": proofwanted.rules[i]
      });
  }
  var conc = fixWffInputStr(proofwanted.conclusion)
  var cw = parseIt(conc);
  var probstr = '';
  for (var k=0; k<sofar.length; k++) {
    probstr += prettyStr(sofar[k].wffstr);
      if ((k+1) != sofar.length) {
      probstr += ', ';
    }
  }
  document.getElementById("proofdetails").innerHTML = "Construct a proof for the argument: " + probstr + " ∴ " +  wffToString(cw, true);
  var tp = document.getElementById("theproof");
  $("#probpremises").val(premString);
  $("#probconc").val(proofwanted.conclusion);
  $("#proofName").val(proofwanted.proofName);
  document.getElementById("proofName").disabled = true;
  document.getElementById("probconc").disabled = true;
  document.getElementById("probpremises").disabled = true;
  if(proofwanted.proofType === "prop"){
    document.getElementById("tflradio").checked = true;
  }
  else{
    document.getElementById("folradio").checked = true;
  }
  $("#theproof").html("");
  $("#proofdetails").show();
  sessionStorage.setItem("repoProblem", "true");
  makeProof(tp, sofar, wffToString(cw, false));
});
///end loading a proof from repo

//loading a finished proof from repo
$("#loadfinishedrepo").change(function(){
  var proofId = $(this).children("option:selected").val();
  var proofwanted;

  finishedrepoproofsPulled.forEach(element => {
    if(element.id == proofId){
      proofwanted = element
    }
  });

  var premString = "";
  for(var i = 0; i < proofwanted.premise.length; i++){
    if(i+1 === proofwanted.premise.length){
      premString += proofwanted.premise[i];
    }
    else{
      premString += proofwanted.premise[i] + ", ";
    }
  }

  var sofar = [];
  for(var i = 0; i < proofwanted.premise.length; i++){
    var w = parseIt(fixWffInputStr(proofwanted.premise[i]));
    sofar.push({
        "wffstr": wffToString(w, false),
        "jstr": "Pr"
      });
  }
  for(var i = 0; i < proofwanted.logic.length; i++){
    var w = parseIt(fixWffInputStr(proofwanted.logic[i]));
    //var r = parseIt(fixWffInputStr(proofwanted.rules[i]));
    sofar.push({
        "wffstr": wffToString(w, false),
        "jstr": proofwanted.rules[i]
      });
  }
  var conc = fixWffInputStr(proofwanted.conclusion)
  var cw = parseIt(conc);
  var probstr = '';
  for (var k=0; k<sofar.length; k++) {
    probstr += prettyStr(sofar[k].wffstr);
      if ((k+1) != sofar.length) {
      probstr += ', ';
    }
  }
  document.getElementById("proofdetails").innerHTML = "Construct a proof for the argument: " + probstr + " ∴ " +  wffToString(cw, true);
  var tp = document.getElementById("theproof");
  $("#probpremises").val(premString);
  $("#probconc").val(proofwanted.conclusion);
  $("#proofName").val(proofwanted.proofName);
  document.getElementById("proofName").disabled = true;
  document.getElementById("probconc").disabled = true;
  document.getElementById("probpremises").disabled = true;
  if(proofwanted.proofType === "prop"){
    document.getElementById("tflradio").checked = true;
  }
  else{
    document.getElementById("folradio").checked = true;
  }
  $("#theproof").html("");
  $("#proofdetails").show();
  sessionStorage.setItem("repoProblem", "true");
  makeProof(tp, sofar, wffToString(cw, false));
});
///end loading a finsshed proof from repo

$('#proofName').popup({ 
on: 'hover'
});
$('#loadrepo').popup({ 
on: 'hover'
});
$('#loadfinishedrepo').popup({ 
on: 'hover'
});
