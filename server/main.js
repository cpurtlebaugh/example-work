import { Meteor } from 'meteor/meteor';

// mongodb npm package
var MongoClient = require('mongodb').MongoClient,
    assert = require('assert');

var url = Meteor.settings.db;
// var url   = 'mongodb://localhost:3001/meteor';

Meteor.startup(() => {
  MongoClient.connect(url, function(err, db) {
    assert.equal(null, err);
    STAGING_DB = db
    console.log("DANGER! connected to LIVE staging db!");
    console.log('      ____')
    console.log('    ,\'    \\')
    console.log('   /        \\')
    console.log('   \ ()  () /')
    console.log('    `. /\\ ,\'')
    console.log('8====| "" |====8')
    console.log('     `LLLU\'')
  });

});


