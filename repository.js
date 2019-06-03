const mongo = require('mongodb')
const User = require('./user')
const RawAggregationRequest = require('./rawAggregationRequest')
const AggregationRequest = require('./aggregationRequest')
const url = process.env.PORT ? "mongodb+srv://admin:Xww8iodZGKOmPELi@data-opnoy.mongodb.net/test?retryWrites=true" : 
"mongodb://localhost:27017/"
const mongoClient = mongo.MongoClient

const DB = "app"
const DB_AGGREGATION_REQUESTS_RAW = "rawAggregationRequests"
const DB_AGGREGATION_REQUESTS = "aggregationRequests"
const DB_AGGREGATION_RESULTS = "aggregationResults"

let conn = null
let db = null

async function openDb () {
	if (!conn) {
		conn = mongoClient.connect(url, {"useNewUrlParser":true})
	}
	if (!db) {
		return conn.then(conn => {
			db = conn.db(DB)
			return db
		})
	}
	return Promise.resolve(db)
}

// Only for testing
function deleteAllRequests() {
	return openDb().then(db => {
 		return db.collection(DB_AGGREGATION_REQUESTS).deleteMany({})
 	})
}

// Only for testing
function deleteAllResults () {
	return openDb().then(db => {
		return db.collection(DB_AGGREGATION_RESULTS).deleteMany({})
	})
}

function insertNewRawRequest (request) {
	return RawAggregationRequest.insert(request)
	buildAggregationRequestsFromRaw()
}

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
		return Promise.all(queries.map(query => db.collection(DB_AGGREGATION_REQUESTS_RAW).updateOne(query, update))
	})
}

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

function getResults() {
	return openDb().then(db => {
		return db.collection(DB_AGGREGATION_RESULTS).find().toArray()
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

function insertNewRequest(pk, data, original_request_id) {
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

function insertNewAggregationAndDeleteRequests (pk, data, original_request_id) {
	let query = {
			"_id": mongo.ObjectId(original_request_id),
			"completed": false
		}
	return AggregationRequest.get(query).then(original => {
		if (!original) {
			return Promise.reject("No corresponding request found")
		} else {
			data.pk = data.nextUser
			data.nextUser = original.users.shift()
			data.users = original.users
			data.original_start = original.original_start
			data.rawRequestId = original.rawRequestId
			delete data._id
			delete data.pw
			let result = {"timestamp":(new Date()).getTime(), "data": data}
			return db.collection(DB_AGGREGATION_RESULTS).insertOne(result)
		}
	}).then(insertedResult => {
		rawRequestId = insertedResult.ops[0].data.rawRequestId
		return AggregationRequest.deleteByRawId(rawRequestId)
	})
}

function cleanUp () {
	openDb().then(db => {
		let query = {"completed": false, timestamp : {$lt : (new Date()).getTime() - 1000 * 60 * 60 * 18}}
		return AggregationRequest.get(query)
	}).then(requests => {
		let pendingRequests = []
		requests.forEach(ele => {
			if (ele.previousRequest) {
				let query = {"_id" : mongo.ObjectId(ele.previousRequest)}
				// Update user list and exclude not responding user!
				let update = {$set : {"completed": false}}
				db.collection(DB_AGGREGATION_REQUESTS).updateOne(query, update).then(res => {
					pendingRequests.push(db.collection(DB_AGGREGATION_REQUESTS).deleteOne({"_id": ele._id}))
				})
			} else {
				let query = {"_id": mongo.ObjectId(ele.rawRequestId)}
				let update = {$set : {"started": false}}
				db.collection(DB_AGGREGATION_REQUESTS_RAW).updateOne(query, update).then(res => {
					pendingRequests.push(db.collection(DB_AGGREGATION_REQUESTS).deleteOne({"_id": ele._id}))
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
	openDb: openDb,
	cleanUp: cleanUp
}