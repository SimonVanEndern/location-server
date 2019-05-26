var exports = {}
const Repository = require('./repository')
let UserRepository = require('./userRepository')

function handleNewUserRequest(req, res) {
	let pk = req.body.pk
	if (!pk) {
		res.status(400).send("Not ok")
	} else {
		let timestamp = (new Date()).getTime()
		UserRepository.createUser(pk).then(user => {
			res.status(200).json({
				"pk": pk,
				"pw": user.pw
			})
		}).catch(err => {
			console.log(err)
			res.status(400).json({});
		})
	}
}

function handleUnknownRequest (req, res) {
	console.log("Got unknown request")
	res.status(404).send("Not Ok")
}

function testing(req, res) {
	console.log("Testing ...")
	let promise = Repository.getUsersPossibleForNewRequest()
	promise.then(result => {
		console.log("ok")
		res.status(400).end()
	}).catch(error => {
		console.log("err")
		res.status(400).end()
	})
	console.log("... Testing ended.")
}

function handleBasicGetRequest (req, res) {
	res.set({
		'Content-Type': 'text/plain'
	})
	res.status(200)
	.send("Hello world")
}

function sendAPIInfo (req, res) {
	res.set({
		'Content-Type': 'text/json'
	})
	res.status(200).end()
}

function sendAggregations (req, res) {
	Repository.getResults().then(result => {
		res.set({
			'Content-Type': 'text/json'
		})
		res.status(200).send(result)
	}).catch(error => {
		throw err
	})
}

function sendStatistics (req, res) {
	res.set({
		'Content-Type': 'text/json'
	})
	res.status(200).send({'basic':'info'})
}

function handleAggregationResult (req, res) {
	let pk = req.body.pk
	let original_request_id = req.body.original_request_id
	let data = req.body.data
	if (pk == undefined || original_request_id == undefined || data == undefined) {
		res.status(400).send("Not Ok")
	} else {
		Repository.insertNewAggregationAndDeleteRequest(original_request_id, data)
		console.log("Got aggregation result: pk=" + pk + " original_request_id=" + original_request_id)
		res.status(200).end()	
	}
}

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
			console.log("Got forward request: target=" + target + " pk=" + pk + " original_request_id=" + original_request_id)
			res.status(200).json({"status":true});
		})
	}
}

function sendRequests (req, res) {
	console.log("Got get requests request")
	/*let exampleRequests = {'requests' : [
		{'id': 1, 'data': 'binarydataEncrypted...'}, 
		{'id':2, 'data':'binarydataEncrypted'}
	]}*/
	let pk = req.query.pk.replace(/-/g, '+').replace(/_/g, '/').replace(/\+\+\+\+\+/g, '-----')
	if (!pk) {
		res.status(400).send("Not ok")
	} else {
		Repository.getRequests(pk).then(
			result => {
				res.set({
					'Content-Type' : "text/json"
				})
				res.status(200).send(result)
			}
		).catch(err => {throw err})
	}
}

function handleInsertSample (req, res) {
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
		insertAggregation(request).then(res => {
			res.status(200).send("Ok")
		}).catch(err => {
			res.status(400).send("Not ok")
		})
	}
}


function insertAggregation (request) {
	let rawRequest = Repository.createRawRequest(request)
	let possibleUsers = UserRepository.getUsersPossibleForNewRequest()
	return Promise.all([rawRequest, possibleUsers]).then(result => {
		let aggregationRequest = createFromRawRequest(request, rawRequest.rawRequestId, possibleUsers)
		if (!aggregationRequest) {
			console.log("ERROR")
			return Promise.reject("Error")
		} else {
			return Repository.insertAggregationRequest(aggregationRequest)
		}
	})
}

function createFromRawRequest (request, rawRequestId, users) {
	let synchronousKey = crypto.randomBytes(24).toString('base64')
	let encryptionKey = crypto.publicEncrypt(users[0], Buffer.from(synchronousKey, 'base64')).toString('base64')
	let cipher = crypto.createCipher("aes-128-ctr", synchronousKey)
	let crypted = cipher.update(JSON.stringify(request), 'utf8', 'base64')
	crypted += cipher.final('base64')

	return {
		type : request.type,
		start : request.start,
		end : request.end,
		rawRequestId : rawRequestId,
		pk : users.shift(),
		nextUser : (users[0] == undefined ? null : users[0]),
		encryptionKey : encryptionKey,
		encryptedRequest : encryptedRequest
	}
}

function updateUserTimestamp (pk) {
	UserRepository.updateUserTimestamp(pk)
}

exports.handleNewUserRequest = handleNewUserRequest
exports.handleUnknownRequest = handleUnknownRequest
exports.handleBasicGetRequest = handleBasicGetRequest
exports.sendAPIInfo = sendAPIInfo
exports.sendAggregations = sendAggregations
exports.sendStatistics = sendStatistics
exports.handleAggregationResult = handleAggregationResult
exports.handleForwardRequest = handleForwardRequest
exports.sendRequests = sendRequests
exports.handleInsertSample = handleInsertSample
exports.testing = testing
exports.updateUserTimestamp = updateUserTimestamp
exports.insertAggregation = insertAggregation

module.exports = exports