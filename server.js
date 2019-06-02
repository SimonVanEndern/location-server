const express = require('express')
const app = express()
const port = 8888
const Helper = require('./helpers')
const Routes = require('./routes')

//Reroute aggregation requests that have been pending for more than a certain time.
Helper.runCleanUpJob()

//Parse json body into req.body
app.use(express.json({"type": "application/json"}))

//Set routes that require user authentication.
Routes.requireUserAuthentication(app, 
	[
		'/requests',
		'/forward'
	]
)

//Register the routes of the server
Routes.setRoutes(app)

//Update each users lastSeen timestamp on each contact.
app.use(Helper.updateUser)

//Set (local) port and start server
app.set('port', process.env.PORT || port);
app.listen(app.get('port'), function () {
	console.log("Server listening on port " + port)
})

// For Testings with mocha
module.exports = app