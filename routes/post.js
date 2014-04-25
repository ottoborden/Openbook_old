var moment = require('moment');
var neo4j = require('node-neo4j');
var Uid = require('sequential-guid');
var db = new neo4j(process.env['GRAPHENEDB_URL'] || 'http://localhost:7474');
//var db = new neo4j("http://thesisdb:Pvewfh3457PS02N6ocac@thesisdb.sb01.stations.graphenedb.com:24789");

exports.post = function(req, res) {
	if(req.isAuthenticated())
		res.render("post");
	else
		res.redirect('/login');
}

/*
	Eventually I will need to set up transactions so things are not committed to the DB unless all goes according to plan
		Node-Neo4j contains built in transaction support
*/
exports.process = function(req, res) {
	var uid = new Uid;
	var t = {
		title: req.body.title,
		message: req.body.message,
		timePosted: moment().unix(),
		postId: uid.next()
	};
	db.insertNode(t, "OpeningPost", function(err, node) {
		if(err) {
			console.log(err);
			res.end("Error storing post, application must halt.");
		}
		else {
			// Only create the relationship if the post is stored successfully
			/*
				Use Passport's serializeUser function to store the node id of the user; node.id will contain the id of a successful post
			*/
			db.insertRelationship(req._passport.session.user.userNodeId, node._id, 'POSTED', {relationshipId: uid.next()}, function(err, relationship) {
				if(err) {
					throw err;
				}
				else {
					console.log("Post successfully related to user " + req._passport.session.user.userNodeId);
					console.log(relationship);
					// Now associate the post with the proper topic
					db.insertRelationship(node._id, 320, 'BELONGSTO', {relationshipId: uid.next()}, function(err, rel) {
						if(err)
							throw err;
						else {
							console.log("Successfully related post " + node._id + " to topic 320.");
						}
					});
				}
			});
		}
	});
	
	//res.send(req.body);
	res.redirect('/forum');
}