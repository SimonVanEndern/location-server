const mongo = require('mongodb')
const crypto = require("crypto")
const User = require('./userSchema')
const url = process.env.PORT ? "mongodb+srv://admin:Xww8iodZGKOmPELi@data-opnoy.mongodb.net/test?retryWrites=true" : 
"mongodb://localhost:27017/"
const mongoClient = mongo.MongoClient

const DB = "app"
const DB_USER = "users"

function openDb () {
	return mongoClient.connect(url, {"useNewUrlParser":true})
}

// Only for testing
function removeAllUsers() {
	return openDb().then(conn => {
 		db = conn.db(DB)
 		let result = db.collection(DB_USER).deleteMany({})
 		conn.close()
 		return result
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

function updateUserTimestamp (pk) {
	let connection = null
	openDb().then(conn => {
		connection = conn
 		db = conn.db(DB)
		let query = {"pk": pk}
		let update = {$set: { "lastSignal": (new Date()).getTime()}}
		return db.collection(DB_USER).updateOne(query, update)
	}).then(res => {
		connection.close()
	}).catch(err => {
		console.error(err)
	})
}

function authenticateUser(user, pw) {
	return openDb().then(conn => {
		let db = conn.db(DB)
		let query = {"pk": user, "pw": pw}
		return result = db.collection(DB_USER).findOne()
	}).then (user => {
		if (!user) {
			return Promise.reject("Not authenticated")
		} else {
			return Promise.resolve(user)
		}
	})
}

module.exports = {
	createUser : createUser,
	authenticateUser : authenticateUser,
	removeAllUsers : removeAllUsers,
	updateUserTimestamp : updateUserTimestamp,
	getUsersPossibleForNewRequest: getUsersPossibleForNewRequest
}