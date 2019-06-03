const mongo = require('mongodb')
const crypto = require("crypto")
const url = process.env.PORT ? "mongodb+srv://admin:Xww8iodZGKOmPELi@data-opnoy.mongodb.net/test?retryWrites=true" : 
"mongodb://localhost:27017/"
const mongoClient = mongo.MongoClient

const DB = "app"
const DB_AGGREGATION_REQUESTS = "aggregationRequests"

const VALID_REQUEST_TYPES = 
	[
		"steps",
		"stepsListing",
		"trajectory",
		"activity_0",
		"activity_1",
		"activity_2",
		"activity_7",
		"activity_8"
	]

let conn = null
let db = null

/*
	Opens a connection to the database.
	Connections are reused in mongoDB and should never be closed.
	This implementation is not completely Thread safe until the connection is open.
*/
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

/*
	Our aggregation request model: Only those fields are inserted into the database
*/
function AggregationRequest(rawRequestId, original_start, previousRequest, publicKey, nextUser, users, encryptionKey, iv, encryptedRequest) {
	this.rawRequestId = rawRequestId,
	this.original_start = original_start
	this.previousRequest = previousRequest
	this.publicKey = publicKey
	this.nextUser = nextUser
	this.users = users
	this.encryptionKey = encryptionKey
	this.iv = iv
	this.encryptedRequest = encryptedRequest
	this.timestamp = (new Date()).getTime()
	this.completed = false
}

/*
	Creates an aggregation request according to the model or returns null if the model is not satisfied.
*/
function createAggregationRequestIfPossible(request) {
	if (
		!request.rawRequestId || 
		!request.original_start || 
		(!request.previousRequest && request.previousRequest !== null) || 
		!request.publicKey || 
		(!request.nextUser && request.nextUser !== null) || 
		!request.users || 
		!request.encryptionKey || 
		!request.iv || 
		!request.encryptedRequest
	) {
		return null
	} else {
		return new AggregationRequest(
			request.rawRequestId, 
			request.original_start, 
			request.previousRequest, 
			request.publicKey, 
			request.nextUser, 
			request.users, 
			request.encryptionKey, 
			request.iv, 
			request.encryptedRequest
		)
	}
}

/*
	Creates an aggregation request according to the model or returns null if the model is not satisfied.
	Also returns null, if the userList is empty.
*/
function createAggregationRequestFromRawRequestIfPossible(raw, userList) {
	if (!userList || !userList.length || userList.length <= 1) {
		return null
	}

	let dataToEncrypt = toPlainRawRequest(raw)
	let encryptedRequest = encryptRequest(dataToEncrypt, userList[0])

	return createAggregationRequestIfPossible({
		"rawRequestId": raw.rawRequestId,
		"original_start": (new Date()).getTime(),
		"previousRequest": null,
		"publicKey" : userList.shift(),
		"nextuser": userList.length == 0 ? null : userList.shift(),
		"users" : userList,
		"encryptionKey": encryptedRequest.encryptionKey,
		"iv": encryptedRequest.iv,
		"encryptedRequest": encryptedRequest.encryptedRequest
	})
}

function createAggregationRequestFromAggregationRequestIfPossible (request) {
	return createAggregationRequestIfPossible({
		"rawRequestId": request.rawRequestId,
		"original_start": request.original_start,
		"previousRequest": request.id,
		"publicKey" : request.nextUser,
		"nextuser": request.users.length == 0 ? null : request.users.shift(),
		"users" : request.users,
		"encryptionKey": request.encryptionKey,
		"iv": request.iv,
		"encryptedRequest": request.encryptedRequest
	})
}

/*
	Creates an object of the aggregation request fields to be encrypted for the end user.
*/
function toPlainRawRequest (request) {
	return {
		"start": request.start,
		"end": request.end,
		"type": request.type,
		"n": request.n,
		"value": request.value,
		"valueList": request.valueList
	}
}

/*
	Creates a synchronous key,
	encryptes this key with the public key
	and encrypts the request with the synchronous key.
*/
function encryptRequest (request, publicKey) {
	// Create a synchronous key for hybrid encryption
	let synchronousKey = crypto.randomBytes(32).toString('base64')

	// Create an initialization vector for encryption of the request data
	let iv = Buffer.alloc(16)
	iv = Buffer.from(Array.prototype.map.call(iv, () => {return Math.floor(Math.random() * 256)})).toString('base64')

	// Encrypt the synchronous key with the public key
	let key = {"key": publicKey, "padding": crypto.constants.RSA_PKCS1_PADDING}
	let encryptionKey = crypto.publicEncrypt(key, Buffer.from(synchronousKey, 'base64')).toString('base64')
		
	// Encrypt the request with the synchronous key
	let cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(synchronousKey, 'base64'), iv)
	let crypted = cipher.update(JSON.stringify(request), 'utf8', 'base64')
	crypted += cipher.final('base64')
	crypted = crypted.toString('base64')
	
	return {
		"encryptionKey": encryptionKey,
		"iv": iv,
		"encryptedRequest": crypted
	}
}

/*
	Inserts a new aggregation request if the passed object satisfies the model requirements.
*/
function insertAggregationRequest(request, userList) {
	let requestToInsert = createAggregationRequestFromRawRequestIfPossible(request, userList)
	if (!requestToInsert) {
		return Promise.reject("Could not create aggregation request, missing or wrong fields")
	} else {
		return openDb().then(db => {
		 	 return db.collection(DB_AGGREGATION_REQUESTS).insertOne(requestToInsert)
		}).then(res => {
			return Promise.resolve(res.ops[0])
		})
	}
}

/*
	Retrieve all aggregation requests that match the mongoDB query object.
*/
function getAggregationRequests (query) {
	return openDb().then(db => {
		return db.collection(DB_AGGREGATION_REQUESTS).find(query).toArray()
	})
}

/*
	Update one aggregation request that matches the mongoDB query object. 
	The mongoDB update object specifies which values to update.
*/
function updateOneAggregationRequest(query, update) {
	return openDb().then(db => {
		return db.collection(DB_AGGREGATION_REQUESTS).updateOne(query, update)
	})
}

function deleteByRawId(rawRequestId) {
	return db.collection(DB_AGGREGATION_REQUESTS).deleteMany({
		"rawRequestId": rawRequestId
	})	
}

function deleteById(requestid) {
	return db.collection(DB_AGGREGATION_REQUESTS).deleteMany({
		"_id": requestid
	})	
}

// Only for testing
function deleteAllRequests() {
	return openDb().then(db => {
 		return db.collection(DB_AGGREGATION_REQUESTS).deleteMany({})
 	})
}

module.exports = {
	insert : insertAggregationRequest,
	create : createAggregationRequestFromRawRequestIfPossible,
	fromExistingAggregationRequest : createAggregationRequestFromAggregationRequestIfPossible
	"get": getAggregationRequests,
	update: updateOneAggregationRequest,
	deleteByRawId: deleteByRawId,
	deleteById: deleteById
	deleteAllRequests: deleteAllRequests
}