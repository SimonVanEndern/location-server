const express = require('express')
const crypto = require('crypto')
const app = express()
const port = 8888
const fs = require('fs')
app.set('port', process.env.PORT || port);
const Repository = require('./repository')
const RequestHandling = require('./requests')

// Populate database with sample data for pk = "xyz"
// Repository.insertSampleAggregationRequest()

app.use(express.json({"type": "application/json"}))

function authenticate (req, res, next) {
	let user
	let pw

	if (req.method === "GET") {
		user = req.query.pk
		pw = req.query.pw
	} else {
		user = req.body.pk
		pw = req.body.pw
	}
	if (!user || !pw) {
		console.log("Authentication failed")
		res.status(401).json({"status":false})
		return
	}

	pw = crypto.createHash("sha256").update(pw).digest()

	console.log("Try authentication ...")

	Repository.authenticateUser(user, pw, (authenticated) => {
		if (!authenticated) {
			console.log("Authentication failed")
			res.status(401).json({"status":false})
		} else {
			console.log("Authentication successful")
			next()
		}
	})
}


app.use(function (req, res, next) {
	console.log("Encryption: ")
	crypto.generateKeyPair('rsa', {
		"modulusLength":2048,
		"publicKeyEncoding": {
			"type": 'pkcs1',
			"format": 'pem'
		},
		"privateKeyEncoding": {
			"type": 'pkcs1',
			"format": 'pem'
		}
	}, (err, publicKey, privateKey) => {
		let plainText = Buffer.from("test")
		let encrypted = crypto.publicEncrypt(publicKey, plainText)
		let decrypted = crypto.privateDecrypt(privateKey, encrypted)
		console.log(decrypted)
		console.log(decrypted.toString())
		//console.log(privateKey)
		//console.log(publicKey)
		let publikK = "-----BEGIN RSA PUBLIC KEY-----\n" +
"MIIBCgKCAQEA+qKpHLzXKi4PFt1VAI9E2SzZPB79D/0hCuscJsLxY3F5aBNC4QqB\n" + 
"RG9e2p2y/g5VP4LMa1rVOqk+SWaGEYeyjLvaRh8fA+iTR7uv9z+C3LeMfHlskETz\n" + 
"aUwyuMUdXCrPM2dSSRIEnp2y6vGuWMa6I1wc/u4AofC7V0UbAwzm9VAbgIH/L+yN\n" + 
"e+1K1z5jOlgtyE3hpzvpqBnMT/QHQAXNh3Aiw4b8iWwEP7xC2qVM1qxy7crs4qHQ\n" + 
"Kxp0yH8xlFs8gOi0MQv48ahlorv6c77ImJmcRSKaXKCg3pIoFGcXB39oOOjTvaIj\n" + 
"wsmYNDxLDoegGLwF4wMhqBEwWty6WkF7vQIDAQAB\n" + 
"-----END RSA PUBLIC KEY-----"
//console.log(publikK)
	let privateKeyString = "-----BEGIN RSA PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDLFDI4VB9qEkwU1gG5aajXJb6hgTQm9Jc5ywK0IWNXT5/o8BPYXGBk2jesG2AWTSCxidzQWrEHX8jul6ZjgNUOLrd24CtsMSLADME+abNJscqjm6Cyj2OYOOvSk0l/4F94HBjbPvnSxS4WchnDuDDOx8SBFE/TG064eVBolwEKoWczSPGZAErpZwwGYuCZJVne7/mDgYgbe0NP898Y8n61Y8oVLMWlL6QxKIUUzs6WlsPpa/crFWlyzKcHdPm9Z7/KM27Ituh6lETpQU+KhxpmYt9UoxMiW1eT7zOZo887YZYKifaRcuEdWbcOnyhH2NTBqy6LPZr7Ku64ZG/Itf8BAgMBAAECggEACpYwcghMpPJ0PefUKi7Mav7gO7opFljM42nmZ66P57bSbsnJNw/FxKwtl87LiQ4XRLobpU79CJXhOzLzrR9DvBwKW2ufR+Id3iYsEs1e19opZrMPww8/kWlyPcWI4N45C+FnGFLloiu+VdQ37KCXBsiaQWJmMOqtBWfpnbI1jzC38zYq+D9fpTY7bLCXmDQt4fQ2znQYkWReadbw9M2PdDu9MCa0LSBVnLILPMI67VrsXbwZfaYyIpg+KQN/yBvHijCnX7IQJcMX8qJyififNtc+Io+sSvppJCrfKTUXwWzAlAAeex2vnVde/VOZ59XFhqVTIvC2cYOGRrX9lGIkmQKBgQD8mz7hjae8aadqOXav73jozO38fiKSxY8rgxHqVgS7FBrMY7GA7OHWTHMdQu6skpFfcVbcEnlTpDurBE5HnACxjFbUQ/vpgJeCNFmGfTW9pA5V/hSQPrjOb2FCnetI7f15eDHEhRIb/QiP1M1RjG24dFgisZbnJQjn1GfUo9qzJQKBgQDNzp4Ja1f3GHdQW109J2yE/etNaKlAFGZ4EgRTt7AdVlcVdFip2fJon2Lf6STUh/wfOLGeZKZxFoI90cwoXNr2RCQx46wPIxsqp9aAOcbqFK6az8Vopvai4CRW9S7OHzIh/DTd/wciyYxvmAm4M+SyGCKLjKJKUT8A102yTpODrQKBgG/OCtvsRdSn8tiaTIT8ekiYA7Hg5k6OMJsyrShKIFfpQx859OO6dQ7T0ZOe/2LUkJFs6eQILTkvFNXR1w/s5YWwNvJGkOY961FO+F0FaFbimRHInrNlf4inVaYVnYEvDSTJZUW1HFnU+ggnSSUSAbJFlIjuj3sJMlLh+X7tcywdAoGBAMRRKnlLtu5SnUW+0VMLbz3xROpjQseIbjJs5UnCd7GUcZ9ai1UCPHTGTTfPmr1NNhfGKdAwrIBFe1li7f82i/vMBka8qZ0K3Ng0n61S78bMkb3FIcbxNWUqsB9u5AXkxhqbDQcSRYlOfrLYcbUPc0DbOuCo9wozNAkmV8wVnitFAoGBAOiJXarq/SQMsyQD1yPo7iugYx+FDOb55E/qiGfYWKhIol64yg1SSg4Zd+4uTpC6v+gynmXL7bdxiGCw6ckggAB7M71B1L2im/ieJ/1WTzOcpW5X4RLOnaWIpe8IAZBfqKMDDq5aH597ZhrtZwokBVgN6xgGinr86uTYlHtZEZhQ\n-----END RSA PRIVATE KEY-----"
//	console.log(privateKeyString)
	})




	let test = "test"
	let publicKeyString = fs.readFileSync('public.pem').toString()
	//let publicKeyString = "-----BEGIN RSA PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAyPMJGQR7a/DTKokVTXk6TXuZbv5IUqAg\nWMyHmuAlri3eVNAWN10qVHVTdV06Zq6qN6rWcdYeJnEr91H4wngMvjdXvlvwAnEDr7VGJOqwUdDj\nfj3KUu3kQyEnx0gbNHH3VkBXGPtjNj7aAFI6ogyJbi1yr4mQuZO6RjksXZC26pcDOd4y7fT5AsDw\ny2iQradDYsT+OvsBFkeeGSNjVwjaBkRp2XXvdJifWToMcmUDLMhwnWzIyXWw+xFHuoOppUnDlrYN\nVXIUBtdKC3U+ISKZpcaMA3HLKJy86IxxOE0CrSdM+Iwd27r5DNwmwrE8Li9hU83IyimuPEzqiGBR\ngXNxdQIDAQAB\n-----END RSA PUBLIC KEY-----"
	let publicKey = {
		"key" : publicKeyString,
		"padding": crypto.constants.RSA_PKCS1_PADDING
	}
	//let privateKeyString = fs.readFileSync('private_unencrypted5.pem').toString()
	let privateKeyString = "-----BEGIN RSA PRIVATE KEY-----\nMIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQDI8wkZBHtr8NMqiRVNeTpNe5lu\n/khSoCBYzIea4CWuLd5U0BY3XSpUdVN1XTpmrqo3qtZx1h4mcSv3UfjCeAy+N1e+W/ACcQOvtUYk\n6rBR0ON+PcpS7eRDISfHSBs0cfdWQFcY+2M2PtoAUjqiDIluLXKviZC5k7pGOSxdkLbqlwM53jLt\n9PkCwPDLaJCtp0NixP46+wEWR54ZI2NXCNoGRGnZde90mJ9ZOgxyZQMsyHCdbMjJdbD7EUe6g6ml\nScOWtg1VchQG10oLdT4hIpmlxowDccsonLzojHE4TQKtJ0z4jB3buvkM3CbCsTwuL2FTzcjKKa48\nTOqIYFGBc3F1AgMBAAECggEAIM+2Q5R8xqI7CK37gXvy7iXpZrs0efFVdspmtf41iNxKelTD2+Rl\nfgbuSrKfT5bjilVl0I6iu6otAKQs1ywdAI4u0JFYfj2P2Yfi3TJI+gL+smVKfQIFDIUEZsC6WHTn\navj0f8rEZ14Z4IWMt1sOsaPQHyN6MyMQ/lhlix2PEHyvcoqEk9BnyDC//sWvYhWxtWnvx3Deorab\njbxxEhNTSOz6k/u+Ze2SaHzjM08+ZYjFhLv9OZi6hQRU6ZOMsQ+ETVmlX3GQ9SoxxqNiacLRI3SP\ngbHR33UUt+bLGumMNh2Btc+nHiGt8lSYKGMiPmTjxILPD0zMOzZaVsF5o5vRgQKBgQD88wSloLp/\n3wkmLuv03K2I3YYvGiD1neseqDoqT2qgO9DIMINEy4yjsBjCDT0h2Y6LO/SVJldMV4qzdLGWzsVP\nkYsaPyoAkZZT6aIe+3yaXl6rWGsrkAGXDLkN/+uUvb+3yAVoszumQS+ngEUbH2MlgNwm4H+8Q7k0\nrzZRFeLAYQKBgQDLX3en/eZw/c+pg2YwaFWfLIX/05a/YY6P8JBy+5lomiUUigH9/fNDNoIEzGWV\nqXbsHWuegtkDflpY5eb50uZowXFoz1nv19Y37KPZPZb/91e7AdWp1BqInP3f6fgkMEpggOYXIMZr\nsv8LL34ISO1vWDSB7NM5PMR55QjJfbAZlQKBgQCN1Im3gP7xshKEOW0OeCpJgsS5ZnIypmBuaS9s\nB+mmfMOdbC4+hc+O/K91J00uzLjzcyO5+aybXr6jzvvArqHN8rLHfcFEXl2nIWpI6wQ73kxA0SwO\nWgm6M2UT53qlhRuZper6gP0iRIy+49pb0eaa4b0Pg3O8EVEorFHNd3MUIQKBgQCQTDh2Naxf13aU\na+sBxcWantik39hCClJAxwt2yhXbJiPRIuqu8JS9x9sQ1IXvXsJGXcmSOn0IAYrRMK5l68IX6ckx\n+I1zo80W+Qx4gz60dycERRT43snEzL9FNJkf9DORrWOUXWjr2aEkqpnd/wCY1BjNZt+n6PnvExbd\nABUG0QKBgQCp3nKTndF2M1EE+uUj6wTfagJa3HrgsHpJI67M1R4j+W2femtKOqgxFW2YiWCjIKDo\nqdBfsV8ETwutYvFH1lSF4OMsyAjBMb0+O1oIacdl3PSg3afPaXyxQ3dOM5PuGoDxHviyZ0DOD15p\nPjoWQeAfeU6hs6zp2S51F8dbN89Mtw==\n-----END RSA PRIVATE KEY-----"
	let privateKey = {
		"key": Buffer.from(privateKeyString),
		"padding": crypto.constants.RSA_PKCS1_PADDING
	}
	let decrypted = "a8b4NoBRy0n5fPtupV3PeoXAYSuy/LKh7G1h9UP7sDc3xodvIyexWlTTB17lCp6ARE5yQJ+jikpnqe+w3NuTOeuxdk36gz2A/OXyMWrxciUvU18CKuqKYto/3gGwqqhqbwRi6inGd9knU3VcAsPVRFncI4mmE813gYilCZUi1JZO2uq8k8aDACV6Y0gcQ8BsHaSBcVP5QwFF33oOS5/W/AHDcrLGzTo9MqeCCc37FWR+NjKtViQFgnw1OmwiLhS0m2jzOCKGrvXsGLI2eXZX64471mPfIJOYKVT+/ttlre3exdwWmaI11vVJEjWRVOPb3TEweR7B8mptHydwjq0Y3A=="
	let buffer = Buffer.from(test, 'utf8')
	let result = crypto.publicEncrypt(publicKey, buffer)
	console.log(result.toString('base64'))
	let ergebnis = crypto.privateDecrypt(privateKey, Buffer.from(decrypted, 'base64'))
	console.log(ergebnis)
	console.log(String.fromCharCode.apply(null, ergebnis))
	console.log("Encryption done")

	if (req.method === "POST") {
		if (!req.body.pk) {
			console.log("WARNING: No user specified")
		} else {
			RequestHandling.updateUserTimestamp(req.body.pk)
		}
	} else if (req.method === "GET") {
		if (!req.query.pk) {
			console.log("WARNING: No user specified")
		} else {
			RequestHandling.updateUserTimestamp(req.query.pk)
		}
	}
	next()
})

app.use('/requests', authenticate)
app.use('/forward', authenticate)

app.get('/', RequestHandling.handleBasicGetRequest)
app.get('/info', RequestHandling.sendAPIInfo)
app.get('/aggregations', RequestHandling.sendAggregations)
app.get('/stats', RequestHandling.sendStatistics)
app.get('/requests', RequestHandling.sendRequests)
app.post('/user', RequestHandling.handleNewUserRequest)
app.post('/aggregation', RequestHandling.handleAggregationResult)
app.post('/forward', RequestHandling.handleForwardRequest)
app.post('/admin/sampleRequest', RequestHandling.handleInsertSample)
app.get('/test', RequestHandling.testing)
app.all('*', RequestHandling.handleUnknownRequest)

const server = app.listen(app.get('port'), function () {
	console.log("Server listening on port " + port)
})

// For Testings
module.exports = app