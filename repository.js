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

exports.insertNewUser = insertNewUser

module.exports = exports