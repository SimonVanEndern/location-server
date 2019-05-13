const express = require('express')
const app = express()
const port = 8888

app.get('/', function (req, res) {
	res.set({
		'Content-Type': 'text/plain'
	})
	res.status(200)
		.send("Hello world")
})

const server = app.listen(port, function () {
	console.log("Server listening on port " + port)
})