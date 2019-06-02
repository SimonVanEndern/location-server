const Repository = require('./repository')
let UserRepository = require('./userRepository')

/*
	Inserts a new user if possible and sends the attributed password.
*/
function handleNewUserRequest(req, res) {
	UserRepository.createUser(req.body.publicKey).then(user => {
		res.status(200).json({
			"publicKey": user.publicKey,
			"password": user.password
		})
	}).catch(err => {
		console.log(err)
		res.status(400).end();
	})
}

/*
	Send whenever a request does not match any of the specified routes.
*/
function handleUnknownRequest (req, res) {
	console.log("Got unknown request")
	res.status(404).end()
}

/*
	Send when the base url is requested.
*/
function handleBasicGetRequest (req, res) {
	res.set({
		'Content-Type': 'text/plain'
	})
	res.status(200)
	.send("Hello world!")
}

/*
	Sending all aggregation results available.
*/
function sendAggregations (req, res) {
	Repository.getResults().then(result => {
		res.set({
			'Content-Type': 'text/json'
		})
		console.log("Sending result: ")
		console.log(result)
		res.status(200).send(result)
	}).catch(error => {
		throw err
	})
}

/*
	Handles an incoming response to an aggregation request.
*/
function handleForwardRequest (req, res) {
	console.log("Got forward request")
	let pk = req.body.pk
	let target = req.body.nextUser
	let original_request_id = req.body.serverId
	let data = req.body.data

	// TODO: Re-voke user authentication!!!
	if (!original_request_id) {
		console.log("Sending 400 to foward request")
		res.status(400).send("Not Ok")
		return
	} else if (!target) {
		Repository.insertNewAggregationAndDeleteRequest(target, req.body, original_request_id).then(() => {
			res.status(200).json({"status":true});
		})
	} else {
		Repository.insertNewRequestAndDeleteOld(target, req.body, original_request_id).then(() =>  {
			//console.log("Got forward request: target=" + target + " pk=" + pk + " original_request_id=" + original_request_id)
			res.status(200).json({"status":true});
		})
	}
}

/*
	Sending all aggregation requests stored for the specified user.
*/
function sendRequests (req, res) {
	console.log("Got get requests request")
	let pk = req.query.publicKey
	Repository.getRequests(publicKey).then(
		result => {
			res.set({
				'Content-Type' : "text/json"
			})
			res.status(200).send(result)
		}
	).catch(err => {throw err})
}

/*
	Handling an admin request to insert a new aggregation request.
*/
function handleInsertSample (req, res) {
	console.log("Handling sample insert")
	//TODO: Restrict to admin only
	pk = req.body.pk
	request = req.body.request
	if (!request) {
		res.status(400).send("Not ok")
		return
	}
	request.pk = pk
	if (pk == undefined) {
		res.status(400).send("Not ok")
	} else {
		Repository.insertSampleAggregationRequest(request, (success) => {
			if (success) {
				res.status(200).send("Ok")
			} else {
				res.status(400).send("Not oki")				
			}
		})
	}
}

function updateUserTimestamp (pk) {
	UserRepository.updateUserTimestamp(pk)
}

module.exports = {
	handleNewUserRequest: handleNewUserRequest,
	handleUnknownRequest: handleUnknownRequest,
	handleBasicGetRequest: handleBasicGetRequest,
	sendAggregations: sendAggregations,
	handleForwardRequest: handleForwardRequest,
	sendRequests: sendRequests,
	handleInsertSample: handleInsertSample,
	updateUserTimestamp: updateUserTimestamp
}