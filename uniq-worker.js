var jackrabbit = require('jackrabbit');
var natural = require('natural');
var stemmer = natural.PorterStemmer;
var Firebase = require('firebase');
var request = require('request');
var Tagger = require("brill-pos-tagger");
var async = require('async');
var readingTime = require('reading-time');
// var app = require('express').express();
var http = require('http');
var base_folder = "./node_modules/brill-pos-tagger/data/English/";
var rules_file = base_folder + "tr_from_posjs.txt";
var lexicon_file = base_folder + "lexicon_from_posjs.json";
var default_category = 'N';

var fs = require('fs')
var output = fs.createWriteStream('./stdout.log');
var errorOutput = fs.createWriteStream('./stderr.log');
var logger = new console.Console(output, errorOutput);
//jsdom dependancy of jQuery
var jsdom = require('jsdom');
var $ = require('jquery');

var ref = new Firebase("https://unique-iq.firebaseio.com");
// ref.child('websites').set({});
var uploadBuffer = {};
var downloadBuffer = [];
var urlCount = 0;

var currentlyProccessing = false;
var processingQue = 0

var downloading = false;

var rabbit = jackrabbit(process.env.RABBIT_UR);
var exchange = rabbit.default();
var sites = exchange.queue({ name: 'task_queue', durable: true });

console.log("starting worker...");
sites.consume(processSite);


function processSite(data, ack) {
  console.log("Processing: " + data.name);
  //Check if we have processed this site already
  console.log("task.site.child('URL').val(): " + data.site.child('URL').val());
  var hostname = getHostName(data.site.child('URL').val());
  console.log("hostname: " + hostname);

  // Sometimes getHostName() cannot
  try {
    var convertedName = hostname.replace(/\./g, " ");
  }
  catch(err) {
    console.log("Error getting hostname: " + err);
  }

  ref.child("websites").orderByKey().equalTo(convertedName).once("value", function(processedHostname) {
    if(processedHostname.val() === null) {
        processor({hostname: hostname, page: data.site}, ack);
    } else {
      ref.child("websites/" + convertedName + "/pages").orderByChild('page').equalTo(data.site.child('URL').val()).once("value", function(processedPage) {

        if(processedPage.val() === null) {
            processor({hostname: hostname, page: data.site}, ack);

        } else {
          // Already done
          ack();
        }
      });
    }
  });

}

function onMessage(data) {
  console.log('received:', data);
}
//
// var q = async.queue(function (task, asyncBack) {
//     //Check if we have processed this site already
//     console.log("task.site.child('URL').val(): " + task.site.child('URL').val());
//     var hostname = getHostName(task.site.child('URL').val());
//     console.log("hostname: " + hostname);
//
//     // Sometimes getHostName() cannot
//     try {
//       var convertedName = hostname.replace(/\./g, " ");
//     }
//     catch(err) {
//       console.log("Error getting hostname: " + err);
//     }
//
//     ref.child(orderByKey().equalTo(convertedName).once("value", function(processedHostname) {
//       if(processedHostname.val() === null) {
//           processor({hostname: hostname, page: task.site}, asyncBack);
//       } else {
//         ref.child("websites/" + convertedName + "/pages").orderByChild('page').equalTo(task.site.child('URL').val()).once("value", function(processedPage) {
//
//           if(processedPage.val() === null) {
//               processor({hostname: hostname, page: task.site}, asyncBack);
//
//           } else {
//             // Already done
//             asyncBack();
//           }
//         });
//       }
//     });
//
// }, 1);

//
// var testVar = 0;
// // An event listener watching for new users added
// ref.child("users").on("child_added", function(user) {
//
//   // Start an envent listener waiting for websites to be added to the new user
//   ref.child("users/" + user.key() + "/URLS").on("child_added", function(site) {
//        // Limit the ammount of websites it tries to load at onw time to same memory usage and try to avoid hangups
//
//     q.push({user: user, site: site}, function() {
//       console.log('Processed: ' + site.key());
//
//     });
//   });
// });


// Takes in URL then downloads and process the website
function processor(site, asyncBack) {
    var url = site.page.child('URL');

    if(site.page.val().Processed === "no" && !site.page.val().URL.endsWith('.pdf') ) {
      console.log('processingQue: ' + processingQue);
      console.log('url: ' + url.val());

      // Downloads the HTML data
      jsdom.env({url: url.val(), scripts: ["http://code.jquery.com/jquery.js"], created: function(err, window) {
        console.log("created: " + err);

      }, done: function (err, window) {
        // free memory associated with the window
        //console.log("window: " + window);

        if (!err && window !== null) {
          var keyWordsArray = getKeyWords(window);
          var parsedWordsArray = parseWords(keyWordsArray);
          var countedWords = countKeyWords(parsedWordsArray);

          var convertedName = site.hostname.replace(/\./g, " ");
          ref.child('websites/' + convertedName + "/pages").push({page: site.page.val().URL, keyWords: countedWords});

          asyncBack();

        } else {
            console.log(err + "- skipping this url.");
            asyncBack();
        }
      }});
    } else {
      // console.log('Already procesed!');
      console.log('Already procesed!' + url.val());
      asyncBack();
    }
}

// Helper method to parse the title tag from the response.
function getTitle(text) {
  return text.match('<title>(.*)?</title>')[1];
}

// Get all of the valuable content from the DOM
function getKeyWords(pageHtml) {
  console.log('processing1!' + site.page.key());
  var searchTags = ['title', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
  var importantText = [];

    for(i in searchTags) {
       var newText = pageHtml.$(searchTags[i]).text();
       if(newText !== "") {
       importantText.push(newText);

     }
    }

    return importantText;
    //parseText(importantText, site, asyncBack);
}

// Takes in array of words
function parseText(input) {
  console.log('processing1!' + site.page.key());
  var ignoreWords = ["i", "use"];
  var TfIdf = natural.TfIdf;
  var tfidf = new TfIdf();
  tokenizer = new natural.WordTokenizer();
  // split the string into an array
  var tokenized = [];
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
              var lowerCase = result[j][0].toLowerCase();

              //If it's a word we should ignore
              var ignore = false;
              for(i in ignoreWords) {
                if(lowerCase === ignoreWords[i]) {
                  ignore = true;
                }
              }

              // If its not one of the words we want to ignore
              if(!ignore) {
                var stemmed = natural.PorterStemmer.stem(lowerCase);
                keyWords.push(stemmed);
              }
            }
          }
        }
      }
      countKeyWords(keyWords);

    }
  });
}

// Takes in an array, sorts them and counts them
function countKeyWords(input) {
  console.log('processing3!' + site.page.key());

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
  console.log('processing4!' + site.page.key());
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

    // Convert the array to an object because Friebase prefers it that way
    for(i in orderedRank) {
      output[i] = orderedRank[i];
    }

  }

  // var convertedName = site.hostname.replace(/\./g, " ");
  // ref.child('websites/' + convertedName + "/pages").push({page: site.page.val().URL, keyWords: output});
  //
  // asyncBack();

}

function updateCallback(error) {

  urlCount--;
}

// Helper method to parse the title tag from the response.
function getTitle(text) {
  return text.match('<title>(.*)?</title>')[1];
}


function getHostName(url) {
  var match = url.match(/:\/\/(www[0-9]?\.)?(.[^/:]+)/i);
  if (match != null && match.length > 2 && typeof match[2] === 'string' && match[2].length > 0) {
  return match[2];
  }
  else {
      return null;
  }
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
