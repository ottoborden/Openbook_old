
/*

	Create hierarchical data structures (JSON) that can be parsed naturally by D3

*/

var util = require('util');
var crypto = require('crypto');
var jade = require('jade');

var neo4j = require('node-neo4j');
var db = new neo4j(process.env.NEO4J_URL || 'http://localhost:7474');
//var db = new neo4j("http://thesisdb:Pvewfh3457PS02N6ocac@thesisdb.sb01.stations.graphenedb.com:24789");

exports.forum = function(req, res) {
	res.render('forum');
}

exports.getData = function(req, res) {
	// Get data from DB and send to client
	
	// Get a list of all nodes with the label User, returns JSON object
	var users;
	db.readNodesWithLabel('User', function(err, nodes) { 
		if(!err) {
		
			/*
				1/13/2014
					Remember, let the data structure do as much of the processing as possible
					
					D3's layout code expects a standard hierarchical node structure
						http://stackoverflow.com/questions/15535714/d3-js-collapsible-force-layout-links-are-not-being-generated/15538261#15538261
						http://stackoverflow.com/questions/19259279/d3-hierarchy-links-dont-use-accessor-function
						
					Understand force layouts so I can size can become something meaningful (popularity of a given post perhaps?)
			*/
		
			// Return JSON object not an array containing JSON objects
			/*var rtn = {};
			rtn["name"] = "All Users";
			rtn["children"] = new Array();
			for(var i = 0; i < nodes.length; i++) {
				var t = {};
				t["name"] = "User";
				t["children"] = new Array();
				var t1 = {};
				t1.username = nodes[i].username;
				t1.email = nodes[i].email;
				t1.size = Math.random() * (9999 - 999) + 999;
				t.children.push(t1);
				rtn["children"].push(t);
			}
			*/
			
			var rtn = {};
			rtn["name"] = "Users";
			rtn["children"] = new Array();
			for(var i = 0; i < nodes.length; i++) {
				var t = {};
				t.username = nodes[i].username;
				t.email = nodes[i].email;
				t.size = Math.random() * (9999 - 999) + 999;
				rtn["children"].push(t);
			}
			res.end(JSON.stringify(rtn));
		}
		else {
			console.log('Error fetching nodes labeled \'User\': ' + err);
			res.end("Couldn't fetch nodes");
		}
	});
}