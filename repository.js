var exports = {}

const mongo = require('mongodb')
const crypto = require("crypto")
const User = require('./userSchema')
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
function deleteAllRequests(callback) {
	 openDb().then(db => {
	 		return db.collection(DB_AGGREGATION_REQUESTS).deleteMany({})
	 	})
	 	.then(res => {
	 		callback()
	 	}).catch(err => {
	 		throw err
	 	})
}

function deleteAllResults (callback) {
	openDb().then(db => {
		db.collection(DB_AGGREGATION_RESULTS).deleteMany({}, (err, res) => {
			callback()
		})
	})
}

function insertNewRawRequest (request) {
	if (!request.type || !request.start || !request.end) {
		return Promise.reject("Missing required fields")
	}

	return openDb().then(db => {
		return db.collection(DB_AGGREGATION_REQUESTS_RAW).insertOne(request)
	}).then(result => {
		if (result.ops[0]) {
			return new Promise((reject, resolve) => {resolve(result.ops[0])})
		} else {
			return new Promise((reject, resolve) => {reject("Unsuccessful insertion")})
		}
	}).catch(err => {
		return new Promise((reject, resolve) => {reject(err)})
	})
}

function insertSampleAggregationRequest (request, callback) {
	let successfullyInsertedRequest = null
	openDb().then(db => {
 		request.timestamp = (new Date()).getTime()
 		request.completed = false
 		let insertedRequest = db.collection(DB_AGGREGATION_REQUESTS_RAW).insertOne(request)
 		let possibleUsers = getUsersPossibleForNewRequest()
 		return Promise.all([insertedRequest, possibleUsers])
	}).then(res => {
		let insertedId = res[0].insertedId
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
			tmp.nextUser = users.shift()
			if (tmp.nextUser == undefined) {
				tmp.nextUser = null
			}
			tmp.users = users
			let synchronousKey = crypto.randomBytes(32).toString('base64')
			tmp.sync = synchronousKey
			let iv = Buffer.alloc(16) // iv should be 16
			iv = Buffer.from(Array.prototype.map.call(iv, () => {return Math.floor(Math.random() * 256)}))
			let keyString = "-----BEGIN PUBLIC KEY-----\n" + tmp.pk + "\n-----END PUBLIC KEY-----"
			let key = {"key": tmp.pk, "padding": crypto.constants.RSA_PKCS1_PADDING}
			tmp.encryptionKey = crypto.publicEncrypt(key, Buffer.from(synchronousKey, 'base64')).toString('base64')
			tmp.iv = iv.toString('base64')
			let cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(synchronousKey, 'base64'), iv)
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
	}).then(res => {
		callback(true, successfullyInsertedRequest.ops[0])
	}).catch(err => {
		console.log("Could not create aggregation request. Could not retrieve possible users")
		console.log(err)
	})
}

function insertFromExistingRawRequest(requestId) {
	let successfullyInsertedRequest = null
	let request = null
	openDb().then(db => {
 		let query = {"_id": requestId}
 		let insertedRequest = db.collection(DB_AGGREGATION_REQUESTS_RAW).find(query).toArray()
 		let possibleUsers = getUsersPossibleForNewRequest()
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

function getUsersPossibleForNewRequest () {
	return openDb().then(db => {
		let oneDay = (new Date()).getTime() - 1000 * 60 * 60 * 24
		let query = {"lastSignal": {$gt : oneDay}}
		let sort = {"lastSignal" : -1}
		return db.collection(DB_USER).find(query).sort(sort).toArray()
	}).then(result => {
		result = result.map(function (ele) {return ele.pk})
		result.length = result.length > 10 ? 10 : result.length
		return new Promise((resolve, reject) => {resolve(result)})
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
	console.log("Cleaning up")
	openDb().then(db => {
		let query = {"completed": false, timestamp : {$lt : (new Date()).getTime() - 1000 * 60 * 60 * 5}}
		return db.collection(DB_AGGREGATION_REQUESTS).find(query).toArray()
	}).then(requests => {
		console.log("Found " + requests.length + " stale requests")
		let pendingRequests = []
		requests.forEach(ele => {
			if (ele.previousRequest) {
				let query = {"_id" : mongo.ObjectId(ele.previousRequest)}
				let update = {$set : {
					"completed": false, 
					"nextUser": ele.nextUser,
					"users": ele.users, 
					"timestamp": (new Date()).getTime()
				}}
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
exports.getUsersPossibleForNewRequest = getUsersPossibleForNewRequest
exports.deleteAllRequests = deleteAllRequests
exports.insertNewRawRequest = insertNewRawRequest
exports.deleteAllResults = deleteAllResults
exports.openDb = openDb
exports.cleanUp = cleanUp

module.exports = exports