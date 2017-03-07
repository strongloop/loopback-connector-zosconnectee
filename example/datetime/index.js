/* 
 * A simple server program that returns the current date/time based on a given timezone
 */

var express = require('express');
var time = require('time');
var datetimedoc = require('./datetime.json');

var serverport = 3100;
var host = 'http://localhost:' + serverport;
var nowdate;
var nowtime;

function getDateTime(timezone) {
    var date = new Date();

    var a = new time.Date(date.getTime());
    a.setTimezone(timezone);

    var hour = a.getHours();
    hour = (hour < 10 ? "0" : "") + hour;
    var min  = a.getMinutes();
    min = (min < 10 ? "0" : "") + min;
    var sec  = a.getSeconds();
    sec = (sec < 10 ? "0" : "") + sec;
    nowtime = hour + ":" + min + ":" + sec;

    var year = date.getFullYear();
    var month = date.getMonth() + 1;
    month = (month < 10 ? "0" : "") + month;
    var day  = date.getDate();
    day = (day < 10 ? "0" : "") + day;

    nowdate =  year + ":" + month + ":" + day ;
}

var app = express();

app.get('/zosConnect/apis/', function(req, res) {
    console.log('Got request for /zosConnect/apis/');
    var resp = {
     "apis":[
       {
         "name":"datetime", 
         "version":"1.0.0", 
         "description":"datetime service",
         "adminUrl": host + "/zosConnect/apis/datetime"
       }
      ]
    };
    console.log('Returning response: ' + JSON.stringify(resp, null, 2));
    res.send(resp);
});

app.get('/zosConnect/apis/datetime/', function(req, res) {
    console.log('Got request for /zosConnect/apis/datetime/');
    var resp = {
      "name": "datetime",
      "version": "1.0.0",
      "description": "datetime service",
      "apiUrl": host + "/datetime",
      "documentation": {
        "swagger": host + "/datetime/api-docs"
      }
    };
    console.log('Returning response: ' + JSON.stringify(resp, null, 2));
    res.send(resp);
});


app.get('/datetime/api-docs/', function(req, res) {
    console.log('Got request for /datetime/apis-docs/');
    res.send(datetimedoc);
});

app.get('/dateTime/:timezone', function(req, res) {
    console.log('Got request for /dateTime/:timezone ' + req.params.timezone);
    getDateTime(req.params.timezone);
    var resp = {date:nowdate, time: nowtime};
    console.log('Returning response: ' + JSON.stringify(resp, null, 2));
    res.send(resp);
});

app.listen(serverport);

console.log('Listening on port ' + serverport + '...');

/* End of program */

