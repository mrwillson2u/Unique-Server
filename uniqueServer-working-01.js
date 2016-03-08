


// Fires as soon as all the content has loaded
// document.addEventListener('DOMContentLoaded', function() {
// var express = require('express')
//   , cors = require('cors')
//   , app = express();
//
// app.use(cors());
//
// app.get('/products/:id', function(req, res, next){
//   res.json({msg: 'This is CORS-enabled for all origins!'});
// });
//
// app.listen(80, function(){
//   console.log('CORS-enabled web server listening on port 80');
// });

var natural = require('natural'), stemmer = natural.PorterStemmer;
var Firebase = require('firebase');
var request = require('request');
var Tagger = require("brill-pos-tagger");

var base_folder = "./data/English/";
var rules_file = base_folder + "tr_from_posjs.txt";
var lexicon_file = base_folder + "lexicon_from_posjs.json";
var default_category = 'N';

var $ = require('jquery')(require("jsdom").jsdom().parentWindow);

var fs = require('fs')
var output = fs.createWriteStream('./stdout.log');
var errorOutput = fs.createWriteStream('./stderr.log');
var logger = new console.Console(output, errorOutput);
//jsdom dependancy of jQuery
var jsdom = require('jsdom').jsdom, document = jsdom('test');
global.window = document.defaultView;
global.XMLHttpRequest = window.XMLHttpRequest;
// var $ = require('jquery');
var ref = new Firebase("https://unique-iq.firebaseio.com");

var uploadBuffer = {};
var downloadBuffer = [];
var urlCount = 0;

var processCounter = 0;
var processCounter1 = 0;
var processCounter2 = 0;
var processCounter3 = 0;

// ref.child('users').on("child_changed", function(snapshot) {
//   snapshot.
// }
//
//
// .orderByChild('Processed').equalTo(false).once

ref.child('users').on("child_changed", function(user) {
 //  console.log("String: ");
 // console.log(user.val());
  // ref.child('users').off("value", processURLS);
  // var temp = snapshot.val();



  // For each user
  // snapshot.forEach(function(user) {
    downloadBuffer = user.val();
console.log('user.key()');
    console.log(user.key());

    console.log('downloadBuffer: ');
    console.log(downloadBuffer);
    urlCount = user.child('URLS').numChildren();
    console.log('urlCount' + urlCount);
    console.log(user.child('URLS').key());
    ref.child("users/" + user.key() + '/URLS').orderByChild('Processed').equalTo(false).once("value", function(site) {
console.log("site: ");
      console.log(site.val());
      site.forEach(function(url) {
        console.log("key: " + url.key());
        // console.log("url: " + url.val().URL);
        // console.log("yep");
        // console.log('processed: ' + url.val().Processed);
        if(url.val().Processed === false) {
          // console.log("Processing url: " + url.val().URL);
          jsdom.env(url.val().URL, ["http://code.jquery.com/jquery.js"], function (err, window) {
            //logger.log('processing!' + url.val().URL);
            // free memory associated with the window

            processCounter++;
            console.log("processCounter: " + processCounter);
            if (!err) {
              //console.log("Title: " + window.$('title').text());
              // console.log('getKeyWords');
              var content = getKeyWords(window, user, 'users/' + user.key() + '/URLS/' + url.key());
              //var result = processResults(content);
              //console.log('users/' + user.key() + '/URLS/' + url.key() + '/keyWords');

              // ref.child('users/' + user.key() + '/URLS/' + url.key()).set({keyWords: content});

            }
          });
        } else {
          // console.log('Already procesed!');
          console.log('Already procesed!' + url.val().URL);
          // urlCount--;
          console.log("count: " + urlCount);
        }
      });
    });
  // });
    // console.log("url: " + url.val().URL);

});

// ref.on("child_added", function(snapshot){
//   console.log(snapshot.val());
// });





// Helper method to parse the title tag from the response.
function getTitle(text) {
  return text.match('<title>(.*)?</title>')[1];
}

// Get all of the valuable content from the page
function getKeyWords(pageHtml, user, setString) {
  var searchTags = ['title', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
  // var searchTags = ['title'];
  var importantText = [];
  // importantText = $(pageHtml).find(searchTags[1]).text();

  // jsdom.env(pageHtml, ["http://code.jquery.com/jquery.js"], function (err, window) {
    // free memory associated with the window
    // console.log("2: " + window.$('title').text());

    for(i in searchTags) {
       var newText = pageHtml.$(searchTags[i]).text();
       if(newText !== "") {
      //console.log('newText: ' + newText);
       importantText.push(newText);

     }
    }

    var parsed = [];
    //for(i in importantText) {
      var result = [];
      // console.log('parseText - length' + importantText.length);
      //console.log('importantText: ' + importantText);
      processCounter1++;
      console.log("processCounter1: " + processCounter1);
      parseText(importantText, user, setString);
      // parsed = parsed.concat(result);


}


function parseText(input, user, setString) {
  var TfIdf = natural.TfIdf;
  var tfidf = new TfIdf();
//console.log("This is the input: " + '"' + input[0] + '"');
  tokenizer = new natural.WordTokenizer();
  // split the string into an array
  var tokenized = [];
  processCounter2++;
  console.log("processCounter2: " + processCounter2);
  for(i in input) {

    var token = tokenizer.tokenize(input[i]);

    if (token !== "") {
      //console.log("This is the token: " + '"' + token + '"');
      tokenized.push(tokenizer.tokenize(input[i]));
    }
  }
//console.log("tokenized[0] " + tokenized[0]);
  //console.log("Tokenized: " + tokenized);
  // Load all the text pieces into the document

  var keyWords = [];

  var tagger = new Tagger(lexicon_file, rules_file, default_category, function(error) {
    if (error) {
      console.log(error);
    }
    else {
      for(i in tokenized) {
        if(tokenized[i]){
          //console.log(tagger.tag(tokenized[i]));
          var result = tagger.tag(tokenized[i]);
          //console.log('result.length: ' + result.length);
          //console.log("Check for both: " + result[i]);

          for(j in result) {
            if(result[j][1] === "NN" || result[j][1] === "NNP" || result[j][1] === "NNPS" || result[j][1] === "NNS" ) {
              //console.log("--->" + result[j][0] + "  |  " + result[j][1]) + "<---";
              keyWords.push(result[j][0]);
              for(k in keyWords) {
                //console.log('setting: ' + keyWords.length);
              }

              //console.log('setString: ' + setString);

              //ref.child(setString).update({keyWords: keyWords});

            }
          }
        }
      }
      processCounter3++;
      console.log("processCounter3: " + processCounter3);
      console.log("count: " + user.val());

      console.log("keywordCount: " + keyWords.length);
      for(var i = 0; i < 3; i++) {
        console.log("keywordCount" + i + ": " + keyWords[i]);
      }
      countKeyWords(keyWords, user, setString);
    }
  });


}


function countKeyWords(input, user, setString) {
  console.log('here');
  var rank = [];
  var wordList = [];

  // Fot each word in the input array, lets count how many times each word has occured
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
// console.log('rank1: '+ rank[0].count + ' length: ' + rank.length);

  // Remove all the words what apeae only once
  for(i in rank) {
    if(rank[i].count <= 1) {
      rank.splice(i, 1);
    }
  }
  // console.log('size: ' + rank.length);

  // Reorder the words (objects) in the array so that they are ordered from highest to lowest count
  if(rank.length > 1) {
    var orderedRank = [rank[0]];

      console.log('rank: ');
    for(i in rank) {
      console.log(rank[i]);
    }
    for(var i = 1; i < rank.length; i++) {
      var position = 0;
      // rankCount[]
      //rank.splice(i, 1);
      //console.log('rank2----: '+ rank[j].count);
      // var rankCount = orderedRank[j].;
       for(j in orderedRank) {
         position = j;
         if(rank[i].count > orderedRank[j].count) {
           break;
         }
       }
      orderedRank.splice(position, 0, rank[i]);

    }



    //uploadData(rank);

    for(var i = 0; i < 15 && i < orderedRank.length; i++) {
      console.log('rank' + i + ': ' + orderedRank[i].count);
    }

    var output = {};
    // Convert the array to an object because Friebase prefers it that way
    for(i in orderedRank) {
      output[i] = orderedRank[i];
    }
// console.log('orderedRank:  ' + orderedRank);

    console.log('updating:  ' + setString + ' size: ' + orderedRank.length);
    ref.child(setString).update({
      keyWords: output,
      Processed: true
    }, updateCallback);
    uploadBuffer[setString] = {keyWords: output, Processed: true};
  } else {
    ref.child(setString).update({
      Processed: true
    }, updateCallback);
    uploadBuffer[setString] = {Processed: true};
  }
  urlCount--;

  // uploadObject[setString] =
  console.log("urlCount: " + urlCount);
  // if(urlCount === 0) {
  //   console.log('uploadBuffer');
  //   console.log(uploadBuffer);
  // // return output;
  // }
}

function updateCallback(error) {

    // ref.child('users').on("value", processURLS);

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



// function requesdUrl(url) {
//   var xhr = corsRequest('GET', url);
//
//   if(!xhr) {
//     throw new Error('CORS not supported!');
//   }
//
//   xhr.onload = function() {
//     var text = xhr.responseText;
//     var title = getTitle(text);
//     console.log('Response from CORS request to ' + url + ': ' + title);
//     //parsePage(text);
//     //uploadData()
//   }
//   xhr.onerror = function() {
//     console.log('Woops, there was an error making the request.');
//   };
//
//   xhr.setRequestHeader('Access-Control-Request_Meathod', 'GET');
//   xhr.send();
//
// }
