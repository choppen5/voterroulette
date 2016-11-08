const express = require('express');
const bodyParser= require('body-parser')
const app = express();
const MongoClient = require('mongodb').MongoClient
var ObjectId = require('mongodb').ObjectID;

const dbUser = process.env.DBUSER || "talktoavoter";
const dbPass = process.env.DBPASS || "test";
const dbUrl = process.env.DBURL || "ds145997.mlab.com:45997/talktoavoter";
const mongoUrl = process.env.FULLDBURL || `mongodb://${dbUser}:${dbPass}@${dbUrl}`;

var db;
MongoClient.connect(mongoUrl, (err, database) => {
  if (err) return console.log(err)
  db = database
  var port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log('listening on ' + port);
  })
})

app.use(bodyParser.urlencoded({extended: true}));
app.get('/ivr', function (req, res) {
  var twiml = ` <Response>
                <Say voice="alice">Welcome to voter roulette! You will be connected to a voter who supports another candidate. 
                <Pause length="1"/>
                Your conversation will be recorded and potentially transcribed and published on the internet.
                If you don't want your conversation recorded, please  hang up now.</Say>
                 <Pause length="1"/>
                <Gather numDigits="1" action="/choose">
                 <Pause length="1"/>
                <Say voice="alice">If you are voting for Hillary Clinton, press 1.
                If you are voting for Donald Trump, press 2.
                If you are undecided, press 3.
                For votes for any other candidate, press 4
                </Say>
                </Gather>
                <Redirect method="GET">/ivr</Redirect>
                </Response>`
  res.send(twiml);
})


app.post('/recordingover', function (req, res) {
    collection = db.collection('voters');
    console.dir(req.body);
    collection.findOne( { $or: [{conference: req.body.CallSid}, {othercaller: req.body.CallSid }]}, function (err, result) {
        if (err) {
            console.log(err)
        } else {
            if (result) { 
                collection.update({_id: result._id}, {$set: {state: "complete", recordingUrl: req.body.RecordingUrl}});
            }
        }
    });
    res.sendStatus(200);
});

app.post('/cleanup', function (req, res) {
    //when a call ends, look for records and update them
    collection = db.collection('voters');
    console.dir(req.body);
    collection.findOne( { conference: req.body.CallSid }, function (err, result) {
        if (err) {
            console.log(err)
        } else {
            if (result) {
                collection.update({_id: result._id}, {$set: {state: "complete"}});
            }
        }
    });
    var twiml = `<Response><Say voice="alice">Thank you for your call. Call back in if you want to talk to another voter.</Say></Response>`;
    res.send(twiml);
});

app.post('/choose', (req, res) => {
    const digits = req.body.Digits; //ivr choice
    var callSid =req.body.CallSid;

    var twiml; 
    var confname; 

    var voter = {phoneNumber: req.body.From, choice: digits, state: "new", timestamp: "now"} //
    collection = db.collection('voters');
    var otherVoter = collection.findOne( { $and: [{ choice: { $ne: digits } }, {state: "waiting"}]}, function (err, result) {
        if (err) {
            console.log(err)
        } else {
            //found someboudy waiting, so update the original waiting person document
            if (result) {
                    collection.update({_id: result._id}, {$set: {state: "talking", othercaller: callSid, otherchoice: digits}})
                    twiml = `<Response>
                            <Dial action="/cleanup"><Conference  endConferenceOnExit="true" record="record-from-start" eventCallbackUrl="/recordingover">${result.conference}</Conference></Dial></Response>`;
             } else {
            //did not find a waiting voter
                    voter.conference = callSid;
                    voter.state = "waiting";
                    confname = callSid;
                    collection.insert(voter,{w: 1},function(err, records) {
                        if (err) {
                            return console.log(err);
                        } else {
                            console.log(`logged a voter ${voter}`);
                        }
                    });
                    twiml = `<Response>
                            <Say voice="alice">Please hold until another caller joins.</Say>
                            <Dial action="/cleanup"><Conference endConferenceOnExit="true" record="record-from-start" eventCallbackUrl="/recordingover">${confname}</Conference></Dial></Response>`;
            }
            res.send(twiml);
        }
    } );
});
