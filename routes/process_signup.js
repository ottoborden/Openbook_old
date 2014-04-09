
/*
 * Process registration form
 */

var util = require('util');
var crypto = require('crypto');
var Uid = require('sequential-guid');
var neo4j = require('node-neo4j');
var db = new neo4j(process.env.NEO4J_URL || 'http://localhost:7474');
//var db = new neo4j("http://thesisdb:Pvewfh3457PS02N6ocac@thesisdb.sb01.stations.graphenedb.com:24789");

var express = require('express');
var app = express();
app.use(express.bodyParser());

//exports.createUser = createUser; -- Don't think I need to export this if I call it here

/*
	1/18/2014
		How to ensure that each user gets a unique id?
			An orphan node that stores a single integer; this way Neo4j can handle concurrent access issues which I would have to resolve myself if I stored the next unique id available in a 			text file on the server.
*/

exports.process = function(req, res) {
	res.send('Process registration here...');
	var key = crypto.randomBytes(256);
    var passHash = crypto.createHmac('sha1', key).update(String(req.body.password)).digest('hex');
    var uid = new Uid;
    db.insertNode({
	    username:  String(req.body.username),
        password: passHash,
        key: key,
        email: String(req.body.email),
        userId: uid.next()
    }, "User", function(err, node) {
    		if(err)
	    		console.log("User Registration Error: " + err);
	    	else {
		    	console.log("New User Registered Successfully.");
	    	}
    	})
};