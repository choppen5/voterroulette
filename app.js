const express = require('express');
const bodyParser= require('body-parser')
const app = express();
const MongoClient = require('mongodb').MongoClient
var ObjectId = require('mongodb').ObjectID;
const dbUser = "talktoavoter";
const dbPass = "serveronly";

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

app.get('/', function (req, res) {

  res.sendFile( process.cwd() + '/index.html');

})

app.post('/newvoter', (req, res) => {
   console.log(req.body);

    var voter = req.body;
    
    collection = db.collection('voters');
    collection.insert(voter,{w: 1},function(err, records) {
        if (err) {
            return console.log(err);
        } else {
            console.log(records);
           // var id = result.insertedId;
           var objectId = records.ops[0]._id
           console.log("does this work" + voter._id);
            console.log('saved to database = ' + objectId)  ;
            res.redirect(`/voter/?voterIid=`)
        }
    });
   //submit the new voter - or find existing one (with same phone number)
   //return a url with a unique user id
   //redirect to GET /voter/:id
  // res.send(200);
});

app.get('/voter', (req, res) => {
    const voterId = req.body.voterId;
    //render a voter - this should only be known to you
    //allow you to start the call with the right browser
        // or, call in. 
    // your state changes.
        //recieve your state change from the server --? necessary
    // when you are on a call, you see a new conversation
    // conversation has its own id
    res.send(200);

});

app.get('/conversation', (req, res) => {
    const voterId = req.body.conversationId;
    //here, anybody who has the conversation can see the recording
    //can see see the tracks
    //can see transcriptions
    //* can edit or clarify the transcriptions? */

});


