
/*
 * Process registration form
 */

var util = require('util');
var crypto = require('crypto');

var neo4j = require('node-neo4j');
var db = new neo4j(process.env.NEO4J_URL || 'http://localhost:7474');
//var db = new neo4j("http://thesisdb:Pvewfh3457PS02N6ocac@thesisdb.sb01.stations.graphenedb.com:24789");

var express = require('express');
var app = express();
app.use(express.bodyParser());

//exports.createUser = createUser; -- Don't think I need to export this if I call it here

exports.process = function(req, res) {
	res.send('Process registration here...');
	var key = crypto.randomBytes(256);
    var passHash = crypto.createHmac('sha1', key).update(String(req.body.password)).digest('hex');
    db.insertNode({
	    username:  String(req.body.username),
        password: passHash,
        key: key,
        email: String(req.body.email)
    }, "User", function(err, node) {
    		if(err)
	    		console.log("User Registration Error: " + err);
	    	else {
		    	console.log("New User Registered Successfully.");
	    	}
    	})
};

/*
exports.process = function(req, res) {
    res.send('Process registration here.');
    var key = crypto.randomBytes(256);
    var passHash = crypto.createHmac('sha1', key).update(String(req.body.password)).digest('hex');
    var newUser = db.insertNode({
        username:  String(req.body.username),
        password: passHash,
        key: key,
        email: String(req.body.email)
    });
    newUser.save(function (err, node) {    // This function actually saves the node to Neo4j
        if (err) {
            console.err('Error saving new node to database:', err);
        } else {
            console.log('Node saved to database with id:', node.id);
        }
    });
};
*/