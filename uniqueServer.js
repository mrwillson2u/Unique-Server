// Fires as soon as all the content has loaded

var natural = require('natural'), stemmer = natural.PorterStemmer;
var Firebase = require('firebase');
var request = require('request');
var cheerio = require('cheerio');
var url = require('url');
var Tagger = require("brill-pos-tagger");
var http = require('http');
var https = require('https');
var async = require('async');

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

require('ssl-root-cas/latest').inject();

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



var downloading = false;

console.log('starting..');

var q = async.queue(function (task, asyncBack) {
    console.log('processing' + task.site.key());
    processor(task.user.key(), task.site, asyncBack);
}, 1);


var testVar = 0;
// An event listener watching for new users added
ref.child("users").on("child_added", function(user) {
console.log('test1');
  // Start an envent listener waiting for wensires to be added to the new user
  ref.child("users/" + user.key() + "/URLS").on("child_added", function(site) {
// console.log('test2');
    // Limit the ammount of websites it tries to load at onw time to same memory usage and try to avoid hangups

      // Wait for others to finish processing before proceding
       processingQue++;
      q.push({user: user, site: site}, function() {
        console.log('Processed: ' + site.val());

        ref.child("users/" + user.key() + "/URLS").orderByChild('Processed').equalTo('yes').once("value", function(otherSites) {
          // var otherSites = snap.val();

          console.log("comparing!!");
          otherSites.forEach(function(otherSnap) {
            var site1 = site.val();
            var site2 = otherSnap.val();
            var alreadyCompared = false;

            var machedWords = [];

            // console.log('site1.Comparisons');
            // console.log(site1);

            if(site1.keyWords !== undefined && site.key() !== otherSnap.key()) {
              // Chech if either sites have been compared to anything yet
              if(site1.Comparisons !== undefined && site2.Comparisons !== undefined) {

                for(i in site1.Comparisons) {
                  if(site1.Comparisons[i].URL === site2.URL) {
                    // console.log("already compared!");
                    alreadyCompared = true;
                  }
                }
              }

              if(!alreadyCompared) {
                var likeness = compareSites(site1, site2);
                if(likeness.likeness > 0) {
                  ref.child("users/" + user.key() + "/Trends").push({URLS: {0: site1.URL, 1: site2.URL}, likeness: likeness.likeness, words: likeness.words})
                }
                // Update comparisons on both sites
                // ref.child("users/" + user.key() + "/URLS/" + site.key() + "/Comparisons").push({key: otherSnap.key(), URL: otherSnap.val().URL, Likeness: likeness});
                //
                // ref.child("users/" + user.key() + "/URLS/" + otherSnap.key() + "/Comparisons").push({key:site.key(), URL: site.val().URL, Likeness: likeness});

              }
            }
            // var likeness = compareSites(site, otherSite);
            // pdate comparisons on both sites
            // ref.child("users/" + user.key() + "/URLS/" + site.key() + "/Comparisons").set((otherSite.key(): otherSite.val().URL, Likeness: likeness});
            //
            // ref.child("users/" + user.key() + "/URLS/" + otherSite.key() + "/Comparisons").set(site.key(): otherSite.val().URL, Likeness: likeness});

          });
        });
      });

  });

});







// download("http://www.npmjs.com/package/node-jsdom", function(data) {
//   console.log(data);
// });


// Utility function that downloads a URL and invokes
// callback with the data.
function download(url, callback) {
  var header;

  if(url.startsWith("https")) {
    header = https;
  } else if (url.startsWith("http:")){
    header = http;
  } else {
    return;
  }

  header.get(url, function(res) {
    var data = "";
    res.on('data', function (chunk) {
      data += chunk;
    });
    res.on("end", function() {
      callback(data);
    });
  }).on("error", function(e) {
    console.log("http.get error: " + e);
    callback(null);
  });

}



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
            console.log("error: ");
            console.log(err);
            asyncBack();

        }
      });

    } else {
      console.log('Already procesed!' + url.val());
      asyncBack();
    }


}


// Get all of the valuable content from the page
function getKeyWords(pageHtml, user, setString, asyncBack) {
  console.log('processing1!' + setString);
  console.log('dom!' + pageHtml);
  var searchTags = ['title', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
  var importantText = [];

    for(i in searchTags) {
       var newText = pageHtml.$(searchTags[i]).text();
       if(newText !== "") {
       importantText.push(newText);

     }
    }

    parseText(importantText, user, setString, asyncBack);

}


function parseText(input, user, setString, asyncBack) {
  console.log('processing1!' + setString);

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
      tokenized.push(tokenizer.tokenize(input[i]));
    }
  }

  // Load all the text pieces into the document
  var keyWords = [];

  var tagger = new Tagger(lexicon_file, rules_file, default_category, function(error) {
    if (error) {
      console.log(error);
    }
    else {
      for(i in tokenized) {
        if(tokenized[i]){
          var result = tagger.tag(tokenized[i]);

          for(j in result) {
            if(result[j][1] === "NN" || result[j][1] === "NNP" || result[j][1] === "NNPS" || result[j][1] === "NNS" ) {
              var lowerCase = result[j][0].toLowerCase();
              var stemmed = natural.PorterStemmer.stem(lowerCase);
              keyWords.push(lowerCase);

            }
          }
        }
      }

      countKeyWords(keyWords, user, setString, asyncBack);
    }
  });


}


function countKeyWords(input, user, setString, asyncBack) {
  console.log('processing3!' + setString);

  var rank = [];
  var wordList = [];

  // For each word in the input array, lets count how many times each word has occured
  for(i in input) {

    var word = input[i];
    var duplicate = false;

    // Check for duplicate words
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
  console.log('processing4!' + setString);

  var outputObject = {};

  if(rank.length > 1) {
    var orderedRank = [rank[0]];

      // console.log('rank: ');
    for(i in rank) {
      // console.log(rank[i]);
    }
    for(var i = 1; i < rank.length; i++) {
      var position = 0;

       for(var j = 0; j < orderedRank.length; j++) {
         position = j+1;
         if(rank[i].count > orderedRank[j].count) {
           position--;
           break;
         }
       }

      orderedRank.splice(position, 0, rank[i]);

    }

    var totalCount = 0;
    for(i in orderedRank) {
      totalCount += orderedRank[i].count;
    }
    for(i in orderedRank) {
      orderedRank[i].importance = orderedRank[i].count/totalCount*100;;
    }


    var output = {};
    // Convert the array to an object because Friebase prefers it that way
    for(i in orderedRank) {
      output[i] = orderedRank[i];
    }

    console.log('updating:  ' + setString + ' size: ' + orderedRank.length);
    console.log('processing5a!' + setString);

    outputObject = {
      keyWords: output,
      Processed: 'yes'
    }
  } else {
    console.log('processing5b!' + setString);
    outputObject = {Processed: 'yes'};

  }
  // Upload to Firebase
  setString.update(outputObject, function(error) {
    console.log("Updating: " + setString);
    if(error) {
    console.log('update error: ');
    console.log(error);
  }
    urlCount--;
  });

  // Site is done processing so we can remove it from the count
  processingQue--;
  asyncBack();
}


function compareSites(site1, site2) {
  var matchedWords = {likeness: 0, words: []};

  console.log("site1");
  console.log(site1.keyWords);
  console.log("site2");
  console.log(site2.keyWords);
  for(i in site1.keyWords) {
    for(j in site2.keyWords) {
      if(site1.keyWords[i].word === site2.keyWords[j].word) {
        console.log('word match!!');

        var val = (site1.keyWords[i].importance/2) +(site2.keyWords[j].importance/2);
        matchedWords.likeness += val;
        matchedWords.words.push({word: site1.keyWords[i].word, importance:  val})
      }
    }
  }

  console.log("likeness: " + matchedWords.likeness);
  return matchedWords;
}
