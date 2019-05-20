const express = require('express')
const app = express()
const port = 8888
app.set('port', process.env.PORT || port);
const Repository = require('./repository')
const RequestHandling = require('./requests')

// Populate database with sample data for pk = "xyz"
// Repository.insertSampleAggregationRequest()

app.use(express.json({"type": "application/json"}))

function authenticate (req, res, next) {
	let user
	let pw
	if (req.method === "GET") {
		user = req.query.pk
		pw = req.query.pw
	} else {
		user = req.body.pk
		pw = req.body.pw
	}
	console.log("Try authentication ...")

	Repository.authenticateUser(user, pw, (authenticated) => {
		if (!authenticated) {
			console.log("Authentication failed")
			res.status(401).json({"status":false})
		} else {
			console.log("Authentication successful")
			next()
		}
	})
}

app.use('/requests', authenticate)
app.use('/forward', authenticate)

app.use(function (req, res, next) {
	if (req.method === "POST") {
		if (!req.body.pk) {
			console.log("WARNING: No user specified")
		} else {
			RequestHandling.updateUserTimestamp(req.body.pk)
		}
	} else if (req.method === "GET") {
		if (!req.query.pk) {
			console.log("WARNING: No user specified")
		} else {
			RequestHandling.updateUserTimestamp(req.query.pk)
		}
	}
	next()
})

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