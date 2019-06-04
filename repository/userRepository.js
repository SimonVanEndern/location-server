const crypto = require("crypto")
const User = require('../model/user')

// Only for testing. Removes all users from the database.
function deleteAllUsers() {
	return User.deleteAll()
}

/*
	Inserts a new user into the database if there is not already a user with the specified public key.
*/
function createUser(publicKey) {
	let random = Math.random().toString(36)
	let password = crypto.createHash("sha256").update(random).digest().toString()
	let lastSeen = (new Date()).getTime()
	let user = User.fromValues(publicKey, lastSeen, password)

	return User.insert(user).then(insertedUser => {
		insertedUser.password = random
		return Promise.resolve(insertedUser)
	})
}

/*
	Updates the "last seen" timestamp of the user identified by the public key.
*/
function updateUserTimestamp (publicKey) {
	let query = {"publicKey": publicKey}
	let update = {$set: { "lastSeen": (new Date()).getTime()}}
	return User.update(query, update)
}

/*
	Authenticates a user if possible.
*/
function authenticateUser(publicKey, password) {
	let query = {"publicKey": publicKey, "password": password}
	return User.get(query).then (users => {
		if (users.length != 1) {
			return Promise.reject("Not authenticated")
		} else {
			return Promise.resolve()
		}
	})
}

module.exports = {
	createUser : createUser,
	authenticateUser : authenticateUser,
	deleteAllUsers : deleteAllUsers,
	updateUserTimestamp : updateUserTimestamp
}