var devurl = "http://localhost:3000/forum/load";
var produrl = "";

$.ajax({
	url: devurl,
	data: {},
	success: function(data) {
		drawForum(data)
	},
	error: function(err) {
		console.log(err);
	},
	dataType: "json"
});

function drawForum(data) {
	console.log(data);

	var width = 1600,
	height = 600,
	node,
	link,
	root,
	selectedNodeId = -1;
	
	var force = d3.layout.force()
		.on("tick", tick)
		.gravity(0.05)
		.charge(-300)
		//.gravity(0)
		//.charge(0)
		/*.charge(function(d) {
		  	return d._children ? -d.size / 100 : d.children ? -100 : -30;
		  })*/
		.linkDistance(function(d) {
			return 10;
		  	//return d.target._children ? 50 : 30;
		  })
		.size([width, height]);
	  
	var vis = d3.select("#main").append("svg")
		.attr("width", width)
		.attr("height", height);
	
	root = data;
	root.fixed = true;
	root.px = root.py = 0;
	update();

	
	/*
		Collision detection via d3.geom.quadtree
		
		How do iterate through all the child nodes?
			Solve the JSON circular reference problem
			For now get posting and reply working and then deal with the JSON Neo4j returns
	
	force.on("tick", function(e) {
		var q = d3.geom.quadtree(data),
		  i = 0,
		  n = data.length;
		
		while (++i < n) q.visit(collide(data[i]));
		
		vis.selectAll("circle")
			.attr("cx", function(d) { return d.x; })
			.attr("cy", function(d) { return d.y; });
	});
	*/
	
	function update() {
		var nodes = flatten(root); // Perhaps flatten could be obsoleted by returning this array from the server? It takes compute load off the client
		var links = computeLinks(nodes); // HACK - d3.layout.hierarchy().links(nodes);
		
		// make sure we set .px/.py as well as node.fixed will use those .px/.py to 'stick' the node to:
		if (!root.px) {
			// root have not be set / dragged / moved: set initial root position
			root.px = root.x = width / 2;
			root.py = root.y = circle_radius(root) + 2;
		}
		
		// Restart the force layout.
		force
		  .nodes(nodes)
		  .links(links)
		  .start();
		
		// Update the links…
		link = vis.selectAll("line.link")
		  .data(links, function(d) { return d.target.id; });

		// Enter any new links.
		link.enter().insert("line", ".node")
		  .attr("class", "link")
		  .attr("x1", function(d) { return d.source.x; })
		  .attr("y1", function(d) { return d.source.y; })
		  .attr("x2", function(d) { return d.target.x; })
		  .attr("y2", function(d) { return d.target.y; });
		
		// Exit any old links.
		link.exit().remove();
		
		// Update the nodes…
		node = vis.selectAll("circle.node")
		  .data(nodes, function(d) { return d.id; });
		  //.style("fill", color);

		node.transition()
		  .attr("cy", function(d) { return d.y; })
		  .attr("r", function(d) { return circle_radius(d); });
		
		// Enter any new nodes.
		node.enter().append("circle")
			.attr("guid", function(d) { return d.postId; })
		  .attr("class", "node")
		  .attr("cx", function(d) { return d.x; })
		  .attr("cy", function(d) { return d.y; })
		  .attr("r", function(d) { return circle_radius(d); })
		  .style("fill", color)
		  .on("click", click)
		  .call(force.drag); // Comment out to disable drag behavior
		  
		  // Add text to nodes
		  //node.enter().append("text")
		  	//.text(function(d) { return d.title; });
		
		// Exit any old nodes.
		node.exit().remove();
	}

function tick() {
  // Apply the constraints:
  force.nodes().forEach(function(d) {
    if (!d.fixed) {
      var r = circle_radius(d) + 4, dx, dy, ly = 30;

      // #1: constraint all nodes to the visible screen:
      //d.x = Math.min(width - r, Math.max(r, d.x));
      //d.y = Math.min(height - r, Math.max(r, d.y));

      // #1.0: hierarchy: same level nodes have to remain with a 1 LY band vertically:
      if (d.children || d._children) {
        var py = 0;
        if (d.parent) {
          py = d.parent.y;
        }
        d.py = d.y = py + d.depth * ly + r; // The deeper a nodes depth the more distance between its parent and itself
      }

      // #1a: constraint all nodes to the visible screen: links
      dx = Math.min(0, width - r - d.x) + Math.max(0, r - d.x);
      dy = Math.min(0, height - r - d.y) + Math.max(0, r - d.y);
      d.x += 2 * Math.max(-ly, Math.min(ly, dx));
      d.y += 2 * Math.max(-ly, Math.min(ly, dy));
      // #1b: constraint all nodes to the visible screen: charges ('repulse')
      dx = Math.min(0, width - r - d.px) + Math.max(0, r - d.px);
      dy = Math.min(0, height - r - d.py) + Math.max(0, r - d.py);
      d.px += 2 * Math.max(-ly, Math.min(ly, dx));
      d.py += 2 * Math.max(-ly, Math.min(ly, dy));

      // #2: hierarchy means childs must be BELOW parents in Y direction:
      if (d.parent) {
        d.y = Math.max(d.y, d.parent.y + ly);
        d.py = Math.max(d.py, d.parent.py + ly);
      }
    }
  });

  // Reset the start and end points of the links that connect nodes
  link.attr("x1", function(d) { return d.source.x; })
      .attr("y1", function(d) { return d.source.y; })
      .attr("x2", function(d) { return d.target.x; })
      .attr("y2", function(d) { return d.target.y; });

  node.attr("cx", function(d) { return d.x; })
      .attr("cy", function(d) { return d.y; });
}

// Color leaf nodes orange, and packages white or blue.
function color(d) {
	if(d.children.length > 1)
		return "red";
	else
		return "blue";
  	//return d._children ? "#3182bd" : d.children ? "#c6dbef" : "#fd8d3c";
}

/*
	This function MAY have to be changed to accomodate my data structures
*/
function circle_radius(d) {
	return d.children ? 4.5 : Math.sqrt(d.size);
}

/*

	This is why the root node becomes the only node on a single click
		Not sure what this function is for

	This could be a FEATURE so that users can collapse and expand different branches to focus on a specific branch
		DUH!! That's why it's called a COLLAPSIBLE Force Layout
*/
// Toggle children on click.
function click(d) {
	selectedNodeId = d.postId;
	//console.log(d.children);
	/*if(d.parent != null) {
		if (d.children) {
			d._children = d.children;
			d.children = null;
		} else {
			d.children = d._children;
			d._children = null;
		}
	}*/
	
	// Must create a SVG element for textbox to move around the screen and not a div
	
	// Clear away boxes from last message that was displayed
	d3.select("#messageBox").remove();
	d3.select("#contentForObj").remove();
	d3.select("#replyForObj").remove();
	d3.select("#closeContentBox").remove();
	
	var box = vis.append('svg:rect').transition().duration(500)
						.attr('id', 'messageBox')
                        .attr('width', 290)
                        .attr('height', 230)
                        .attr('x', d.x)
                        .attr('y', d.y)
                        .style('fill', 'red')
                        .attr('stroke', 'black');
                        
    var contentForObj = vis.append('svg:foreignObject')
    					.attr('id', 'contentForObj')
                        .attr('x', d.x + 10)
                        .attr('y', d.y + 30)
                        .attr('width', 270)
                        .attr('height', 210)
                        .append('xhtml:div')
                        	.attr('id', 'contentBox')
	                        .style('width', "270px") // Need to use .style and send width & height as string concated with px
							.style('height', "170px")
	                        .style("overflow-x", "auto")
	                        .style("overflow-y", "auto")
	                        //.text(d.message)
							.html('<b>' + d.title + '</b><br/><br/>' + d.message);
				
    var closeContentBox = vis.append('svg:foreignObject')
	    					.attr('id', 'closeContentBox')
	                        .attr('x', d.x + 10)
	                        .attr('y', d.y + 5)
	                        .attr('width', 270)
	                        .attr('height', 20)
							.append('xhtml:div')
								.attr('id', 'replyLink')
								.style('width', '16px')
								.style('height', '16px')
								.style('text-align', 'center')
								.html('X<br/>')
								.on('click', closeContentBoxes);
	
	var replyForObj = vis.append('svg:foreignObject')
    					.attr('id', 'replyForObj')
                        .attr('x', d.x + 10)
                        .attr('y', d.y + 205)
                        .attr('width', 270)
                        .attr('height', 20)
						.append('xhtml:div')
							.attr('id', 'replyLink')
							.style('width', '270px')
							.style('height', '20px')
							.style('background-color', 'yellow')
							.html('Reply<br/><br/>')
							.on('click', showReplyForm);
	
	// Consider creating an addSVGElementFromJSON function
	
	update();
}

function showReplyForm() {
	var contentBox = d3.select('#contentBox'); // Quick hack to clear the message box
	contentBox.text('');
	contentBox.html(
		'Title: <input id="replyTitleText" type="text"></input><br/>' + 
		'Message: <textarea id="replyMessageText" type="textarea" rows="5" cols="29"></textarea><br/>'
	);
	contentBox.append('button')
			.attr('id', 'replyButton')
			.attr('type', 'submit')
			.text('Post Reply')
			.on('click', processReply);
}

function processReply() {
	// Send reply form data to localhost/handleReply
	// Need to know the guid of the node being replied to
	$.ajax({
		url: 'http://localhost:3000/forum/reply',
		dataType: 'json',
		type: 'POST',
		data: {
			guid: selectedNodeId,
			replyTitle: d3.select("#replyTitleText")[0][0].value,
			replyMessage: d3.select("#replyMessageText")[0][0].value
		},
		success: function(data) {
			console.log(data);
			closeContentBoxes();
			// Return the JSON serialization of the newly inserted node
			// Then put the node in the correct spot in the array and call update
			
		},
		error: function(err) {
			console.log(err);
			closeContentBoxes();
		}
	});
}

// Close all the boxes used to display and reply to posts
function closeContentBoxes() {
	d3.select("#messageBox").remove();
	d3.select("#contentForObj").remove();
	d3.select("#replyForObj").remove();
	d3.select("#closeContentBox").remove();
}

// Returns a list of all nodes under the root.
//	Also assigns a size value to nodes as well as depth
// Also assign each node a reasonable starting x/y position: we can do better than random placement since we're force-layout-ing a hierarchy!
function flatten(root) {
  var nodes = [], i = 0, depth = 0, level_widths = [1], max_width, max_depth = 1, kx, ky;

  function recurse(node, parent, depth, x) {
    if (node.children) {
      var w = level_widths[depth + 1] || 0;
      level_widths[depth + 1] = w + node.children.length;
      max_depth = Math.max(max_depth, depth + 1);
      node.size = node.children.reduce(function(p, v, i) { // Size is an accumulation, of some kind, of the children below it
        return p + recurse(v, node, depth + 1, w + i);
      }, 0);
    }
    if (!node.id) node.id = ++i;
    node.parent = parent;
    node.depth = depth;
    if (!node.px) {
      node.y = depth;
      node.x = x;
    }
    nodes.push(node);
    return node.size;
  }

  root.size = recurse(root, null, 0);

  // now correct/balance the x positions:
  max_width = 1;
  for (i = level_widths.length; --i > 0; ) {
    max_width = Math.max(max_width, level_widths[i]);
  }
  kx = (width - 20) / max_width;
  ky = (height - 20) / max_depth;
  for (i = nodes.length; --i >= 0; ) {
    var node = nodes[i];
    if (!node.px) {
      node.y *= ky;
      node.y += 10 + ky / 2;
      node.x *= kx;
      node.x += 10 + kx / 2;
    }
  }

  return nodes;
}

  }

/*
	1/13/2014
		This project is a graph visualizer not a tree visualizer, that is child nodes may have multiple parents (is this possible in this app??).
		Nonetheless I intend to display nodes in a hierarchical fashion (at least that's the plan atm)
		To accomplish this it is necessary to a hierarchical data structure (force layouts and D3's generic hierarchy class d3.layout.hierarchy)
		
		I ran into problems when computing the links (parent-child relationships) between nodes
		I hacked my way around this by pulling a function directly out of D3 v. 2.10.x
			Figure out what is wrong and adjust so it works natively with v3
			
		https://gist.github.com/GerHobbelt/3683278
		http://stackoverflow.com/questions/15535714/d3-js-collapsible-force-layout-links-are-not-being-generated/15538261#15538261
*/

/*function computeLinks(nodes) {
  return d3.merge(nodes.map(function(parent) {
    return parent.computeChildren().map(function(child) {
      return {source: parent, target: child};
    });
  }));
}*/

// This function pulled straight from v2.10
function computeLinks(nodes) {
    return d3.merge(nodes.map(function(parent) {
      return (parent.children || []).map(function(child) {
        return {source: parent, target: child};
      });
    }));
};

// Helper function for collision detection
function collide(node) {
  var r = node.radius + 16,
      nx1 = node.x - r,
      nx2 = node.x + r,
      ny1 = node.y - r,
      ny2 = node.y + r;
  return function(quad, x1, y1, x2, y2) {
    if (quad.point && (quad.point !== node)) {
      var x = node.x - quad.point.x,
          y = node.y - quad.point.y,
          l = Math.sqrt(x * x + y * y),
          r = node.radius + quad.point.radius;
      if (l < r) {
        l = (l - r) / l * .5;
        node.x -= x *= l;
        node.y -= y *= l;
        quad.point.x += x;
        quad.point.y += y;
      }
    }
    return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
  };
}