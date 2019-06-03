const Helper = require('./helpers')
const RequestHandling = require('./requests')

/*
	Register routes that require user authentication.
*/
function requireUserAuthentication (app, routes) {
	routes.forEach(route => {
		app.use(route, Helper.authenticateUser)
	})
}

/*
	Defining the routes served by the server.
*/
function setRoutes (app) {
	app.get('/', RequestHandling.handleBasicGetRequest)
	app.get('/aggregations', RequestHandling.sendAggregations)
	app.get('/requests', RequestHandling.sendRequests)
	app.post('/user', RequestHandling.handleNewUserRequest)
	app.post('/forward', RequestHandling.handleForwardRequest)
	app.post('/admin/sampleRequest', RequestHandling.insertNewRawRequest)
	app.all('*', RequestHandling.handleUnknownRequest)
}

module.exports = {
	setRoutes: setRoutes,
	requireUserAuthentication: requireUserAuthentication
}