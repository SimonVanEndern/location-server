const express = require('express')
const app = express()
const port = 8888

function handleNewUserRequest(req, res) {
	// TODO: Implement!!
	console.log("Got new user request")
	res.status(200).send("Ok")
}

app.get('/', function (req, res) {
	res.set({
		'Content-Type': 'text/plain'
	})
	res.status(200)
		.send("Hello world")
})

app.post('/user', handleNewUserRequest)

const server = app.listen(port, function () {
	console.log("Server listening on port " + port)
})