const express = require('express')
const app = express()
const port = 8888

const RequestHandling = require('./requests')

app.get('/', RequestHandling.handleBasicGetRequest)
app.post('/user', RequestHandling.handleNewUserRequest)
app.all('*', RequestHandling.handleUnknownRequest)

const server = app.listen(port, function () {
	console.log("Server listening on port " + port)
})