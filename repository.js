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

function openDb () {
	return new Promise ((resolve, reject) => {
		mongoClient.connect(url, {"useNewUrlParser":true}, function (err, conn) {
			if (err) {
				reject(err)
			} else {
				resolve(conn)
			}
		})
	})
}

// Only for testing
function removeAllUsers(callback) {
	let connection = null
	let db = null
	 openDb()
	 	.then(conn => {
	 		connection = conn
	 		db = conn.db(DB)
	 		return db.collection(DB_USER).deleteMany({})
	 	}).then(res => {
	 		connection.close()
	 		callback()
	 	}).catch(err => {
	 		connection.close()
	 		throw err
	 	})
}

// Only for testing
function deleteAllRequests(callback) {
	let connection = null
	let db = null
	 openDb()
	 	.then(conn => {
	 		connection = conn
	 		db = conn.db(DB)
			database = conn.db(DB)
	 		return db.collection(DB_AGGREGATION_REQUESTS).deleteMany({})
	 	})
	 	.then(res => {
	 		connection.close()
	 		callback()
	 	}).catch(err => {
	 		connection.close()
	 		throw err
	 	})
}

function deleteAllResults (callback) {
	openDb().then(conn => {
		conn.db(DB).collection(DB_AGGREGATION_RESULTS).deleteMany({}, (err, res) => {
			conn.close()
			callback()
		})
	})
}

function insertNewRawRequest (request) {
	if (!request.type || !request.start || !request.end) {
		return Promise.reject("Missing required fields")
	}
	let connection = null

	return openDb().then(conn => {
		connection = conn
		db = conn.db(DB)
		return db.collection(DB_AGGREGATION_REQUESTS_RAW).insertOne(request)
	}).then(result => {
		if (result.ops[0]) {
			connection.close()
			return new Promise((reject, resolve) => {resolve(result.ops[0])})
		} else {
			connection.close()
			return new Promise((reject, resolve) => {reject("Unsuccessful insertion")})
		}
	}).catch(err => {
		return new Promise((reject, resolve) => {reject(err)})
	})
}

function createUser(pk) {
	let connection = null
	let db = null
	let pw = Math.random().toString(36)
	return openDb().then(conn => {
	 		connection = conn
	 		db = conn.db(DB)
	 	 	return db.collection(DB_USER).findOne({"pk":pk})
	}).then(foundUser => {
		if(!foundUser) {
	 		return db.collection(DB_USER).insertOne(User.fromObject({
	 			"pk": pk,
	 			"lastSignal": (new Date()).getTime(),
	 			"pw": crypto.createHash("sha256").update(pw).digest().toString()
	 		}))
		} else {
			return Promise.reject("`User ${pk} already present`")
		}
	}).then(user => {
		if (!user) {
			Promise.reject("Error creating user")
		} else {
			return Promise.resolve(user.ops[0])
		}
	}).catch(err => {
		console.error(err)
		return Promise.reject("Error in creating user")
	}).finally(() => {
		connection.close()
	})
}

function insertSampleAggregationRequest (request, callback) {
	let connection = null
	let db = null
	openDb().then(conn => {
 		connection = conn
 		db = conn.db(DB)
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
			tmp.pk = users.shift()
			tmp.nextUser = (users[0] == undefined ? null : users[0])
			tmp.users = users
			let synchronousKey = crypto.randomBytes(24).toString('base64')
			tmp.encryptionKey = crypto.publicEncrypt(tmp.pk, Buffer.from(synchronousKey, 'base64')).toString('base64')
			let cipher = crypto.createCipher("aes-128-ctr", synchronousKey)
			let crypted = cipher.update(JSON.stringify(request), 'utf8', 'base64')
			crypted += cipher.final('base64')
			tmp.encryptedRequest = crypted.toString('base64')
			return db.collection(DB_AGGREGATION_REQUESTS).insertOne(tmp)
		}
	}).then(res => {
		callback(true, res.ops[0])
	}).catch(err => {
		console.log("Could not create aggregation request. Could not retrieve possible users")
		console.log(err)
	}).finally(() => {
		connection.close()
	})
}

function getRequests(pk) {
	let connection = null
	let db = null
	return openDb().then(conn => {
 		connection = conn
 		db = conn.db(DB)
 		let query = {"pk":pk}
		return db.collection(DB_AGGREGATION_REQUESTS).find(query).toArray()
	}).then(result => {
		//TODO: Correct implementation
		for (entry of result) {
			entry.serverId = entry._id
		}

		connection.close()
		return new Promise((resolve, reject) => {resolve(result)})
	})
}


function getResults() {
	return openDb().then(conn => {
 		db = conn.db(DB)
		let result = db.collection(DB_AGGREGATION_RESULTS).find().toArray()
		conn.close()
		return result
	})
}

function getUsersPossibleForNewRequest () {
	let connection = null
	let db = null
	return openDb().then(conn => {
 		connection = conn
 		db = conn.db(DB)
		let oneDay = (new Date()).getTime() - 1000 * 60 * 60 * 24
		let query = {"lastSignal": {$gt : oneDay}}
		return db.collection(DB_USER).find(query).toArray()
	}).then(result => {
		result = result.map(function (ele) {return ele.pk})
		result.length = result.length > 10 ? 10 : result.length
		connection.close()
		return new Promise((resolve, reject) => {resolve(result)})
	})
}

function insertNewRequestAndDeleteOld(pk, data, original_request_id) {
	let connection = null
	let db = null
	return openDb().then(conn => {
		connection = conn
		db = conn.db(DB)
		return db.collection(DB_AGGREGATION_REQUESTS).findOne({"_id": mongo.ObjectId(original_request_id)})
	}).then(original => {
		if (!original) {
			return Promise.reject("No corresponding request found")
		} else {
			data.pk = data.nextUser
			data.nextUser = original.users.shift()
			data.users = original.users
			data.rawRequestId = original.rawRequestId
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
	}).catch(err => {
		Promise.reject(err)
	}).finally(() => {
		connection.close()
	})
}

function insertNewAggregationAndDeleteRequest (pk, data, original_request_id) {
	let connection = null
	let db = null
	return openDb().then(conn => {
		connection = conn
		db = conn.db(DB)
		return db.collection(DB_AGGREGATION_REQUESTS).findOne({"_id": mongo.ObjectId(original_request_id)})
	}).then(original => {
		if (!original) {
			return Promise.reject("No corresponding request found")
		} else {
			data.pk = data.nextUser
			data.nextUser = original.users.shift()
			data.users = original.users
			data.rawRequestId = original.rawRequestId
			delete data._id
			delete data.pw
			let result = {"timestamp":(new Date()).getTime(), "data": data}
			return db.collection(DB_AGGREGATION_RESULTS).insertOne(result)
		}
	}).then(insertedResult => {
		return db.collection(DB_AGGREGATION_REQUESTS).deleteMany({
			"rawRequestId" : insertedResult.ops[0].data.rawRequestId
		})
	}).catch(err => {
		console.log(err)
		Promise.reject(err)
	}).finally(() => {
		connection.close()
	})
}

function updateUserTimestamp (pk) {
	openDb().then(conn => {
 		db = conn.db(DB)
		let query = {"pk": pk}
		let update = {$set: { "lastSignal": (new Date()).getTime()}}
		db.collection(DB_USER).updateOne(query, update)
		conn.close()
	}).catch(err => {
		console.error(err)
	})
}

function authenticateUser(user, pw, callback) {
	openDb().then(conn => {
		let db = conn.db(DB)
		let query = {"pk": user, "pw": pw}
		let result = db.collection(DB_USER).findOne()
		conn.close()
		return result
	}).then (user => {
		if (!user) {
			callback(false)
		} else {
			callback(true)
		}
	}).catch(err => {
		console.log(err)
		callback(false)
	})
}

exports.createUser = createUser
exports.insertSampleAggregationRequest = insertSampleAggregationRequest
exports.getRequests = getRequests
exports.insertNewRequestAndDeleteOld = insertNewRequestAndDeleteOld
exports.insertNewAggregationAndDeleteRequest = insertNewAggregationAndDeleteRequest
exports.getResults = getResults
exports.getUsersPossibleForNewRequest = getUsersPossibleForNewRequest
exports.updateUserTimestamp = updateUserTimestamp
exports.removeAllUsers = removeAllUsers
exports.deleteAllRequests = deleteAllRequests
exports.authenticateUser = authenticateUser
exports.insertNewRawRequest = insertNewRawRequest
exports.deleteAllResults = deleteAllResults

module.exports = exports