var moment = require('moment');
var neo4j = require('node-neo4j');
var Uid = require('sequential-guid');
var db = new neo4j(process.env['GRAPHENEDB_URL'] || 'http://localhost:7474');
//var db = new neo4j("http://thesisdb:Pvewfh3457PS02N6ocac@thesisdb.sb01.stations.graphenedb.com:24789");

exports.threads = function(req, res) {
	res.render('threads');
}

exports.getThreads = function(req, res) {
	// Get all threads related to the topic in req.query.topic
	db.cypherQuery("MATCH (n:Topic),(m:OpeningPost) WHERE n.topicName = '" + req.query.topic + "' WITH n,m MATCH (n)<-[:BELONGSTO]-(m) RETURN {id: id(m), title: m.title, postId: m.postId, numChildren: m.numChildren}", function(err, threads) {
		if(err)
			throw err;
		else {
			// Sort threads by number of children (in future prob children / votes)
			// Find root
			var root = threads.data[0],
				max = threads.data[0].numChildren;
			for(var i = 1; i < threads.data.length; i++) {
				if(threads.data[i].numChildren > max) {
					root = threads.data[i];
				}
			}
			/*	Maybe root node is a node representing the topic
			*
			* 	For now 3 children per node, most popular posts to the left
			*/ 
			// Sort nodes from highest to lowest on numChildren
			qsort(threads.data, 0, threads.data.length - 1);
			//console.log(threads.data);
			var rtn = {};
			var numc = 3; // Number of children each node will have
			var numDepths = Math.floor(threads.data.length / numc);
			if(threads.data.length % numc != 0)
				numDepths++;
				
			rtn = {id: "topic", title: "This is a topic", message: "Topic message", postId: "topic postId", children: []};
			if(threads.data.length > 1) {
				var curr = 0,
					t = -1;
				var c = [];
				for(var i = 0; i < threads.data.length; i++) {
					for(var j = 0; j < numDepths; j++) {
						if(i < numc) {
							c.push({id: threads.data[i].id, title: threads.data[i].title, postId: threads.data[i].postId, children: []});
							i++;
						}
						else {
							c[t].children.push({id: threads.data[i].id, title: threads.data[i].title, postId: threads.data[i].postId, children: []});
							i++;
						}
					}
					t++;
				}
				rtn.children = c;
				
				res.send(JSON.stringify(rtn));
			}
			else {
				res.send(JSON.stringify(rtn));
			}
			
			function qsort(arr, left, right) {
				var index;
			    if (arr.length > 1) {
			        index = partition(arr, left, right);
			        if (left < index - 1) {
			            qsort(arr, left, index - 1);
			        }
			        if (index < right) {
			            qsort(arr, index, right);
			        }
			    }
			    return arr;
			};
			
			function swap(arr, left, right) {
				var tmp = arr[left];
				arr[left] = arr[right];
				arr[right] = tmp;
			};
			
			// This function is tailored for the objects it is sorting
			function partition(arr, left, right) {
				var pivot = arr[Math.floor((left + right) / 2)].numChildren;
				var i = left;
				var j = right;
				while(i <= j) {
					while(arr[i].numChildren > pivot) {
						i++;
					}
					while(arr[j].numChildren < pivot) {
						j--;
					}
					if(i <= j) {
						swap(arr, i, j);
						i++;
						j--;
					}
				}
				return i;
			};
		}
	});
}