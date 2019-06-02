var exports = {}

const mongo = require('mongodb')
const crypto = require("crypto")
const User = require('./user')
const RawAggregationRequest = require('./rawAggregationRequest')
const AggregationRequest = require('./aggregationRequest')
const url = process.env.PORT ? "mongodb+srv://admin:Xww8iodZGKOmPELi@data-opnoy.mongodb.net/test?retryWrites=true" : 
"mongodb://localhost:27017/"
const mongoClient = mongo.MongoClient

const DB = "app"
const DB_USER = "users"
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
	if (!request.type || !request.start || !request.end) {
		return Promise.reject("Missing required fields")
	}

	return RawAggregationRequest.insert(request)
}

function insertSampleAggregationRequest (request) {
	let successfullyInsertedRequest = null
	let insertedRequest = RawAggregationRequest.insert(request)
	let possibleUsers = getLastSeenUsers(10)
	return Promise.all([insertedRequest, possibleUsers]).then(res => {
		let insertedId = res[0].insertedId
		let users = res[1]
		return AggregationRequest.insert(rawRequest, users)
	}).then(insertedRequest => {
		let query = {"_id": insertedRequest.rawRequestId}
		let update = {$set : {"completed":true}}
		return db.collection(DB_AGGREGATION_REQUESTS_RAW).updateOne(query, update)
	})
}

function insertFromExistingRawRequest(requestId) {
	let successfullyInsertedRequest = null
	let request = null
	openDb().then(db => {
 		let query = {"_id": requestId}
 		let insertedRequest = db.collection(DB_AGGREGATION_REQUESTS_RAW).find(query).toArray()
 		let possibleUsers = getLastSeenUsers(10)
 		return Promise.all([insertedRequest, possibleUsers])
	}).then(res => {
		request = res[0][0]
		delete request._id
		delete request.completed
		let insertedId = res[0][0].insertedId
		let users = res[1]
		if (users.length == 0) {
			callback(false)
		} else {
			let tmp = {}
			tmp.rawRequestId = insertedId
			tmp.original_start = (new Date()).getTime()
			tmp.timestamp = (new Date()).getTime()
			tmp.previousRequest = null
			tmp.completed = false
			tmp.pk = users.shift()
			tmp.nextUser = (users[0] == undefined ? null : users[0])
			tmp.users = users
			let synchronousKey = crypto.randomBytes(24).toString('base64')
			let key = "-----BEGIN PUBLIC KEY-----\n" + tmp.pk + "\n-----END PUBLIC KEY-----"
			tmp.encryptionKey = crypto.publicEncrypt(tmp.pk, Buffer.from(synchronousKey, 'base64')).toString('base64')
			let cipher = crypto.createCipheriv("aes-128-ctr", synchronousKey)
			let crypted = cipher.update(JSON.stringify(request), 'utf8', 'base64')
			crypted += cipher.final('base64')
			tmp.encryptedRequest = crypted.toString('base64')
			return db.collection(DB_AGGREGATION_REQUESTS).insertOne(tmp)
		}
	}).then(insertedRequest => {
		successfullyInsertedRequest = insertedRequest
		let query = {"_id": insertedRequest.ops[0].rawRequestId}
		let update = {$set : {"completed":true}}
		return db.collection(DB_AGGREGATION_REQUESTS_RAW).updateOne(query, update)
	}).catch(err => {
		console.log("Could not create aggregation request. Could not retrieve possible users")
		console.log(err)
	})
}

function getRequests(pk) {
	return openDb().then(db => {
 		let query = {"pk":pk, "completed": false}
		return db.collection(DB_AGGREGATION_REQUESTS).find(query).toArray()
	}).then(result => {
		//TODO: Correct implementation
		for (entry of result) {
			entry.serverId = entry._id
		}

		return new Promise((resolve, reject) => {resolve(result)})
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

function insertNewRequestAndDeleteOld(pk, data, original_request_id) {
	return openDb().then(db => {
		return db.collection(DB_AGGREGATION_REQUESTS).findOne({
			"_id": mongo.ObjectId(original_request_id),
			"completed": false
		})
	}).then(original => {
		if (!original) {
			return Promise.reject("No corresponding request found")
		} else {
			data.pk = data.nextUser
			data.nextUser = original.users.shift()
			data.users = original.users
			data.rawRequestId = original.rawRequestId
			data.original_start = original.original_start
			data.timestamp = (new Date()).getTime()
			data.completed = false
			data.previousRequest = original_request_id
			delete data._id
			delete data.pw
			return db.collection(DB_AGGREGATION_REQUESTS).insertOne(data)
		}
	}).then(newRequest => {
		return db.collection(DB_AGGREGATION_REQUESTS).deleteMany({
			"rawRequestId" : newRequest.rawRequestId,
			$and: [
				{"_id": {$ne : newRequest._id}},
				{"_id": {$ne : original_request_id}}
			]
		})
	}).then(deletions => {
		let query = {"_id": mongo.ObjectId(original_request_id)}
		let update = {$set: { "completed": true}}
		return db.collection(DB_AGGREGATION_REQUESTS).updateOne(query, update)
	}).catch(err => {
		Promise.reject(err)
	})
}

function insertNewAggregationAndDeleteRequest (pk, data, original_request_id) {
	let rawRequestId = null
	return openDb().then(db => {
		return db.collection(DB_AGGREGATION_REQUESTS).findOne({
			"_id": mongo.ObjectId(original_request_id),
			"completed": false
		})
	}).then(original => {
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
		return db.collection(DB_AGGREGATION_REQUESTS).deleteMany({
			"rawRequestId" : insertedResult.ops[0].data.rawRequestId
		})
	}).then(deletedRequests => {
		return db.collection(DB_AGGREGATION_REQUESTS_RAW).deleteMany({
			"_id": rawRequestId
		})		
	}).catch(err => {
		console.log(err)
		Promise.reject(err)
	})
}

function cleanUp () {
	openDb().then(db => {
		let query = {"completed": false, timestamp : {$lt : (new Date()).getTime() - 1000 * 60 * 60 * 18}}
		return db.collection(DB_AGGREGATION_REQUESTS).find(query).toArray()
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
				let update = {$set : {"completed": false}}
				db.collection(DB_AGGREGATION_REQUESTS_RAW).updateOne(query, update).then(res => {
					pendingRequests.push(db.collection(DB_AGGREGATION_REQUESTS).deleteOne({"_id": ele._id}))
				})
			}
		})
		return Promise.all(pendingRequests)
	}).then (() => {
		let today = new Date()
		let month = (today.getMonth() < 10) ? "0" + today.getMonth() : today.getMonth()
		let day = (today.getDay() < 10) ? "0" + today.getDay() : today.getDay()
		let todayString = today.getFullYear() + "-" + month + "-" + day
		let query = {"completed": false, "end" : {$lt : todayString}}
		db.collection(DB_AGGREGATION_REQUESTS_RAW).find(query).toArray().then(res => {
			res.forEach(raw => {
				insertFromExistingRawRequest(raw._id)
			})
		})
	})
}

exports.insertSampleAggregationRequest = insertSampleAggregationRequest
exports.getRequests = getRequests
exports.insertNewRequestAndDeleteOld = insertNewRequestAndDeleteOld
exports.insertNewAggregationAndDeleteRequest = insertNewAggregationAndDeleteRequest
exports.getResults = getResults
exports.deleteAllRequests = deleteAllRequests
exports.insertNewRawRequest = insertNewRawRequest
exports.deleteAllResults = deleteAllResults
exports.openDb = openDb
exports.cleanUp = cleanUp

module.exports = exports