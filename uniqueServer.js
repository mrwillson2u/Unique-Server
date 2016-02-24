// Fires as soon as all the content has loaded
// document.addEventListener('DOMContentLoaded', function() {

  var Firebase = require('firebase');
  var ref = new Firebase("https://unique-iq.firebaseio.com");

  //ref.onAuth(authDataCallback);

  var authData = ref.getAuth();
  if (authData) {
    console.log("User " + authData.uid + " is logged in with " + authData.provider);
  } else {
    console.log("User is logged out. Logging in now!");

    ref.authAnonymously(function(error, authData) {
      if (error) {
        console.log("Login Failed!", error);
      } else {
        console.log("Authenticated successfully with payload:", authData);
      }
    });

  // }

  // ref.once("value", function(snapshot) {
  //   if(!snapshot.child('users').exists()) {
  //      var users = ref.child('users');
  //      var auth = ref.getAuth();
  //      //users.push({user: auth.uid});
  //   }
  // });
  authData = ref.getAuth();

  var user = ref.child('users/' + authData.uid);
  ref.on("child_added", function(snapshot){
    console.log(snapshot.val());

  });

});

// Get all of the valuable content from the page
function parsePage(pageHtml) {
  var searchTags = ['title', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
  var importantText = [];

  for(i in searchTags) {
    var newText = $(pageHtml).find(searchTags[i]).text();
    importantText.push(newText);
  }
  //importantText = $(pageHtml).find(searchTags[1]).text()

  // console.log("here: " + importantText);
  var parsed = [];
  for(i in importantText) {
    var result = parseText(importantText[i]);
    parsed = parsed.concat(result);

  }
}


function processResults(input) {
  var rank = [];
  var wordList = [];

  for(i in input) {
    var word = input[i];
    var duplicate = false;

    // Check for duplicates
    for (j in rank){

      if(rank[j].word === word){
        duplicate = true;
        rank[j].count ++;
      }
    }

    // If no duplicate found
    if(!duplicate){
      // New word
      rank.push({word: word, count: 1});
    }
  }

  for(var i = 0; i < rank.length; i++) {
    var j = 0;
    var temp = rank[i];
    rank.splice(i, 1);

    while(temp.count < rank[j].count && j < rank.length) {
      j++;
    }
    rank.splice(j, 0, temp);
  }

  uploadData(rank);

  var output = "";


  for(i in rank) {
    if(rank[i].count >= 1) {
      output += rank[i].word + ": " + rank[i].count + " ; ";
    }
  }

  return(output);
}

// Helper method to parse the title tag from the response.
function getTitle(text) {
  return text.match('<title>(.*)?</title>')[1];
}


function uploadData(data) {
  var auth = ref.getAuth();

  // Check if the user already is logged on the server, and if not create it, then enter the data
  var userRef = ref.child('users').orderByValue().equalTo(auth.uid);
  userRef.once('value', function(snapshot) {

    if(!snapshot.exists()) {

      ref.child('users').set({[auth.uid]: {data: data}});

    } else {
      snapshot.ref().auth.uid.set({data: data});

   }
  });
}
