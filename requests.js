var exports = {}

function handleNewUserRequest(req, res) {
	let pk = req.body.pk
	let timestamp = Date().timestamp
	// TODO: Implement!!
	console.log("Got new user request with pk=" + pk + " and timestamp=" + timestamp)
	res.status(200).send("Ok")
}

function handleUnknownRequest (req, res) {
	console.log("Got unknown request")
	res.status(404).send("Not Ok")
}

function handleBasicGetRequest (req, res) {
	res.set({
		'Content-Type': 'text/plain'
	})
	res.status(200)
		.send("Hello world")
}

function sendAPIInfo (req, res) {
	res.set({
		'Content-Type': 'text/json'
	})
	res.status(200).end()
}

function sendAggregations (req, res) {
	res.set({
		'Content-Type': 'text/json'
	})
	res.status(200).send("List of all aggregations as json")
}

function sendStatistics (req, res) {
	res.set({
		'Content-Type': 'text/json'
	})
	res.status(200).send({'basic':'info'})
}

function handleAggregationResult (req, res) {
	console.log("Got aggregation result")
	res.status(200).end()
}

function handleForwardRequest (req, res) {
	console.log("Got forward request")
	res.status(200).end()
}

exports.handleNewUserRequest = handleNewUserRequest
exports.handleUnknownRequest = handleUnknownRequest
exports.handleBasicGetRequest = handleBasicGetRequest
exports.sendAPIInfo = sendAPIInfo
exports.sendAggregations = sendAggregations
exports.sendStatistics = sendStatistics
exports.handleAggregationResult = handleAggregationResult
exports.handleForwardRequest = handleForwardRequest

module.exports = exports