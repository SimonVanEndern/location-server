var exports = {}

const mongo = require('mongodb')
const crypto = require("crypto")
const url = process.env.PORT ? "mongodb+srv://admin:Xww8iodZGKOmPELi@data-opnoy.mongodb.net/test?retryWrites=true" : 
"mongodb://localhost:27017/"
const mongoClient = mongo.MongoClient

const DB = "app"
const DB_USER = "users"
const DB_AGGREGATION_REQUESTS = "aggregationRequests"
const DB_AGGREGATION_RESULTS = "aggregationResults"

function opendDb () {
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
	 opendDb()
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
	 opendDb()
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

function insertNewUser(pk, callbackFunction) {
	let connection = null
	let db = null
	let pw = Math.random().toString(36)
	 opendDb().then(conn => {
	 		connection = conn
	 		db = conn.db(DB)
	 	 	return db.collection(DB_USER).findOne({"pk":pk})
	 	 }).then(foundUser => {
	 		if(!foundUser) {
		 		let user = {
		 			"pk": pk, 
		 			"lastSignal": (new Date()).getTime(),
					"pw": crypto.createHash("sha256").update(pw).digest().toString()
				}
		 		return db.collection(DB_USER).insertOne(user)
	 		} else {
	 			throw "`User ${pk} already present`"
	 		}
		 }).then(res => {
	 		connection.close()
			callbackFunction(true, pw)
 		}).catch(err => {
 			console.error(err)
	 		callbackFunction(false)
	 	}).finally(() => {
	 		connection.close()
 		})
}

function insertSampleAggregationRequest (request, callback) {
	let connection = null
	let db = null
	opendDb().then(conn => {
 		connection = conn
 		db = conn.db(DB)
		return getUsersPossibleForNewRequest()
	}).then(users => {
		if (users.length == 0) {
			callback(false)
		} else {
			let tmp = {}
			tmp.pk = users.shift()
			tmp.nextUser = (users[0] == undefined ? null : users[0])
			tmp.users = users
			let synchronousKey = crypto.randomBytes(24).toString('base64')
			tmp.encryptionKey = crypto.publicEncrypt(tmp.pk, Buffer.from(synchronousKey, 'base64')).toString('base64')
			let cipher = crypto.createCipher("aes-128-ctr", synchronousKey)
			let crypted = cipher.update(JSON.stringify(request), 'utf8', 'base64')
			crypted += cipher.final('base64')
			tmp.encryptedRequest = crypted.toString('base64')
			return db.collection("aggregationRequests").insertOne(tmp)
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
	return opendDb().then(conn => {
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
	return opendDb().then(conn => {
 		db = conn.db(DB)
		let result = db.collection(DB_AGGREGATION_RESULTS).find().toArray()
		db.close()
		return result
	})
}

function getUsersPossibleForNewRequest () {
	let connection = null
	let db = null
	return opendDb().then(conn => {
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
	opendDb().then(conn => {
 		connection = conn
 		db = conn.db(DB)
		return db.collection(DB_AGGREGATION_REQUESTS).findOne({"_id": mongo.ObjectId(original_request_id)})
	}).then(res => {
		if (res == null) {
			console.log("No document for request id: " + original_request_id)
		} else {
			console.log("Document exists...")
			data.pk = data.nextUser
			data.nextUser = res.users.shift()
			data.users = res.users
			return db.collection("aggregationRequests").insertOne(data)
		}
	}).then(res => {
		db.collection(DB_AGGREGATION_REQUESTS).deleteOne({"_id": mongo.ObjectId(original_request_id)})
		connection.close()
	})
}

function insertNewAggregationAndDeleteRequest (original_request_id, data) {
	mongoClient.connect(url, {"useNewUrlParser":true}, function (err, db) {
		if (err) {
			throw err
		} else {
			let app = db.db("app")
			let request = {"timestamp":(new Date()).getTime(), "data": data}
			app.collection("aggregationRequests").findOne({"_id": mongo.ObjectId(original_request_id)}, function (err, res) {
				if (err) {
					throw err
				} else {
					if (res == null) {
						return
					} else {
						app.collection("aggregationResults").insertOne(request, function (err, res) {
							if (err) {
								throw err
							} else {
								app.collection("aggregationRequests").deleteOne({"_id": mongo.ObjectId(original_request_id)}, function (err, res) {
									if (err) {
										throw err
									}
								})
							}
						})
					}
				}
			})
		}
	})
}

function updateUserTimestamp (pk) {
	opendDb().then(conn => {
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
	opendDb().then(conn => {
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

exports.insertNewUser = insertNewUser
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

module.exports = exports