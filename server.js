const express = require('express')
const app = express()
const port = 8888

const RequestHandling = require('./requests')

app.get('/', RequestHandling.handleBasicGetRequest)
app.get('/info', RequestHandling.sendAPIInfo)
app.get('/aggregations', RequestHandling.sendAggregations)
app.get('/stats', RequestHandling.sendStatistics)
app.post('/user', RequestHandling.handleNewUserRequest)
app.post('/aggregation', RequestHandling.handleAggregationResult)
app.post('/forward', RequestHandling.handleForwardRequest)
app.all('*', RequestHandling.handleUnknownRequest)

const server = app.listen(port, function () {
	console.log("Server listening on port " + port)
})