const mongo = require('mongodb')
const url = process.env.PORT ? "mongodb+srv://admin:Xww8iodZGKOmPELi@data-opnoy.mongodb.net/test?retryWrites=true" : 
"mongodb://localhost:27017/"
const mongoClient = mongo.MongoClient

const DB = "app"
const DB_AGGREGATION_RESULTS = "aggregationResults"

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
	Our aggregation result model: Only those fields are inserted into the database
*/
function AggregationResult(start, end, n, value, valueList, type, rawRequestId, started_at) {
	this.start = start
	this.end = end
	this.n = n
	this.value = value
	this.valueList = valueList
	this.type = type
	this.rawRequestId = rawRequestId
	this.started_at = started_at
	this.timestamp = (new Date()).getTime()
}

/*
	Creates an aggregation result according to the model or returns null if the model is not satisfied.
*/
function createAggregationResultIfPossible(request) {
	if (
		!request.start || 
		!request.end || 
		(!request.n && request.n !== 0) || 
		(!request.value && request.value !== 0) || 
		!request.valueList || 
		!request.type || 
		!request.rawRequestId || 
		!request.started_at
	) {
		return null
	} else {
		return new AggregationResult(
			request.start, 
			request.end, 
			request.n, 
			request.value, 
			request.valueList, 
			request.type, 
			request.rawRequestId, 
			request.started_at 
		)
	}
}

/*
	Inserts a new aggregation result if the passed object satisfies the model requirements.
*/
function insertAggregationResult(request) {
	let resultToInsert = createAggregationResultIfPossible(request)
	if (!resultToInsert) {
		return Promise.reject("Could not create aggregation request, missing or wrong fields")
	} else {
		return openDb().then(db => {
		 	 return db.collection(DB_AGGREGATION_RESULTS).insertOne(resultToInsert)
		}).then(res => {
			return Promise.resolve(res.ops[0])
		})
	}
}

/*
	Retrieve all aggregation results that match the mongoDB query object.
*/
function getAggregationResults (query) {	
	query = query ? query : {}
	if (query._id) {
		query._id =  mongo.ObjectId(query._id)
	}
	return openDb().then(db => {
		return db.collection(DB_AGGREGATION_RESULTS).find(query).toArray()
	})
}

// For testing ony
function deleteAllResults () {
	return openDb().then(db => {
		return db.collection(DB_AGGREGATION_RESULTS).deleteMany({})
	})
}

module.exports = {
	fromObject : createAggregationResultIfPossible,
	insert : insertAggregationResult,
	"get": getAggregationResults,
	deleteAll: deleteAllResults
}