const User = require('./user')
const RawAggregationRequest = require('./rawAggregationRequest')
const AggregationRequest = require('./aggregationRequest')
const AggregationResult = require('./aggregationResult')

// Only for testing
function deleteAllRequests() {
	return AggregationRequest.deleteAllRequests()
}

// Only for testing
function deleteAllResults () {
	return AggregationResult.deleteAllResults()
}

/*
	Returns all results stored in the database
*/
function getResults() {
	return AggregationResult.get()
}

function createRawRequest (request) {
	return RawAggregationRequest.insert(request)
}

/*
	Inserts a new raw request and triggers processing raw aggregation requests to aggregation requests
*/
function insertNewRawRequest (request) {
	return RawAggregationRequest.insert(request)
	buildAggregationRequestsFromRaw()
}

/*
	Builds the initial aggregation request for a first user from all pending raw aggregation requests.
*/
function buildAggregationRequestsFromRaw () {
	let possibleUsers = getLastSeenUsers(10)
	// It is valid to have today as end date as it will be treated as today 00:00 o'clock
	let query = {"started": false, "end" : {$lte : (new Date()).(new Date()).toISOString().slice(0,10)}}
	let rawAggregationRequests = RawAggregationRequest.get(query)
	return Promise.all([rawAggregationRequests, possibleUsers]).then(res => {
		let requests = res[0]
		let users = res[1]
		let pendingInsertions = requests.map(request => AggregationRequest.insert(request, users))
		return Promise.all(pendingInsertions)
	}).then(insertedRequests => {
		let queries = insertedRequests.map(insertion => {"_id": insertion.rawRequestId})
		let update = {$set : {"started":true}}
		return Promise.all(queries.map(query => RawAggregationRequest.updateOne(query, update))
	})
}

/*
	Get all aggregation requests for the specified user that have not been served yet.
*/
function getOpenAggregationRequests(publicKey) {
	let query = {"publicKey":publicKey, "completed": false}
	return AggregationRequest.getAggregationRequests(query).then(requests => {
		for (request of requests) {
			request.serverId = request._id
			delete request._id
		}

		return Promise.resolve(result)
	})
}

function getLastSeenUsers (limit) {
		let oneDayBefore = (new Date()).getTime() - 1000 * 60 * 60 * 24
		let query = {"lastSeen": {$gt : oneDayBefore}}
		// -1 for descending order
		let sort = {"lastSeen" : -1}
	return User.get(query, sort).then(result => {
		result = result.map(function (ele) {return ele.publicKey})
		result.length = result.length > limit ? limit : result.length
		return Promise.resolve(result)
	})
}

/*
	Inserts a new aggregation request from a served previous aggregation request.
*/
function insertNewAggregationRequest(pk, data, original_request_id) {
	let query = {
			"_id": mongo.ObjectId(original_request_id),
			"completed": false
		}
	return AggregationRequest.get(query).then(original => {
		if (original.length != 1) {
			return Promise.reject("No corresponding request found")
		} else {
			data.publicKey = data.publicKey
			data.id = original_request_id
			let newRequest = AggregationRequest.fromExistingAggregationRequest(data)
			return AggregationRequest.insert(newRequest)
		}
	}).then(deletions => {
		let query = {"_id": mongo.ObjectId(original_request_id)}
		let update = {$set: { "completed": true}}
		return AggregationRequest.update(query, update)
	})
}

/*
	Inserts a new aggregation result from a served aggregation request.
	Also deletes all aggregation requests linked to the corresponding raw request.
*/
function insertNewAggregationResultAndDeleteRequests (pk, data, original_request_id) {
	let query = {
		"_id": mongo.ObjectId(original_request_id),
		"completed": false
	}
	return AggregationRequest.get(query).then(original => {
		if (!original) {
			return Promise.reject("No corresponding request found")
		} else {
			return AggregationResult.insert(data)
		}
	}).then(insertedResult => {
		rawRequestId = insertedResult.rawRequestId
		return AggregationRequest.deleteByRawId(rawRequestId)
	})
}

function cleanUp () {
	let query = {"completed": false, timestamp : {$lt : (new Date()).getTime() - 1000 * 60 * 60 * 18}}
	return AggregationRequest.get(query).then(requests => {
		let pendingRequests = []
		requests.forEach(ele => {
			if (ele.previousRequest) {
				let query = {"_id" : mongo.ObjectId(ele.previousRequest)}
				// Update user list and exclude not responding user!
				let update = {$set : {"completed": false}}
				AggregationRequest.update(query, update).then(res => {
					AggregationRequest.deleteById(ele._id)
				})
			} else {
				let query = {"_id": mongo.ObjectId(ele.rawRequestId)}
				let update = {$set : {"started": false}}
				RawAggregationRequest.update(query, update).then(res => {
					AggregationRequest.deleteById(ele._id)
				})
			}
		})
		return Promise.all(pendingRequests)
	}).then (() => {
		buildAggregationRequestsFromRaw()
	})
}

module.exports = {
	getRequests: getOpenAggregationRequests,
	insertNewRawRequest: insertNewRawRequest,
	insertNewAggregationAndDeleteRequest: insertNewAggregationAndDeleteRequest,
	insertNewRequest: insertNewRequest,
	deleteAllRequests: deletedRequests,
	deleteAllResults: deleteAllResults
	cleanUp: cleanUp,
	createRawRequest : createRawRequest,
	
}