var FirebaseTokenGenerator = require("firebase-token-generator");
var tokenGenerator = new FirebaseTokenGenerator("k1J7DInceZfL8K34rjQ0E2uX4Lgb1oT3njQaX6Iz");
// var token = tokenGenerator.createToken({uid: "1", some: "arbitrary", data: "here"});


var http = require('http');

http.createServer(function(request, response) {
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
    request.pipe(token);
  } else {
    response.statusCode = 404;
    response.end();
  }
}).listen(8080);
