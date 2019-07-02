const User = require('../model/user')
const RawAggregationRequest = require('../model/rawAggregationRequest')
const AggregationRequest = require('../model/aggregationRequest')
const AggregationResult = require('../model/aggregationResult')

// Only for testing
function deleteAllRequests() {
	return AggregationRequest.deleteAll()
}

// Only for testing
function deleteAllResults () {
	return AggregationResult.deleteAll()
}

//Only for testing
function deleteAllRawRequests () {
	return RawAggregationRequest.deleteAll()
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
	return RawAggregationRequest.insert(request).then(res => {
		return buildAggregationRequestsFromRaw()
	})
}

/*
	Builds the initial aggregation request for a first user from all pending raw aggregation requests.
*/
function buildAggregationRequestsFromRaw () {
	let possibleUsers = getLastSeenUsers(10)
	// It is valid to have today as end date as it will be treated as today 00:00 o'clock
	let query = {"started": false, "end" : {$lte : (new Date()).toISOString().slice(0,10)}}
	let rawAggregationRequests = RawAggregationRequest.get(query)
	return Promise.all([rawAggregationRequests, possibleUsers]).then(res => {
		let requests = res[0]
		let users = res[1]
		let pendingInsertions = requests.map(request => {
			let requestToInsert = AggregationRequest.fromRawRequest(request, users)
			return AggregationRequest.insert(requestToInsert)
		})
		return Promise.all(pendingInsertions)
	}).then(insertedRequests => {
		let queries = insertedRequests.map(insertion => {return {"_id": insertion.rawRequestId}})
		let update = {$set : {"started":true}}
		return Promise.all(queries.map(query => RawAggregationRequest.update(query, update))).then(updated => {
			return insertedRequests.length == 1 ? insertedRequests[0] : insertedRequests
		})
	})
}

/*
	Get all aggregation requests for the specified user that have not been served yet.
*/
function getOpenAggregationRequests(publicKey) {
	let query = {"publicKey":publicKey, "completed": false}
	return AggregationRequest.get(query).then(requests => {
		for (request of requests) {
			request.serverId = request._id
			delete request._id
		}

		return Promise.resolve(requests)
	})
}

/*
	Retrieves the most recently active @limit users from the database.
	The list is sorted in descending order regarding the lastSeen timestamp of the user.
*/
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
function insertNewAggregationRequest(request) {
	let query = {
			"_id": request.serverId,
			"completed": false
		}
	return AggregationRequest.get(query).then(original => {
		if (original.length != 1) {
			return Promise.reject("No corresponding request found")
		} else {
			request.users = original[0].users
			request.started_at = original[0].started_at
			request.rawRequestId = original[0].rawRequestId
			let newRequest = AggregationRequest.fromAggregationRequest(request)
			return AggregationRequest.insert(newRequest)
		}
	}).then(inserted => {
		let query = {"_id": request.serverId}
		let update = {$set: { "completed": true}}
		return AggregationRequest.update(query, update).then(res => {
			return Promise.resolve(inserted)
		})
	})
}

/*
	Inserts a new aggregation result from a served aggregation request.
	Also deletes all aggregation requests linked to the corresponding raw request.
*/
function insertNewAggregationResultAndDeleteRequests (request) {
	let query = {
		"_id": request.serverId,
		"completed": false
	}
	return AggregationRequest.get(query).then(original => {
		if (original.length != 1) {
			return Promise.reject("No corresponding request found")
		} else {
			request.test = "TEST"
			request.rawRequestId = original[0].rawRequestId
			request.started_at = original[0].started_at
			return AggregationResult.insert(request)
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
				let query = {"_id" :  ele.previousRequest}
				// Update user list and exclude not responding user!
				let update = {$set : {"completed": false}}
				AggregationRequest.update(query, update).then(res => {
					AggregationRequest.deleteById(ele._id)
				})
			} else {
				let query = {"_id":  ele.rawRequestId}
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
	getResults: getResults,
	insertNewAggregationRequest: insertNewAggregationRequest,
	insertNewAggregationResultAndDeleteRequests: insertNewAggregationResultAndDeleteRequests,
	insertNewRawRequest: insertNewRawRequest,
	deleteAllRequests: deleteAllRequests,
	deleteAllResults: deleteAllResults,
	cleanUp: cleanUp,
	createRawRequest : createRawRequest,
	deleteAllRawRequests: deleteAllRawRequests
}