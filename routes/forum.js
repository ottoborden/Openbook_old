
/*

	Create hierarchical data structures (JSON) that can be parsed naturally by D3
	
		With regards to collision detection, specifically for edges (a computationally difficult problem), it may be wise to compute the links between nodes on the server side
			From SO
				This is not a hard problem. Just add forces to the edges in addition to the nodes. If possible, simply increasing the size of the graph would help significantly. –  tba Aug 11 '13 at 8:14
				http://stackoverflow.com/questions/17920704/avoid-collision-between-nodes-and-edges-in-d3-force-layout
				
			Consider:
				Do branching on the server side, aka the server will decide how many nodes a user sees.
					Only load nodes of depth 1 (original posts) at first? Perhaps depth < 3...
				
				?Set up a sort of "infinite scroll" type system?

*/

var Uid = require('sequential-guid');
//var async = require("async");
var neo4j = require('node-neo4j');
var moment = require('moment');
//var db = new neo4j(process.env.NEO4J_URL || 'http://localhost:7474');
var db = new neo4j(process.env['GRAPHENEDB_URL'] || 'http://localhost:7474'); // Heroku now offers Neo4j via the graphenedb addon

exports.forum = function(req, res) {
	res.render('forum', {rootId: req.query.rootId});
}

exports.getData = function(req, res) {
	/*	
		1/16/2014
			Get all posts then use functions like db.readOutgoingRelationshipsOfNode to map out which posts are replies and to what
				For Posts:
					Having outgoing nodes means it's a reply; incoming are either who posted it or replies to it
					It should suffice to check for incoming nodes of every post to build a JSON object representing a subgraph
					
		1/23/2014
			Okay so there is no need for me to set up redundant (and probably inefficient) queries to map out paths. I can start on a given post and
			traverse all nodes connected to it via Cypher alone.
				MATCH (n:Post)<-[path*]-(child)
				WHERE n.title = 'Post 2'
				AND NONE(r in path WHERE type(r) in ["POSTED"])
				RETURN *
				
				!!!! The only way this works is if I generate a unique and sequential ID as a property on each Post node and then order the results by this ID
				
		1/28/2014
			By adding a FIRSTREPLY relationship to the first node at a new depth and next (->) relationship from the first child to all nodes to its right I can traverse the graph in BFO.	
				MATCH (n:Post)-[:FIRSTREPLY]->(m:Post) 
				OPTIONAL MATCH (m)-[:NEXT*]->(c:Post) 
				RETURN DISTINCT n,m,collect(c)
				
		1/30/2014
			Neo4j 2.0 allows the use of literal maps to describe the format of output from Cypher queries. So close....!
				MATCH (n:Post)-[:FIRSTREPLY]->(m:Post)
				OPTIONAL MATCH (m)-[:NEXT*]->(c:Post)
				RETURN { root: {id: id(m), title: m.title, message: m.message}, collectionKey: [ {id: id(c), title: c.title, message: c.message} ] }
				
		1/31/2014
			Return arrays with first object as parent node and second object as reply node
				MATCH (n:Post)<-[:REPLYTO]-(m:Post)
				RETURN { root: {id: id(n), title: n.title, message: n.message}, collectionKey: {id: id(m), title: m.title, message: m.message} }
				
				!!!!! This query and sort method may not be reliable long term because Neo4j does not guarantee that it will traverse breadth first
				
				Try Insertion Sort
				
		2/4/2014
			MATCH (n:OpeningPost)
			WITH n
			OPTIONAL MATCH (n)<-[:REPLYTO]-(m)
			OPTIONAL MATCH (n)<-[:REPLYTO*]-(m)<-[:REPLYTO]-(c:Post)
			RETURN { root: {id: id(n), title: n.title, message: n.message}, parent: {id: id(m), title: m.title, message: m.message}, children: COLLECT( {id: id(c), title: c.title, message: c.message} ) }
			
		2/5/2014
			The above doesn't work because I need to be able to search down to an arbitrary depth
			
		2/13/2014
			START a=node(4)
			MATCH p = a<-[:REPLYTO*]-x
			RETURN p
			
			Include notes on how to get around explicit async coding (for example putting the .exec() call below inside the push method)
			
		2/20/2014
			Success!
				Query DB twice and minimize return payloads OR return a larger payload but query only once?
					RETURN EXTRACT (x IN nodes(p) | {id: id(x), message: x.message, title: x.title}) AS messages
						vs
					RETURN p
			
			TODO
				Send GUID in payload as well - this will speed up selecting nodes in D3js
				
	*/
	// This will return an object with an array called nodes. Use this to build a map of the structure to return, then fill it it with post data. Then send a query getting info each node involved
	// When this is called from threads.js the id of the start node will be known
	var nodeNum = 298;
	var rootNodeId = -1;
	db.cypherQuery("START a=node(" + req.query.rootId + ") WITH a MATCH p = a<-[:REPLYTO*]-x RETURN EXTRACT (x IN nodes(p) | {id: id(x), message: x.message, title: x.title, postId: x.postId}) AS messages", function(err, posts) {
		if(err)
			throw err;
		else {
			var rtn = {}; // Object to return
			var t = []; // Hold extracted node ids
			var numChildren = 0; // Count all nodes that are a descendant of the root node
			for(var i = 0; i < posts.data.length; i++) {
				for(var j = 0; j < posts.data[i].length; j++) {
					t.push(posts.data[i][j]);
				}
			}
			if(posts.data.length == 0) { // Deal with a post with no children
				db.cypherQuery("START a=node(" + nodeNum + ") RETURN a", function(err, post) {
					if(err)
						throw err;
					else {
						console.log(post.data[0]);
						rtn = {id: post.data[0].id, title: post.data[0].title, message: post.data[0].message, postId: post.data[0].postId, children: []};
						rootNodeId = post.data[0].postId;
						
						res.send(JSON.stringify(rtn));
					}
				});
			}
			else {
				// Build rtn object
				rtn = {id: t[0].id, title: t[0].title, message: t[0].message, postId: t[0].postId, children: []};
				rootNodeId = t[0].postId;
				var curr = rtn;
				for(var i = 1; i < t.length; i++) {
					if(t[i].id == t[0].id) {
						curr = rtn;
						continue;
					}
					if(curr.children.length > 0) {
						var found = false;
						for(var j = 0; j < curr.children.length; j++) {
							if(curr.children[j].id == t[i].id) {
								found = true;
								curr = curr.children[j];
								break;
							}
						}
						if(!found) {
							curr.children.push({id: t[i].id, title: t[i].title, message: t[i].message, postId: t[i].postId, children: []});
							numChildren++;
						}
					}
					else {
						curr.children.push({id: t[i].id, title: t[i].title, message: t[i].message, postId: t[i].postId, children: []});
						numChildren++;
					}
				}
				
				res.send(JSON.stringify(rtn));
			}
			
			// Update root node with the number of its children
			db.cypherQuery("MATCH (n:OpeningPost) WHERE n.postId = '" + rootNodeId + "' SET n.numChildren = " + numChildren, function(err, result) {
				if(err)
					throw err;
				else {
					console.log("numChildren updated successfully.");
				}
			});
			
			//console.log(JSON.stringify(rtn));
			//res.send(JSON.stringify(rtn));
		}
	});
	
	/*var rtn = {};
	var users = new Array();
	db.cypherQuery("MATCH (n:Post) RETURN n", function(err, posts) {
		if(err)
			throw err;
		else {
			//console.log(posts);
			if(posts.data.length > 1) {
				/*
					Everything in Node is non-blocking so I must find a way to execute code serially
						Seperate the code that interacts with DB and code that constructs return object
				
				// Array to hold async tasks
				var asyncTasks = [];
				var results = [];
				// Loop through some items
				posts.data.forEach(function(item){
				  // We don't actually execute the async thing here
				  // We push a function containing it on to an array of "tasks"
				  asyncTasks.push(function(dbCallback) {
				  	db.readIncomingRelationshipsOfNode(item._id, function(err, rels) {
						if(err)
							throw err;
						else {
						  results.push(rels);
						  dbCallback();
						}
					});
				  });
				});
				
				// Execute all async tasks in the asyncTasks array
				async.parallel(asyncTasks, function(){
				  // All tasks are done now
				  results.forEach(function(item, index) {
				  	for(var i = 0; i < item.length; i++) {
					  if(item[i]._type == "POSTED") {
					  	item.splice(i, 1);
					  	//console.log(item[i]);
					  }
					}
				  });
				  results.forEach(function(item, index) {
					  if(item.length == 0)
					  	results.splice(index, 1);
				  });
				  
				  // Begin building return object
				  console.log(results);
				});
			}
			else {
				//rtn.name = posts.data[0].userNodeId
				
			}
		}
	})

	/*
		How to limit the size of subgraph displayed to user when graph is huge?
			start n=node(user.id)
			...
			LIMIT 200
	*/
}

exports.handleReply = function(req, res) {
	// First insert the new Post node and link it to the proper user
	// Then create the REPLYTO relationship on the proper node
	var uid = new Uid;
	var t = {
		title: req.body.replyTitle,
		message: req.body.replyMessage,
		timePosted: moment().unix(),
		postId: uid.next()
	};
	db.insertNode(t, "Post", function(err, node) {
		if(err) {
			console.log(err);
			res.end("Error storing reply post, application must halt.");
		}
		else {
			// Only create the relationship if the post is stored successfully
			/*
				Use Passport's serializeUser function to store the node id of the user; node.id will contain the id of a successful post
			*/
			db.insertRelationship(req._passport.session.user.userNodeId, node._id, 'POSTED', {relationshipId: uid.next()}, function(err, relationship){
				if(err) {
					throw err;
				}
				else {
					console.log("Post successfully related to user " + req._passport.session.user.userNodeId);
					// Get ID of node with postId == req.body.guid
					db.cypherQuery("MATCH (n),(m) " + // Originally MATCH (n:Post),(m:Post) - this is why can't respond to OP; it of type OpeningPost
									"WHERE n.postId = \'" + req.body.guid + "\' AND " + 
									"id(m) = " + node._id + 
									" CREATE (m)-[r:REPLYTO { timePosted: " + moment().unix() + ", relationshipId: \'" + uid.next() + "\'}]->(n)", function(err, posts) {
						if(err)
							throw err;
						else {
							console.log("Successfully created REPLYTO relationship for new reply.");
						}
					});
				}
			});
			// Need to return serialized JSON or jQuery thinks an error has occurred
			// Send the new node back so the forum can be updated without a page load
			console.log(node);
			var r = {
				success: true
			};
			res.send(JSON.stringify(node));
		}
	});
	
	/*db.insertRelationship(req._passport.session.user, node._id, 'POSTED', {relationshipId: uid.next()}, function(err, relationship){
		if(err) {
			throw err;
		}
		else {
			nodeId = node._id;
			console.log("Post successfully related to user " + req._passport.session.user);
			console.log(relationship);
		}
	});*/
}

var dbCallback = function() {
	console.log("dbCallback");
}