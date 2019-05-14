var exports = {}
const Repository = require('./repository')

function handleNewUserRequest(req, res) {
	let pk = req.body.pk
	if (pk == undefined || pk == "" || pk == null || pk == undefined) {
		res.status(400).send("Not ok")
	} else {
		let timestamp = (new Date()).getTime()
		// TODO: Implement!!
		console.log("Got new user request with pk=" + pk + " and timestamp=" + timestamp)
		Repository.insertNewUser(pk)
		res.status(200).send("Ok")
	}
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
	let pk = req.body.pk
	let original_request_id = req.body.original_request_id
	if (pk == undefined || original_request_id == undefined) {
		res.status(400).send("Not Ok")
	} else {
		console.log("Got aggregation result: pk=" + pk + " original_request_id=" + original_request_id)
		res.status(200).end()	
	}
}

function handleForwardRequest (req, res) {
	let pk = req.body.pk
	let target = req.body.target
	let original_request_id = req.body.original_request_id
	if (pk == undefined || target == undefined || original_request_id == undefined) {
		res.status(400).send("Not Ok")
	} else {
		console.log("Got forward request: target=" + target + " pk=" + pk + " original_request_id=" + original_request_id)
		res.status(200).end()
	}
}

function sendRequests (req, res) {
	console.log("Got get requests request")
	let exampleRequests = {'requests' : [
		{'id': 1, 'data': 'binarydataEncrypted...'}, 
		{'id':2, 'data':'binarydataEncrypted'}
	]}
	res.set({
		'Content-Type' : "text/json"
	})
	res.status(200).send(exampleRequests)
}

exports.handleNewUserRequest = handleNewUserRequest
exports.handleUnknownRequest = handleUnknownRequest
exports.handleBasicGetRequest = handleBasicGetRequest
exports.sendAPIInfo = sendAPIInfo
exports.sendAggregations = sendAggregations
exports.sendStatistics = sendStatistics
exports.handleAggregationResult = handleAggregationResult
exports.handleForwardRequest = handleForwardRequest
exports.sendRequests = sendRequests

module.exports = exports