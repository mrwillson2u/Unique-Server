var natural = require('natural');
var stemmer = natural.PorterStemmer;
var Firebase = require('firebase');
var request = require('request');
var Tagger = require("brill-pos-tagger");
// var http = require('http');
// var https = require('https');
var async = require('async');
var readingTime = require('reading-time');

var base_folder = "./node_modules/brill-pos-tagger/data/English/";
var rules_file = base_folder + "tr_from_posjs.txt";
var lexicon_file = base_folder + "lexicon_from_posjs.json";
var default_category = 'N';

var $ = require('jquery');

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

var processCounter0 = 0;
var processCounter = 0;
var processCounter1 = 0;
var processCounter2 = 0;
var processCounter3 = 0;

var currentlyProccessing = false;
var processingQue = 0
var ignoreWords = ["i", "use"];


var downloading = false;

console.log('starting..');

var q = async.queue(function (task, asyncBack) {
    console.log('processing' + task.site.key());
    //Check if we have processed this site already
    console.log("checking already processed websites for: " + task.site.child('URL').val());
    ref.child("websites").orderByChild('url').equalTo(task.site.child('URL').val()).once("value", function(processedSite) {
      console.log("processedSite: ");
      console.log(processedSite.val());

      if(processedSite.val() === null) {
        processor(task.user.key(), task.site, asyncBack);

      }
      // else {
      //   console.log("already have site");
      //   console.log(task.user.key());
      //   // ref.child('users/' + task.user.key() + "/URLS/" + task.site.key()).update({
      //   //   Processed: 'yes',
      //   // }, updateCallback);
      // }
    });

}, 1);


var testVar = 0;
// An event listener watching for new users added
ref.child("users").on("child_added", function(user) {

  // Start an envent listener waiting for websites to be added to the new user
  ref.child("users/" + user.key() + "/URLS").on("child_added", function(site) {



       processingQue++;

       // Limit the ammount of websites it tries to load at onw time to same memory usage and try to avoid hangups

    q.push({user: user, site: site}, function() {
      console.log('Processed: ' + site.key());

      // processor(user.key(), site);
      ref.child('users/' + user + "/URLS/" + siteKey).update({
        Processed: 'yes',
      }, updateCallback);

    });
  });
});




function processor(userKey, site, asyncBack) {

  console.log('user');
  console.log(userKey);

    var url = site.child('URL');

    if(site.val().Processed === "no" && !site.val().URL.endsWith('.pdf') ) {
      processingQue++;
      console.log('processingQue: ' + processingQue);
      var userString = ref.child('users/' + userKey);

        console.log('url: ' + url.val());


      jsdom.env(url.val(),["http://code.jquery.com/jquery.js"], function (err, window) {

        // free memory associated with the window

        if (!err) {
          var content = getKeyWords(window, userKey, site.key(), url.val(), asyncBack);

        } else {
            console.log("error: " + err);
        }
      });
    } else {
      // console.log('Already procesed!');
      console.log('Already procesed!' + url.val());

    }
}

// Helper method to parse the title tag from the response.
function getTitle(text) {
  return text.match('<title>(.*)?</title>')[1];
}

// Get all of the valuable content from the page
function getKeyWords(pageHtml, userKey, siteKey, url, asyncBack) {
  console.log('processing1!' + siteKey);
  var searchTags = ['title', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
  // var searchTags = ['title'];
  var importantText = [];
  // importantText = $(pageHtml).find(searchTags[1]).text();


    for(i in searchTags) {
       var newText = pageHtml.$(searchTags[i]).text();
       if(newText !== "") {
       importantText.push(newText);

     }
    }

    var parsed = [];
      var result = [];
      processCounter1++;
      console.log("processCounter1: " + processCounter1);
      parseText(importantText, userKey, siteKey, url, asyncBack);
}


function parseText(input, userKey, siteKey, url, asyncBack) {
  console.log('processing1!' + siteKey);

  var TfIdf = natural.TfIdf;
  var tfidf = new TfIdf();
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

          for(j in result) {
            if(result[j][1] === "NN" || result[j][1] === "NNP" || result[j][1] === "NNPS" || result[j][1] === "NNS" ) {
              //console.log("--->" + result[j][0] + "  |  " + result[j][1]) + "<---";
              var lowerCase = result[j][0].toLowerCase();
              var stemmed = natural.PorterStemmer.stem(lowerCase);
              keyWords.push(stemmed);
            }
          }
        }
      }
      processCounter3++;

      countKeyWords(keyWords, userKey, siteKey, url, asyncBack);
    }
  });


}


function countKeyWords(input, user, siteKey, url, asyncBack) {
  console.log('processing3!' + siteKey);

  // console.log('here');
  var rank = [];
  var wordList = [];

  // For each word in the input array, lets count how many times each word has occured
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

  // Remove all the words what apeae only once
  for(i in rank) {
    if(rank[i].count <= 1) {
      rank.splice(i, 1);
    }
  }
  // Reorder the words (objects) in the array so that they are ordered from highest to lowest count
  console.log('processing4!' + siteKey);
  var output = {};
  if(rank.length > 1) {
    var orderedRank = [rank[0]];

      // console.log('rank: ');
    for(i in rank) {
      // console.log(rank[i]);
    }
    for(var i = 1; i < rank.length; i++) {
      var position = 0;

       for(j in orderedRank) {
         position = j;
         if(rank[i].count > orderedRank[j].count) {
           break;
         }
       }
      orderedRank.splice(position, 0, rank[i]);

    }

    // for(var i = 0; i < 15 && i < orderedRank.length; i++) {
    //   // console.log('rank' + i + ': ' + orderedRank[i].count);
    // }


    // Convert the array to an object because Friebase prefers it that way
    for(i in orderedRank) {
      output[i] = orderedRank[i];
    }

  }
  console.log('Updating to:' + 'users/' + user + "URLS/" + siteKey);

  // Update user with stats about website
  // ref.child('users/' + user + "/URLS/" + siteKey).update({
  //   Processed: 'yes',
  // }, updateCallback);

  // Update website in database
  ref.child('websites').push({url: url, keyWords: output});

  // asyncBack();

  processingQue--;
}

function updateCallback(error) {

  urlCount--;
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
