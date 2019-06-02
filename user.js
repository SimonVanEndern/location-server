const mongo = require('mongodb')
const url = process.env.PORT ? "mongodb+srv://admin:Xww8iodZGKOmPELi@data-opnoy.mongodb.net/test?retryWrites=true" : 
"mongodb://localhost:27017/"
const mongoClient = mongo.MongoClient

const DB = "app"
const DB_USER = "users"

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
	Out user model: Only those fields are inserted into the database
*/
function User(publicKey, lastSeen, password) {
	this.publicKey = publicKey
	this.lastSeen = lastSeen
	this.password = password
}

/*
	Creates a user according to the user model or return null if the model is not satisfied.
*/
function createUserIfPossible(user) {
	if (!user.publicKey || !user.lastSeen || !user.password) {
		return null
	} else {
		return new User(user.publicKey, user.lastSeen, user.password)
	}
}

/*
	Creates a user according to the user model or return null if the model is not satisfied.
*/
function createUserFromValuesIfPossible(publicKey, lastSeen, password) {
	return createUserIfPossible({
		"publicKey": publicKey,
		"lastSeen": lastSeen,
		"password": password
	})
}

/*
	Inserts a new user if the passed object satisfies the model requirements.
	If a user with the same publicKey is already present, no new user is inserted.
*/
function insertUser(user) {
	let userToInsert = createUserIfPossible(user)
	if (!userToInsert) {
		return Promise.reject("Could not create user, missing required fields")
	} else {
		return openDb().then(db => {
		 	 	return db.collection(DB_USER).findOne({"publicKey":userToInsert.publicKey})
		}).then(foundUser => {
			if(!foundUser) {
		 		return db.collection(DB_USER).insertOne(userToInsert)
			} else {
				return Promise.reject("`User ${user.publicKey} already present`")
			}
		}).then(user => {
			if (!user) {
				Promise.reject("Database error creating user")
			} else {
				return Promise.resolve(user.ops[0])
			}
		})
	}
}

/*
	Retrieve all users that match the mongoDB query object and sort them accordingly by the mongoDB sort object.
*/
function getUsers (query, sort) {
	return openDb().then(db => {
		return db.collection(DB_USER).find(query).sort(sort).toArray()
	})
}

/*
	Update one user that matches the mongoDB query object. The mongoDB update object specifies which values to update.
*/
function updateOneUser(query, update) {
	return openDb().then(db => {
		return db.collection(DB_USER).updateOne(query, update)
	})
}

/*
	Findn one user that matches the mongoDB query object
*/
function findOneUser(query) {
	return openDb().then(db => {
		return result = db.collection(DB_USER).findOne(query)
	})
}

// Only for testing. Removes all users.
function removeAllUsers() {
	return openDb().then(db => {
 		let result = db.collection(DB_USER).deleteMany({})
 		return result
 	})
}

module.exports = {
	removeAll : removeAllUsers,
	insert : insertUser,
	create : createUserFromValuesIfPossible,
	"get" : getUsers,
	update: updateOneUser,
	find: findOneUser
}