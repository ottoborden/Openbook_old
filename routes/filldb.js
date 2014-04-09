var moment = require('moment');
var neo4j = require('node-neo4j');
var Uid = require('sequential-guid');
var Faker = require('Faker');
var db = new neo4j(process.env.NEO4J_URL || 'http://localhost:7474');
//var db = new neo4j("http://thesisdb:Pvewfh3457PS02N6ocac@thesisdb.sb01.stations.graphenedb.com:24789");

exports.fillDb = function(req, res) {
	var uid = new Uid;
	var t = {
		title: Faker.Lorem.sentence(),
		message: Faker.Lorem.paragraph(),
		timePosted: moment().unix(),
		postId: uid.next()
	};
	var numNodes = 10;
	var users = [0,1,2,3];
	var ids = [5,6,7,8,9,10,11,12,13,14];
	// Create an OP and generate a fake reply tree for it
	db.insertNode(t, "OpeningPost", function(err, node) {
		if(err) throw err;
		else {
			db.insertRelationship(0, node._id, 'POSTED', {relationshipId: uid.next()}, function(err, relationship) {
				if(err) {
					throw err;
				}
				else {
					
				}
			});
			for(var i = 0; i < numNodes; i++) {
			var t = {
				title: Faker.Lorem.sentence(),
				message: Faker.Lorem.paragraph(),
				timePosted: moment().unix(),
				postId: uid.next()
			}
			db.insertNode(t, "Post", function(err, node) {
				if(err) throw err;
				else {
					ids.push(node._id);
					var currUser = Math.floor(Math.random() * ((users.length) - 0) + 0);
					db.insertRelationship(users[currUser], node._id, 'POSTED', {relationshipId: uid.next()}, function(err, relationship) {
						if(err) {
							throw err;
						}
						else {
							
						}
					});
				}	
			});
		}
		console.log(ids);
		for(var i = 0; i < numNodes; i++) {
			var currUser = Math.floor(Math.random() * ((users.length) - 0) + 0);
			var currNode = Math.floor(Math.random() * ((ids.length) - 0) + 0);
			db.insertRelationship(users[currUser], ids[currNode], 'REPLYTO', {relationshipId: uid.next()}, function(err, relationship) {
				if(err) {
					throw err;
				}
				else {
					
				}
			})
		}
		}
	});
	
	
	
	/*db.insertNode(t, "OpeningPost", function(err, node) {
		if(err) {
			console.log(err);
			res.end("Error storing post, application must halt.");
		}
		else {
			// Only create the relationship if the post is stored successfully
			/*
				Use Passport's serializeUser function to store the node id of the user; node.id will contain the id of a successful post
			
			db.insertRelationship(req._passport.session.user, node._id, 'POSTED', {relationshipId: uid.next()}, function(err, relationship){
				if(err) {
					throw err;
				}
				else {
					console.log("Post successfully related to user " + req._passport.session.user);
					console.log(relationship);
				}
			});
		}
	});
	
	res.send(req.body);*/
}