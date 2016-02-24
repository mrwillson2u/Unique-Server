// Fires as soon as all the content has loaded
// document.addEventListener('DOMContentLoaded', function() {

// var Firebase = require('firebase');

var ref = new Firebase("https://unique-iq.firebaseio.com");

var auth = ref.getAuth();
console.log(auth);
ref = ref.child('users/' + auth.uid + '/data');
console.log(ref.toString());
ref.on("child_added", function(snapshot) {
  var changedPost = snapshot.val();
  console.log("The updated post title is " + snapshot);
});

// });


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
