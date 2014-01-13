
/*
 * GET home page.
 */

var passport = require('passport');

exports.index = function(req, res) {
	res.render('index', { title: 'Otto\'s Neo4j Forum Demo' });
};