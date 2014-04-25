
/*
 * GET Log In form
 */

var util = require('util');
var crypto = require('crypto');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;

var neo4j = require('node-neo4j');
var db = new neo4j(process.env['GRAPHENEDB_URL'] || 'http://localhost:7474');

exports.login = function(req, res) {
    res.render('login', { loginMessage: 'Login' });
};

passport.use(new LocalStrategy(
    function(un, pw, done) {
    	db.readNodesWithLabelsAndProperties("User", {username: un}, function(err, results) {
    		if(err)
    			console.log("Error: " + err);
    		else {
				if(results.length > 1) {
					console.log("Multiple occurances of supplied username.");
					return done(null, false, { message: "Multiple occurances of supplied username. Please try again." });
				}
				else if(results.length <= 0) {
					console.log("Username not found.");
					return done(null, false, { message: "Username not found. Please try again." });
				}
				else if(results.length == 1) {
					var key = new Buffer(results[0].key, 'binary'); // Must first convert key to binary buffer
                    var passCheck = crypto.createHmac('sha1', key).update(pw).digest('hex');
                    if(passCheck == results[0].password) {
                    	var t = {
	                    	username: results[0].username,
	                    	userNodeId: results[0]._id
                    	};
                        return done(null, t);
                    }
                    else {
                        console.log("Password failure");
                        return done(null, false, { message: "Incorrect password. Please try again." });
                    }
				}
    		}
		});
    }
));

// Use the serializeUser method to store the node id of the logged in user
/*
	These methods have something to do with authenticating users against a DB; learn more
*/
passport.serializeUser(function(user, done) {
    done(null, user);
});

/*
	If userNodeId === 0 this function will fail and the app will crash
*/
passport.deserializeUser(function(user, done) {
    done(null, user);
});