const crypto = require("crypto")
const User = require('./user')

// Only for testing. Removes all users from the database.
function removeAllUsers() {
	return User.removeAll()
}

/*
	Inserts a new user into the database if there is not already a user with the specified public key.
*/
function createUser(publicKey) {
	let random = Math.random().toString(36)
	let password = crypto.createHash("sha256").update(random).digest().toString()
	let lastSeen = (new Date()).getTime()
	let user = User.create(publicKey, password, lastSeen)

	return User.insert(user)
}

/*
	Retrieves the most recently active @limit users from the database.
	The list is sorted in descending order regarding the lastSeen timestamp of the user.
*/
function getLastSeenUsers (limit) {
		let oneDayBefore = (new Date()).getTime() - 1000 * 60 * 60 * 24
		let query = {"lastSeen": {$gt : oneDayBefore}}
		// -1 for descending order
		let sort = {"lastSeen" : -1}
	return User.get(query, sort).then(result => {
		result = result.map(function (ele) {return ele.publicKey})
		result.length = result.length > limit ? limit : result.length
		return Promise.resolve(result)
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
	let query = {"publicKey": user, "password": password}
	return User.find(query).then (user => {
		if (!user) {
			return Promise.reject("Not authenticated")
		} else {
			return Promise.resolve()
		}
	})
}

module.exports = {
	createUser : createUser,
	authenticateUser : authenticateUser,
	removeAllUsers : removeAllUsers,
	updateUserTimestamp : updateUserTimestamp,
	getLastSeenUsers: getLastSeenUsers
}