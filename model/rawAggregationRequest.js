const mongo = require('mongodb')
const url = process.env.PORT ? "mongodb+srv://admin:Xww8iodZGKOmPELi@data-opnoy.mongodb.net/test?retryWrites=true" : 
"mongodb://localhost:27017/"
const mongoClient = mongo.MongoClient

const DB = "app"
const DB_AGGREGATION_REQUESTS_RAW = "rawAggregationRequests"

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
	Our raw aggregation request model: Only those fields are inserted into the database
*/
function RawAggregationRequest(start, end, type) {
	this.start = start
	this.end = end
	this.type = type
	this.n = 0
	this.value = 0
	this.valueList = []
	this.timestamp = (new Date()).getTime()
	this.started = false
}

/*
	Creates a new raw aggregation request according to the model or returns null if the model is not satisfied.
*/
function createRawAggregationRequestIfPossible(request) {
	if (
		!request.start || 
		isNaN(new Date(request.start)) ||
		!request.end || 
		isNaN(new Date(request.end)) ||
		!request.type ||
		!VALID_REQUEST_TYPES.includes(request.type)
	) {
		return null
	} else {
		return new RawAggregationRequest(request.start, request.end, request.type)
	}
}

/*
	Creates a raw aggregation request according to the model or returns null if the model is not satisfied.
*/
function createRawAggregationRequestFromValuesIfPossible(start, end, type) {
	return createRawAggregationRequestIfPossible({
		"start": start,
		"end": end,
		"type": type
	})
}

/*
	Inserts a new raw aggregation request if the passed object satisfies the model requirements.
*/
function insertRawAggregationRequest(request) {
	let requestToInsert = createRawAggregationRequestIfPossible(request)
	if (!requestToInsert) {
		return Promise.reject("Could not create raw request, missing or wrong fields")
	} else {
		return openDb().then(db => {
		 	 return db.collection(DB_AGGREGATION_REQUESTS_RAW).insertOne(requestToInsert)
	 	}).then(res => {
	 	 	return Promise.resolve(res.ops[0])
	 	})
	}
}

/*
	Retrieve all raw aggregation requests that match the mongoDB query object.
*/
function getRawAggregationRequests (query) {
	query = query ? query : {}
	if (query._id) {
		query._id =  mongo.ObjectId(query._id)
	}
	return openDb().then(db => {
		return db.collection(DB_AGGREGATION_REQUESTS_RAW).find(query).toArray()
	})
}

/*
	Update one raw aggregation request that matches the mongoDB query object. 
	The mongoDB update object specifies which values to update.
*/
function updateOneRawAggregationRequest(query, update) {
	if (!query) {
		return Promise.reject("no update without query")
	}
	query._id = query._id ? mongo.ObjectId(query._id) : query._id
	return openDb().then(db => {
		return db.collection(DB_AGGREGATION_REQUESTS_RAW).updateOne(query, update)
	})
}

// Only for testing. Removes all users.
function deleteAllRawRequests() {
	return openDb().then(db => {
 		let result = db.collection(DB_AGGREGATION_REQUESTS_RAW).deleteMany({})
 		return result
 	})
}

module.exports = {
	fromValues : createRawAggregationRequestFromValuesIfPossible,
	insert : insertRawAggregationRequest,
	update: updateOneRawAggregationRequest,
	"get": getRawAggregationRequests,
	deleteAll: deleteAllRawRequests
}