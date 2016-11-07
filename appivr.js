const express = require('express');
const bodyParser= require('body-parser')
const app = express();
const MongoClient = require('mongodb').MongoClient
var ObjectId = require('mongodb').ObjectID;
const dbUser = "talktoavoter";
const dbPass = "test";

const mongoUrl = `mongodb://${dbUser}:${dbPass}@ds145997.mlab.com:45997/talktoavoter`;

var db;

MongoClient.connect(mongoUrl, (err, database) => {
  if (err) return console.log(err)
  db = database
  app.listen(3000, () => {
    console.log('listening on 3000')
  })
})

app.use(bodyParser.urlencoded({extended: true}));

app.get('/ivr', function (req, res) {

  //res.set('Conent-Type', 'text/xml');  

  var twiml = ` <Response>
                <Gather action="/choose">
                <Say>Thanks you for calling Talk to a voter!</Say>
                <Say>You are calling in to talk to a voter who is voting for somebody else.
                The goal of this is to have a civilized conversation, share about why you are 
                voiting for who you are voting for. Your conversation will be recorded and transcripibed and put on the internet.
                If you don't want your conversation recorded, please  hang up now.
                </Say>
                <Say>If you are voting for Hillary Clinton, press 1.
                If you are voting for Donald Trump, press 2.
                If you are undecided, press 3.
                For votes for any other candiate, press 4
                </Say>
                </Gather>
                </Response>`

 res.send(twiml);
})



app.post('/recordingover', function (req, res) {
    collection = db.collection('voters');
    console.dir(req.body);
    collection.findOne( { conference: req.body.CallSid }, function (err, result) {

        if (err) {
            console.log(err)
        } else {
            if (result) {
                //console.log("found " + req.body.FriendlyName);
        
                collection.update({_id: result._id}, {$set: {state: "complete", recordingUrl: req.body.RecordingUrl}});
            }

        }
    });
    res.sendStatus(200);
});

app.post('/cleanup', function (req, res) {
    var twiml = `<Response><Say>Thank you for your particpation. Call back in if you want more of this.</Say></Response>`;
    //send sms with recordin
    //ask them if they changed their mind? do they 
    res.send(twiml);

});

app.post('/choose', (req, res) => {
    const digits = req.body.Digits;
    const choice = digits;

    insertVoter(req.body.From, digits, "", req.body.CallSid);
    callSid =req.body.CallSid;

    var voter = {phoneNumber: req.body.From, choice: digits, state: "new", timestamp: "now"}
    var twiml;
    collection = db.collection('voters');
    var confname; //will be returned
    var otherVoter = collection.findOne( { $and: [{ choice: { $ne: choice } }, {state: "waiting"}]}, function (err, result) {

        if (err) {
            console.log(err)
        } else {
            console.log("by some miracle syntax is correct" + result);
            console.log(result);
            console.dir(result);
           // console.log(`other voter ${otherVoter}`);
            
            if (result) {
                    //get conference room they are in


                    collection.update({_id: result._id}, {$set: {state: "talking", othercaller: callSid}})
    
                    twiml = `<Response><Dial action="/cleanup"><Conference  endConferenceOnExit="true" record="record-from-start" eventCallbackUrl="/recordingover">${result.conference}</Conference></Dial></Response>`;

                    // update thisvoter and thatvoter with a room each is in
             } else {
                    //insert
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

                    twiml = `<Response><Dial action="/cleanup"><Conference endConferenceOnExit="true" record="record-from-start" eventCallbackUrl="/recordingover">${confname}</Conference></Dial></Response>`;

            }
            res.send(twiml);

        }
    

    } );
    //insert voter with digits

    //look for a queue that is not =! to your queue
    // if none, drop this user into their own conference
    // update user conference id
    // if there is one:
    // dial the other conference
    // update agent state


    //res.send(200);

});

//tr callback - 
//enqueue the caller
//second caller enqued
// 
//


function insertVoter(phoneNumber, choice, state, callSid) {
    
    console.log('fucking callbacks... when does print...');


    
}