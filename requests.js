var exports = {}

function handleNewUserRequest(req, res) {
	// TODO: Implement!!
	console.log("Got new user request")
	res.status(200).send("Ok")
}

function handleUnknownRequest (req, res) {
	console.log("Got unknown request")
	res.status(404).send("Not Ok")
}

function handleBasicGetRequest (req, res) {
	res.set({
		'Content-Type': 'text/plain'
	})
	res.status(200)
		.send("Hello world")
}

exports.handleNewUserRequest = handleNewUserRequest
exports.handleUnknownRequest = handleUnknownRequest
exports.handleBasicGetRequest = handleBasicGetRequest

module.exports = exports