
/*
 * GET sign up form.
 */

exports.signup = function(req, res){
  res.render('signup', { message: 'Registration Form' });
};