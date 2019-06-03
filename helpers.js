const crypto = require('crypto')
const UserRepository = require('./repository/userRepository')
const Repository = require('./repository/commonRepository')

/*
	Authenticating a user. 
	If the user passes authentication, "next()" is called and thus the HTTP request is handed to the next middleware.
	If the user authentication fails, the server respondes with a 401 status code.
*/
function authenticateUser (req, res, next) {
	let user
	let pw

	if (req.method === "GET") {
		user = req.query.publicKey
		pw = req.query.password
	} else {
		user = req.body.publicKey
		pw = req.body.password
	}
	
	try {
		pw = crypto.createHash("sha256").update(pw).digest().toString()
	} catch (err) {
		res.status(401)
	}

	UserRepository.authenticateUser(user, pw).then(() => {
		next()
	}).catch(err => {
		console.log("Authentication failed")
		res.status(401).end()
	})
}

/*
	Updates the users lastSeen timestamp if the HTTP request is linked to any user.
	Either way, the HTTP request is passed to the next middleware via call to "next()".
*/
function updateUserLastSeen (req, res, next) {
	if (req.method === "POST") {
		if (!req.body.pk) {
			console.log("WARNING: No user specified on POST")
		} else {
			RequestHandling.updateUserTimestamp(req.body.pk)
		}
	} else if (req.method === "GET") {
		if (!req.query.pk) {
			console.log("WARNING: No user specified on GET")
			console.log("REQUEST:")
			console.log(req)
		} else {
			req.query.pk = req.query.pk.replace(/-/g, '+').replace(/_/g, '/').replace(/\+\+\+\+\+/g, '-----')
			UserRepository.updateUserTimestamp(req.query.pk)
		}
	}
	next()
}

/*
	Reroute aggregation requests that have been pending for more than a certain time.
*/
function runCleanUpJob () {
	setInterval(function () {
		Repository.cleanUp()
	}, 1000 * 60 * 60); 
}

module.exports = {
	updateUser: updateUserLastSeen,
	authenticateUser: authenticateUser,
	runCleanUpJob: runCleanUpJob
}