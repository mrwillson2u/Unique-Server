
var test = "test";
var json = "{test:" + test + ", hello: 45}";

// json = json.replace(/\((|\s|,)+=(.+):/g,"HELLO");  (\{|\s|\,)(?=:)
// json = json.replace(/([^\:]+)/g,'"$1"');

var str = "{ hello: 'world', places: ['Africa', 'America', 'Asia', 'Australia'] }";
var json = JSON.stringify(eval("(" + json + ")"));

var obj = new Object();

obj.test = "hello";
obj.test2 = "hello2";

 var json = JSON.stringify(obj);

console.log(json);
