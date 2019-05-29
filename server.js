const express = require('express')
const crypto = require('crypto')
const app = express()
const port = 8888
const fs = require('fs')
app.set('port', process.env.PORT || port);
const Repository = require('./repository')
const UserRepository = require('./userRepository')
const RequestHandling = require('./requests')

setInterval(function () {
	Repository.cleanUp()
}, 1000 * 60 * 60); 

// Populate database with sample data for pk = "xyz"
// Repository.insertSampleAggregationRequest()

app.use(express.json({"type": "application/json"}))

function authenticate (req, res, next) {
	console.log("Authenticating ...")
	next()
	return
	let user
	let pw

	if (req.method === "GET") {
		user = req.query.pk
		pw = req.query.pw
	} else {
		user = req.body.pk
		pw = req.body.pw
	}
	if (!user || !pw) {
		console.log("Authentication failed")
		res.status(401).json({"status":false})
		return
	}

	pw = crypto.createHash("sha256").update(pw).digest().toString()

	//console.log("Try authentication ...")

	UserRepository.authenticateUser(user, pw).then(() => {
		next()
	}).catch(err => {
		console.log("Authentication failed")
		res.status(401).json({"status":false})
	})
}

app.use(function (req, res, next) {
	if (req.method === "POST") {
		if (!req.body.pk) {
			console.log("WARNING: No user specified on POST")
		} else {
			//req.body.pk = req.body.pk.replace(/-/g, '+').replace(/_/g, '/')
			RequestHandling.updateUserTimestamp(req.body.pk)
		}
	} else if (req.method === "GET") {
		if (!req.query.pk) {
			console.log("WARNING: No user specified on GET")
		} else {
			req.query.pk = req.query.pk.replace(/-/g, '+').replace(/_/g, '/').replace(/\+\+\+\+\+/g, '-----')
			RequestHandling.updateUserTimestamp(req.query.pk)
		}
	}
	next()
})

app.use('/requests', authenticate)
app.use('/forward', authenticate)

app.get('/', RequestHandling.handleBasicGetRequest)
app.get('/info', RequestHandling.sendAPIInfo)
app.get('/aggregations', RequestHandling.sendAggregations)
app.get('/stats', RequestHandling.sendStatistics)
app.get('/requests', RequestHandling.sendRequests)
app.post('/user', RequestHandling.handleNewUserRequest)
app.post('/aggregation', RequestHandling.handleAggregationResult)
app.post('/forward', RequestHandling.handleForwardRequest)
app.post('/admin/sampleRequest', RequestHandling.handleInsertSample)
app.get('/test', RequestHandling.testing)
app.all('*', RequestHandling.handleUnknownRequest)

const server = app.listen(app.get('port'), function () {
	console.log("Server listening on port " + port)
})

// For Testings
module.exports = app