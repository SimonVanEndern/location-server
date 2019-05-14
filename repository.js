var exports = {}

const mongo = require('mongodb')
const url = "mongodb://localhost:27017/"
const mongoClient = mongo.MongoClient

function insertNewUser(pk) {
	 mongoClient.connect(url,{"useNewUrlParser":true}, function (err, db) {
	 	if (err) {
	 		throw err
	 	} else {
	 		let app = db.db("app")
	 		let user = {"pk": pk, "lastSignal": (new Date()).getTime()}
	 		app.collection("users").insertOne(user, function (err, res) {
	 			if (err) {
	 				throw err
	 			} else {
	 				console.log("Inserted new user with pk=" + pk + " and id=" + res.insertedId)
	 				db.close()
	 			}
	 		})
	 	}
	 })
}

function insertSampleAggregationRequest () {
	mongoClient.connect(url, {"useNewUrlParser":true}, function (err, db) {
		if (err) {
			throw err
		} else {
			let app = db.db("app")
			let aggregationRequest = {"pk": "xyz", "data": "01000101010101"}
			app.collection("aggregationRequests").insertOne(aggregationRequest, function (err, res) {
				if (err) {
					throw err
				} else {
					console.log("Inserted sample aggregation with pk=" + aggregationRequest.pk + " and id=" + res.insertedId)
					db.close()
				}
			})
		}
	})
}

function getRequests(pk, callback) {
	mongoClient.connect(url, {"useNewUrlParser":true}, function (err, db) {
		if (err) {
			throw err
		} else {
			let app = db.db("app")
			let query = {"pk":pk}
			app.collection("aggregationRequests").find(query).toArray(function (err, result) {
				if (err) {
					throw err
				} else {
					console.log(result)
					callback(result, undefined)
					db.close()
				}
			})
		}
	})	
}

exports.insertNewUser = insertNewUser
exports.insertSampleAggregationRequest = insertSampleAggregationRequest
exports.getRequests = getRequests

module.exports = exports