// Fires as soon as all the content has loaded

var natural = require('natural');
var stemmer = natural.PorterStemmer;
var Firebase = require('firebase');
var request = require('request');
var Tagger = require("brill-pos-tagger");
var http = require('http');
var https = require('https');
var async = require('async');

var base_folder = "./data/English/";
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
var ignoreWords = [i, use];


var downloading = false;

console.log('starting..');

var q = async.queue(function (task, asyncBack) {
    console.log('processing' + task.site.key());
    processor(task.user.key(), task.site, asyncBack);
}, 1);


var testVar = 0;
// An event listener watching for new users added
ref.child("users").on("child_added", function(user) {

  // Start an envent listener waiting for wensires to be added to the new user
  ref.child("users/" + user.key() + "/URLS").on("child_added", function(site) {
// console.log('test2');
    // Limit the ammount of websites it tries to load at onw time to same memory usage and try to avoid hangups

      // Wait for others to finish processing before proceding
       processingQue++;
      q.push({user: user, site: site}, function() {
        console.log('Processed: ' + site.key());

     processor(user.key(), site);
  });

});



//
// ref.once("child_changed", function(user) {
//   console.log(user.val());
//   user.forEach(processor);
// })




// download("http://www.npmjs.com/package/node-jsdom", function(data) {
//   console.log(data);
// });


// Utility function that downloads a URL and invokes
// callback with the data.
// function download(url, callback) {
//   var header;
//
//   if(url.startsWith("https")) {
//     header = https;
//   } else if (url.startsWith("http:")){
//     header = http;
//   } else {
//     return;
//   }
//
//   header.get(url, function(res) {
//     var data = "";
//     res.on('data', function (chunk) {
//       data += chunk;
//     });
//     res.on("end", function() {
//       callback(data);
//     });
//   }).on("error", function(e) {
//     console.log("http.get error: " + e);
//     callback(null);
//   });
//
// }



function processor(userKey, site, asyncBack) {

  console.log('user');
  console.log(userKey);

    var url = site.child('URL');

    if(site.val().Processed === "no" && !site.val().URL.endsWith('.pdf') ) {
      processingQue++;
      console.log('processingQue: ' + processingQue);
      var userString = ref.child('users/' + userKey);
      // request('https://www.google.com', function(err, resp, window) {
        // if (err) throw err;
        // $ = cheerio.load(body);

        //Scraping function here

        console.log('url: ' + url.val());


      jsdom.env(url.val(),["http://code.jquery.com/jquery.js"], function (err, window) {

        // free memory associated with the window

        if (!err) {
          var content = getKeyWords(window, userKey, userString.child("URLS/" + site.key()), asyncBack);

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
function getKeyWords(pageHtml, user, setString) {
  console.log('processing1!' + setString);
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
  console.log('processing1!' + setString);

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
              var lowerCase = result[j][0].toLowerCase();
              var stemmed = natural.PorterStemmer.stem(lowerCase);
              keyWords.push(lowerCase);
              // for(k in keyWords) {
              //   //console.log('setting: ' + keyWords.length);
              // }

              //console.log('setString: ' + setString);

              //ref.child(setString).update({keyWords: keyWords});

            }
          }
        }
      }
      processCounter3++;
      // console.log("processCounter3: " + processCounter3);
      // console.log("count: " + user);

      // console.log("keywordCount: " + keyWords.length);
      for(var i = 0; i < 3; i++) {
        // console.log("keywordCount" + i + ": " + keyWords[i]);
      }
      countKeyWords(keyWords, user, setString);
    }
  });


}


function countKeyWords(input, user, setString) {
  console.log('processing3!' + setString);

  // console.log('here');
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
  console.log('processing4!' + setString);

  if(rank.length > 1) {
    var orderedRank = [rank[0]];

      // console.log('rank: ');
    for(i in rank) {
      // console.log(rank[i]);
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
      // console.log('rank' + i + ': ' + orderedRank[i].count);
    }

    var output = {};
    // Convert the array to an object because Friebase prefers it that way
    for(i in orderedRank) {
      output[i] = orderedRank[i];
    }
// console.log('orderedRank:  ' + orderedRank);
    // var refString = new Firebase(setString);

    console.log('updating:  ' + setString + ' size: ' + orderedRank.length);
    console.log('processing5a!' + setString);


    setString.update({
      keyWords: output,
      Processed: 'yes'
    }, updateCallback);
    // uploadBuffer[setString] = {keyWords: output, Processed: 'true'};
  } else {
    console.log('processing5b!' + setString);

    setString.update({
      Processed: 'yes'
    }, updateCallback);
    // uploadBuffer[setString] = {Processed: 'true'};
  }


  // uploadObject[setString] =
  // console.log("urlCount: " + urlCount);
  // if(urlCount === 0) {
  //   console.log('uploadBuffer');
  //   console.log(uploadBuffer);
  // // return output;
  // }
  processingQue--;
}

function updateCallback(error) {

    // ref.child('users').on("value", processURLS);
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
