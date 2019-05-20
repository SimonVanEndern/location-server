var exports = {}

const mongo = require('mongodb')
const url = process.env.PORT ? "mongodb+srv://admin:Xww8iodZGKOmPELi@data-opnoy.mongodb.net/test?retryWrites=true" : 
"mongodb://localhost:27017/"
const mongoClient = mongo.MongoClient

// Only for testing
function removeAllUsers(callback) {
	mongoClient.connect(url,{"useNewUrlParser":true}, function (err, db) {
	 	if (err) {
	 		throw err
	 	} else {
	 		let app = db.db("app")
	 		app.collection("users").deleteMany({}, function (err, res) {
	 			if (err) {
	 				throw err
	 			}
	 			callback()
	 		})
	 	}
	 })
}

function deleteAllRequests(callback) {
	mongoClient.connect(url,{"useNewUrlParser":true}, function (err, db) {
	 	if (err) {
	 		throw err
	 	} else {
	 		let app = db.db("app")
	 		app.collection("aggregationRequests").deleteMany({}, function (err, res) {
	 			if (err) {
	 				throw err
	 			} else {
	 				callback()
	 			}
	 		})
	 	}
	 })
}

function insertNewUser(pk, callbackFunction) {
	 mongoClient.connect(url,{"useNewUrlParser":true}, function (err, db) {
	 	if (err) {
	 		throw err
	 	} else {
	 		let app = db.db("app")
	 		app.collection("users").findOne({"pk":pk}, function (err, res) {
	 			if (!res) {
	 				console.log(res)
			 		let user = {"pk": pk, "lastSignal": (new Date()).getTime()}
			 		app.collection("users").insertOne(user, function (err, res) {
			 			if (err) {
			 				throw err
			 			} else {
			 				console.log("Inserted new user with pk=" + pk + " and id=" + res.insertedId)
			 				callbackFunction(true)
			 				db.close()
			 			}
			 		})

	 			} else {
	 				callbackFunction(false)
	 				console.log (`User ${pk} already present`)
	 			}
	 		})
	 	}
	 })
}

function insertSampleAggregationRequest (request, callback) {
	mongoClient.connect(url, {"useNewUrlParser":true}, function (err, db) {
		if (err) {
			console.log("Error in connecting ...")
			throw err
		} else {
			let app = db.db("app")
			//let aggregationRequest = {"pk": pk, "data": "01000101010101"}
			console.log(request)
			getUsersPossibleForNewRequest().then(users => {
				request.pk = users.shift()
				request.nextUser = request.pk
				request.users = users
				app.collection("aggregationRequests").insertOne(request, function (err, res) {
					if (err) {
						console.log("Error in inserting one")
						throw err
					} else {
						console.log("Inserted sample aggregation with pk=" + request.pk + " and id=" + res.insertedId)
						db.close()
						callback(true)
					}
				})
			}).catch(err => {
				console.log("Could not create aggregation request. Could not retrieve possible users")
			})
		}
	})
}

function getRequests(pk) {
	let getRequests = (pk) => {
		return new Promise((resolve, reject) => {
			mongoClient.connect(url, {"useNewUrlParser":true}, function (err, db) {
				if (err) {
					reject(err)
				} else {
					let app = db.db("app")
					let query = {"pk":pk}
					console.log("Query: ")
					console.log(query)
					app.collection("aggregationRequests").find(query).toArray(function (err, result) {
						if (err) {
							throw err
						} else {
							//TODO: Correct implementation
							for (entry of result) {
								//entry.nextUser = "ForNextUserTest"
								entry.serverId = entry._id
							}

							console.log("Found requests: ")
							console.log(result)
							resolve(result)
							db.close()
						}
					})
				}
			})
		})
	}
	return getRequests(pk)
}


function getResults() {
	let getRequests = () => {
		return new Promise((resolve, reject) => {
			mongoClient.connect(url, {"useNewUrlParser":true}, function (err, db) {
				if (err) {
					reject(err)
				} else {
					let app = db.db("app")
					app.collection("aggregationResults").find().toArray(function (err, result) {
						if (err) {
							throw err
						} else {
							console.log(result)
							resolve(result)
							db.close()
						}
					})
				}
			})
		})
	}
	return getRequests()
}

function getUsersPossibleForNewRequest () {
	let getUsers = () => {
		return new Promise((resolve, reject) => {
			mongoClient.connect(url, {"useNewUrlParser":true}, function (err, db) {
				if (err) {
					reject(err)
				} else {
					let app = db.db("app")
					let oneDay = (new Date()).getTime() - 1000 * 60 * 60 * 24
					let query = {"lastSignal": {$gt : oneDay}}
					app.collection("users").find(query).toArray(function (err, result) {
						if (err) {
							reject(err)
						} else {
							result = result.map(function (ele) {return ele.pk})
							result.length = result.length > 10 ? 10 : result.length
							console.log(result)
							resolve(result)
							db.close()
						}
					})
				}
			})
		})
	}
	return getUsers()
}

function insertNewRequestAndDeleteOld(pk, data, original_request_id) {
	mongoClient.connect(url, {"useNewUrlParser":true}, function (err, db) {
		if (err) {
			throw err
		} else {
			let app = db.db("app")
			//let request = {"pk":pk, "data":data}
			app.collection("aggregationRequests").findOne({"_id": mongo.ObjectId(original_request_id)}, function (err, res) {
				if (err) {
					throw err
				} else {
					if (res == null) {
						console.log("No document for request id: " + original_request_id)
						return
					} else {
						console.log("Document exists...")
						data.pk = data.nextUser
						data.nextUser = res.users.shift()
						data.users = res.users
						app.collection("aggregationRequests").insertOne(data, function (err, res) {
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
	mongoClient.connect(url, {"useNewUrlParser": true}, function (err, db) {
		if (err) {
			throw err
		} else {
			let app = db.db("app")
			let query = {"pk": pk}
			let update = {$set: { "lastSignal": (new Date()).getTime()}}
			app.collection("users").updateOne(query, update, function (err, res) {
				if (err) {
					throw err
				} else {
					console.log("updated user " + pk)
				}
			})
		}
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

module.exports = exports