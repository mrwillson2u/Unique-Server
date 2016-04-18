var FirebaseTokenGenerator = require("firebase-token-generator");
var tokenGenerator = new FirebaseTokenGenerator(process.env.FIREBASE_SECRET);
// var token = tokenGenerator.createToken({uid: "1", some: "arbitrary", data: "here"});


var http = require('http');

console.log("Starting....");

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
