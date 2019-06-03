process.env.NODE_ENV = 'test';

//Require the dev-dependencies
let crypto = require('crypto')
let chai = require('chai');
let chaiHttp = require('chai-http');
let server = require('../server');
let Repository = require('../repository/commonRepository');
let UserRepository = require('../repository/userRepository')
let should = chai.should();
let expect = chai.expect;

chai.use(chaiHttp);
//Our parent block


describe('Repository', () => {
	describe('Insert new raw aggregation', () => {
		it('should insert a new raw aggregation and check for required fields', (done) => {
			let request = {
				"start"  : "2019-01-01",
				"end": "2019-01-02",
				"type": "steps",
				"n": 0,
				"value": 0.1
			}

			Repository.insertNewRawRequest(request).then (result => {
				result.should.have.property("_id")
				result.should.include.keys(Object.getOwnPropertyNames(request))
				done()
			})
		})
	})

	describe('Insert new incorrect aggregation', () => {
		it('should fail with a message that required fields are missing', (done) => {
			let request = {"type": "steps"}

			Repository.insertNewRawRequest(request).then((result) => {
				done()
			}).catch(err => {
				err.should.have.string("missing or wrong fields")
				done()
			})
		})
	})
})

describe('Requests', () => {
	let user = "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAp/he1JTafLx5ngpLKe2YL/dCvphetQNg6e2zw6ive+crGwwSkF3oyY7adyGxTWBQOcgBwYg67KJQaIhdgA3noRaSidJBbXPqNBxulr1GFaBq3SZh0l+YbajznU0EaeI/ENElTAs605/jkzMXdtq7cF3kbkdLOi2jLCN42H3C5EDR8UPDMifyrRl66p3IsapTuLVPoBU+lWSsRnxa4ZQuAAJy1OrzdqNFrfF355TD03gi+d/Fz4A29lDtaZ1eXxz9H8RkfCQclXR79D7ih4p7+KNKjm8IisQ6auceBNYaZm9q+TXPN9Wo1tYyGIZOeFp1xddcVk47zJPBprDmHWAGKwIDAQAB\n-----END PUBLIC KEY-----"
	let privateKey = "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCn+F7UlNp8vHmeCksp7Zgv90K+mF61A2Dp7bPDqK975ysbDBKQXejJjtp3IbFNYFA5yAHBiDrsolBoiF2ADeehFpKJ0kFtc+o0HG6WvUYVoGrdJmHSX5htqPOdTQRp4j8Q0SVMCzrTn+OTMxd22rtwXeRuR0s6LaMsI3jYfcLkQNHxQ8MyJ/KtGXrqncixqlO4tU+gFT6VZKxGfFrhlC4AAnLU6vN2o0Wt8XfnlMPTeCL538XPgDb2UO1pnV5fHP0fxGR8JByVdHv0PuKHinv4o0qObwiKxDpq5x4E1hpmb2r5Nc831ajW1jIYhk54WnXF11xWTjvMk8GmsOYdYAYrAgMBAAECggEADMgWl0CYe6Nv8bnAzHj6+rNrDcvUcRvHtSVUZ5AfgmMt4YoCo5+xxhyrvSMANe4dTLhOgeaW7UjQq5Os4cCtHpH0Jq6sMeL/MGX1eF0Ax0aEuz1fdj22AKo5l3+z1UbVG7d+ihHUsSPakmnx4CZ22u8aIdYlAFFWuFYerQKs4Od6Cl037iesEuD5i9YdFJ1xbrX9M1yJuosEDMvpoz2XYTqABQT4VTibcZSI9IDEc0FSQNuYboqWSp3YgPbVhxGq3zzDtSY62AYBw9Qep/R49ykEBUGwKBWZIurZ2IUw5ycGSPdnDEM+WF91NsnGqBONf8BlylgdTvZTCmcKKTTF2QKBgQDpc/GWqn+JoM4337FPLbIHf7do3FjiZKrI5gF/lAxtJwhQqKNJOIc0Citr/SrlIcnFCOkSAPb1RBaHrq7MK1287dLhlER6xsQUvzfYSTSSmBnqXkGw9udP5S+A0QPwowLlwe456CtuhS6N40/BmjMFIDSCmd6B/Z52GbQfmpT7lwKBgQC4MWKwLlunsqnL2yZU7b3GcJB2iBmGlm5LfaOk+/Mcb4tX11LWblCZqe9KimIErf8w6aF5VLiLF7UUBF9tmzmvIbB5hCLGzkk71rvc6YauuMeiSq4d1tB7aQXBeeOlaHb4TlgpyOZO3z4e/CF7EAoZXVAFlo6lefgEAYKfyvisjQKBgQCYcFculMKW8eP2ZCD5nNMFRoZS+J8ppaZHbLlJvzimBbjOQm/tHfZbKtDTwQrDd96yxHC8iti3qvAzRQNq2l5pQbpUBmb47NWY3ovutU6Y8qzpdwbaMT810mfEa7dw6GC5+no+YbYKgvi1OdsYhkIOdMsVBLhglWVlpL8Ta/MgnQKBgCGcaWzK2NDOKmvXrrP6uhGXAtWOWlIT60Z9Q7pce21p8VxzH1ufv7d6qf7JJ7/A3HtZdqzER/Shu9pOPferRqhtll1mPk5W4Eg6FAfo2TnS4CL+S62IQHz0midHDcJmQKdo7G+biGNGG3jd+2IQeDdOrsaGRbtueVKJ0ANGr4AVAoGBAMrrcxO/JAgEOZm916eS07Vb1jdc8JY2NmCrO+9I9uTls+H/O/Ys0jgTCJaVLYCiRY96XhvhgfFsAV/oo+Z4/x3buUd3PBkdhoFV40HtSgRX3v3wb/HfycHzNnN2p5sptV5n8S2wHdwopuQxXwuACM2XtE4qkq4w04ermYdlKma4\n-----END PRIVATE KEY-----"
	let password
	beforeEach((done) => {
		//privateKey = privateKey.replace(/_/g, '/').replace(/-/g, '+')
		UserRepository.deleteAllUsers().then(() => {
			UserRepository.createUser(user).then(user => {
				password = user.password
				Repository.deleteAllRequests().then(() => {
					Repository.deleteAllResults().then(() => {
						Repository.deleteAllRawRequests().then(() => {
							done()
						})
					})
				})
			})
		})
	})

	describe.only('/GET requests for user', () => {
		it('it should GET all aggregations for the user', (done) => {
			let request = {
				"start"  : "2019-01-01",
				"end": "2019-01-02",
				"type": "steps",
				"n": 0,
				"value": 0.1
			}

			Repository.insertNewRawRequest(request).then(doc => {
				userUrlSafe = user.replace(/\//g, '_').replace(/\+/g, '-')
				chai.request(server)
					.get('/requests?publicKey=' + userUrlSafe + "&password=" + password)
					.end((err, res) => {
						if (err) {
							console.log("Error in request result")
						}
						res.should.have.status(200)
						res.body.should.be.a('array')
						res.body.should.have.lengthOf(1)

						res.body = res.body.map((ele) => {
							let key = {"key" : privateKey, "padding": crypto.constants.RSA_PKCS1_PADDING}
							let synchronousKey = crypto.privateDecrypt(key, Buffer.from(ele.encryptionKey, 'base64')).toString('base64')
							let iv = Buffer.from(ele.iv, 'base64')
							let decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(synchronousKey, 'base64'), iv)
							let crypted = decipher.update(Buffer.from(ele.encryptedRequest, 'base64'), 'base64', 'utf8')
							crypted += decipher.final('utf8')
							json = JSON.parse(crypted)
							for (var prop in json) {
								ele[prop] = json[prop]
							}
							return ele
						})

						res.body[0].should.have.property("type", "steps")
						res.body[0].should.have.property("start", "2019-01-01")
						res.body[0].should.have.property("end", "2019-01-02")
						res.body[0].should.have.property("n", 0)
						res.body[0].should.have.property("value", 0.1)
						res.body[0].should.have.property("pk", user)
						let tmp = (res.body[0].nextUser === null)
						tmp.should.be.true
						done()
					})
			})
		})
	})

	describe('/POST forward', () => {
		let user2 = "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEApYSaLkMKQz5Bg6owyFZE71Ty5OCryI5HtdbB0mXEBJjaoguuTJkgGSCVDApvfj3fj3MHTgjNW7M10XHlL+Lh05y0ht9+RB8brExZsV4qduKzgppf2o9OA0JQNpG1NDl0Sv7vFIQBN5WJbsvYIx1ZYjfTZfsoRHyyKmbTqtGpJlA+rYEctscFuc4aV3xSod5btOXV+R1NbqtDspWT4AuFxkWF4CWnzvScAtRsiCKj25hYGVfZJnpJsRQtCT278dU7VzK8sUMTpZS+F8C9ZTvB1R/DObQ6yFYCWJAFwMP/g6Ifd//OePv5/B+NN4Uwqlewr4gLYeKvoiySVnCNplljdwIDAQAB\n-----END PUBLIC KEY-----"
		it('should POST a request to be forwarded', (done) => {
			let request = {
				"start"  : "2019-01-01",
				"end": "2019-01-02",
				"type": "steps",
				"n": 0,
				"value": 0.1
			}

			UserRepository.createUser(user2).then(() => {
				Repository.insertSampleAggregationRequest(request, (success, doc) => {
					if (success) {
						request.serverId = doc._id
						request.nextUser = doc.nextUser
						request.publicKey = doc.pk
						request.password = password
						request.n = 3
						request.value = 3.3
						request.valueList = []

						chai.request(server)
							.post('/forward')
							.set('content-type', 'application/json')
							.send(request)
							.end((err, res) => {
								res.should.have.status(200)
								res.body.should.have.status(true)
								Repository.getRequests(doc.publicKey).then(res => {
									res.should.be.a("array")
									res.should.have.length(0)
									let otherUser = (doc.publicKey == user2) ? user : user2
									Repository.getRequests(otherUser).then(res => {
										res.should.be.a("array")
										res.should.have.length(1)
										done()	
									})
								})
							})
					} else {
						console.log("Failed to set up test")
						throw "Failed to set up test"
					}
				})
			})
		})
	})

	describe('/POST forward aggregation result', () => {
		it('it should insert a aggregation result', (done) => {
			let request = {
				"start"  : "2019-01-01",
				"end": "2019-01-02",
				"type": "steps",
				"n": 0,
				"value": 0.1
			}

			Repository.insertSampleAggregationRequest(request, (success, doc) => {
				if (success) {
					request.serverId = doc._id
					request.nextUser = doc.nextUser
					request.publicKey = doc.pk
					request.password = password
					request.n = 3
					request.value = 3.3

					chai.request(server)
						.post('/forward')
						.set('content-type', 'application/json')
						.send(request)
						.end((err, res) => {
							res.should.have.status(200)
							res.body.should.have.status(true)
							Repository.getResults().then(res => {
								res.should.be.a("array")
								res.should.have.length(1)
								Repository.getRequests(user).then(res => {
									res.should.be.a("array")
									res.should.have.length(0)
									done()	
								})
							}).catch(err => {
								console.log(err)
							})
						})
				} else {
					console.log("Failed to set up test")
					throw "Failed to set up test"
				}
			})
		})
	})

	describe('/admin/sampleRequest', () => {
		it('it should insert a Sample Request and encrypt it for the first user', (done) => {
			let request = {
				"start"  : "2019-01-01",
				"end": "2019-01-02",
				"type": "steps",
				"n": 0,
				"value": 0.1
			}

			Repository.insertSampleAggregationRequest(request, (success, doc) => {
				if (success) {
					doc.pk.should.be.string(user)
					doc.users.should.be.a("array")
					doc.users.should.be.empty
					let tmp = (doc.nextUser === null)
					tmp.should.be.true
					//doc.iv.should.be.a("String")

					let key = {"key" : privateKey, "padding": crypto.constants.RSA_PKCS1_PADDING}
					let synchronousKey = crypto.privateDecrypt(key, Buffer.from(doc.encryptionKey, 'base64')).toString('base64')
					let iv = Buffer.from(doc.iv, 'base64')
					let decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(synchronousKey, 'base64'), iv)
					let crypted = decipher.update(Buffer.from(doc.encryptedRequest, 'base64'), 'base64', 'utf8')
					crypted += decipher.final('utf8')

					let decryptedRequest = JSON.parse(crypted)
					request._id = request._id.toString()
					decryptedRequest.should.deep.equal(request)

					done()
				} else {
					throw "Failed to set up test"
				}
			})
		})
	})
})