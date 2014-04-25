var moment = require('moment');
var neo4j = require('node-neo4j');
var Uid = require('sequential-guid');
var db = new neo4j(process.env['GRAPHENEDB_URL'] || 'http://localhost:7474');
//var db = new neo4j("http://thesisdb:Pvewfh3457PS02N6ocac@thesisdb.sb01.stations.graphenedb.com:24789");

exports.getThreads = function(req, res) {
	console.log(req.query);
	
	// Get all threads related to the topic in req.query.topic
	db.cypherQuery("MATCH (n:Topic),(m:OpeningPost) WHERE n.topicName = '" + req.query.topic + "' WITH n,m MATCH (n)<-[:BELONGSTO]-(m) RETURN {id: id(m), title: m.title, postId: m.postId}", function(err, threads) {
		if(err)
			throw err;
		else {
			// Sort threads by number of children (in future prob children / votes)
		}
	});
	
	res.send("Got here");
}