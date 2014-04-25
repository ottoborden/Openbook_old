
/**
 * Module dependencies.
 */

var express = require('express');
var http = require('http');
var path = require('path');
var util = require('util'); // Provides utilities useful for debugging (and more?)
var passport = require('passport');
var flash = require('connect-flash'); // Message storage

// Define routes (route dependencies?)
var routes = require('./routes');
var index = require('./routes/index');
var user = require('./routes/user');
var signup = require('./routes/signup'); // Display registration form
var process_signup = require('./routes/process_signup'); // Process registration form
var login = require('./routes/login');
var forum = require('./routes/forum');
var post = require('./routes/post');


var app = express();
app.use(express.bodyParser());

// Authenticator
//app.use(express.basicAuth('testUser', 'testPass'));

/*
	Middleware is software that occupies the middle section of a hierarchy between the OS (Node.js I presume) and the application layer (my thesis)
	app.use is the function to used to load software into the middleware layer
	
	This is server side, how to I use it?
		Get initial data for first rendering of graph when a user goes to /forum
		Set up handler to fetch data for new nodes and to update the graph (ajax?)
		Handle user authentication (could also be done client-side)
	
	What to do on client side?
		Get data objects from server
		Convert into a force directed graph
		Handle all interactivity
	
		
		 - Error notification via e-mail
		 	Connect checks the arity of middleware functions and considers the function to be an error handler if it is 4, 
		 	meaning errors returned by earlier middleware will be passed as the first argument for inspection.
*/

// It is important to note that the cookie parser is used before the session, this order is required for sessions to work.
app.use(express.cookieParser());
app.use(express.session({secret: '1234567890QWERTY'}));

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
// Initialize Passport!  Also use passport.session() middleware, to support
// persistent login sessions (recommended).
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

// Define routes here to provide functionality of site
app.all('*', function(req, res, next) {
	if(req.isAuthenticated())
		console.log("logged in");
	else
		console.log("not logged in");
	next();
});
app.get('/', routes.index);
app.get('/users', user.list);

app.get('/signup', signup.signup);
app.post('/process_signup', function (req, res) {
    process_signup.process(req, res);
});

app.get('/login', login.login); // Show login form
app.post('/login', 
	passport.authenticate('local', { failureRedirect: '/login', failureFlash: true }),
	function(req, res) { // Authentication Successful
			res.redirect('/'); // Send to their user profile or the graph visualization
	}
);

app.get('/forum', forum.forum);
app.get('/forum/load', forum.getData);
app.post('/forum/reply', forum.handleReply);

app.get('/post', post.post);
app.post('/post', post.process);

app.get('/about', function(req, res, next) {
	res.render('about');
});

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});

// Simple route middleware to ensure user is authenticated.
//   Use this route middleware on any resource that needs to be protected.  If
//   the request is authenticated (typically via a persistent login session),
//   the request will proceed.  Otherwise, the user will be redirected to the
//   login page.
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/login');
}