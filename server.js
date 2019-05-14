const express = require('express')
const app = express()
const port = 8888
const Repository = require('./repository')
const RequestHandling = require('./requests')

// Populate database with sample data for pk = "xyz"
// Repository.insertSampleAggregationRequest()

app.use(express.json({"type": "application/json"}))

app.get('/', RequestHandling.handleBasicGetRequest)
app.get('/info', RequestHandling.sendAPIInfo)
app.get('/aggregations', RequestHandling.sendAggregations)
app.get('/stats', RequestHandling.sendStatistics)
app.get('/requests', RequestHandling.sendRequests)
app.post('/user', RequestHandling.handleNewUserRequest)
app.post('/aggregation', RequestHandling.handleAggregationResult)
app.post('/forward', RequestHandling.handleForwardRequest)
app.post('/admin/sampleRequest', RequestHandling.handleInsertSample)
app.all('*', RequestHandling.handleUnknownRequest)

const server = app.listen(port, function () {
	console.log("Server listening on port " + port)
})