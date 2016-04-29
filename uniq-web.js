var Firebase = require('firebase');
var FirebaseTokenGenerator = require("firebase-token-generator");
var tokenGenerator = new FirebaseTokenGenerator(process.env.FIREBASE_SECRET);
var http = require('http');
var jackrabbit = require('jackrabbit');
var async = require('async');

var ref = new Firebase("https://unique-iq.firebaseio.com");

var rabbit = jackrabbit(process.env.RABBIT_URL);
console.log("starting web...");
console.log(ref);


ref.authWithCustomToken(process.env.FIREBASE_SECRET, function(error, authData) {
  if (error) {
    console.log("Login Failed!", error);
  } else {
    console.log("Login Succeeded!", authData);

      // An event listener watching for new users added
    var exchange = rabbit.default();
    var jobMessage = exchange.queue({name: 'task_queue', durable: 'true'});


    ref.child("users").on("child_added", function(user) {
      console.log("Listining for user: " + user.key());

      // Start an envent listener waiting for websites to be added to the new user
      ref.child("users/" + user.key() + "/URLS").on("child_added", function(site) {
           // Limit the ammount of websites it tries to load at onw time to same memory usage and try to avoid hangups

          // Cant send all data at once!
          var queObj = {user: user, site: site};
            q.push(queObj, function() {
              console.log('Processed: ' + site.key());

            });
        });
      });

      var q = async.queue(function (task, asyncBack) {
        var userKey = {};
        userKey[task.user.key()] = task.user.val();
        var siteKey = {};
        siteKey[task.site.key()] = task.site.val();
        exchange.publish(new Buffer(JSON.stringify({user: userKey, site: siteKey})), {key: "task_queue"});
        console.log("test");
        exchange.on('drain', process.exit);
        
        async.setImmediate(function() {
          asyncBack();
        });
      }, 1);
    }
});




http.createServer(function(request, response) {
  console.log("request method:");
  console.log(request.method);

  request.on('error', function(err) {
    console.error(err);
    response.statusCode = 400;
    response.end();
  });
  response.on('error', function(err) {
    console.error(err);
  });

  if (request.method === 'GET') {//request.url === ''
    var token = tokenGenerator.createToken({uid: request.uid});
    console.log("Token: " + token);
    request.pipe(token);
  } else if (request.method === 'POST') {//request.url === ''

    var body = [];
    request.on('data', function(chunk) {
      body.push(chunk);
    }).on('end', function() {
      body = Buffer.concat(body).toString();
      console.log('body');
      console.log(body);
      // at this point, `body` has the entire request body stored in it as a string
      var token = tokenGenerator.createToken({uid: body});
      console.log("Token: " + token);
      response.write(token);
      response.end();
    });
  }else {
    response.statusCode = 404;
    response.end();
  }

}).listen(process.env.PORT || 3000);
