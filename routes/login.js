
/*
 * GET Log In form
 */

var util = require('util');
var crypto = require('crypto');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;

var neo4j = require('node-neo4j');
var db = new neo4j(process.env.NEO4J_URL || 'http://localhost:7474');

exports.login = function(req, res) {
    res.render('login', { loginMessage: 'Login' });
};

/*
// 10/16 -  Left off trying to figure out how to query DB (indexes and cypher cheat sheet)
exports.processLogin = function(req, res) {
    query = "START n=node(*) " +
        "WHERE HAS (n.username) AND n.username=\"" + req.body.username + "\"" +
        "WITH n.username AS username, n.password AS password, n.key AS key, count(*) AS count " +
        "RETURN username, password, key, count";
    params = {};
    db.query(query, params, function (err, results) {
        if(err) {
            console.log(err);
            res.send("Databse error encountered. Please try again.");
        }
        else {
            if(results.length > 1 || !results[0]) {// If result set is empty -- if(results.length > 1 || !results[0])
                console.log("Username not found");
                res.send("Username not found. Please try again.");
            }
            else {
                var key = new Buffer(results[0].key, 'binary'); // Must first convert key to binary buffer 
                var passCheck = crypto.createHmac('sha1', key).update(String(req.body.password)).digest('hex');
                if(passCheck == results[0].password) {
                    res.redirect('/');
                }
                else {
                    console.log("Password failure");
                }
            }
        }
    });
};
*/
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
                    console.log(passCheck);	
                    if(passCheck == results[0].password) {
                        return done(null, un);
                    }
                    else {
                        console.log("Password failure");
                        return done(null, false, { message: "Incorrect password. Please try again." });
                    }
				}
    		}
		});
        /*query = "START n=node(*) " +
            "WHERE HAS (n.username) AND n.username=\"" + username + "\"" +
            "WITH n.username AS username, n.password AS password, n.key AS key, count(*) AS count " +
            "RETURN username, password, key, count";
        params = {};
        db.query(query, params, function (err, results) {
            if(err) {
                console.log(err);
                //res.send("Databse error encountered. Please try again.");
                return done(null, false);
            }
            else {
                if(results.length > 1 || !results[0]) {// If result set is empty -- if(results.length > 1 || !results[0])
                    console.log("Username not found");
                    //res.send("Username not found. Please try again.");
                    return done(null, false, { message: "Username not " + username + "found. Please try again." });
                }
                else {
                    var key = new Buffer(results[0].key, 'binary'); // Must first convert key to binary buffer 
                    var passCheck = crypto.createHmac('sha1', key).update(String(password)).digest('hex');
                    if(passCheck == results[0].password) {
                        return done(null, username);
                    }
                    else {
                        console.log("Password failure");
                        return done(null, false, { message: "Incorrect password. Please try again." });
                    }
                }
            }
        });*/
    }
));




/*
 * 
 * 
 * These function don't do their job right now -- learn what they should do and implement it
 *  Look into find the id number of nodes returned
 * 
 */
passport.serializeUser(function(user, done) {
    done(null, user);
});

passport.deserializeUser(function(user, done) {
    done(null, user);
});