// src/test.js
var a = 1
var a = 2   // duplicate variable
function testFunction() {
  var b = 10
  var c = 20
  if(b == c) {
    console.log("Equal")
  }
  else
    console.log("Not equal")   // no semicolon
}

testFunction()
