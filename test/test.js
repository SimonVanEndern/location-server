process.env.NODE_ENV = 'test';

//Require the dev-dependencies
let chai = require('chai');
let chaiHttp = require('chai-http');
let server = require('../server');
let Repository = require('../repository');
let should = chai.should();
let expect = chai.expect;

chai.use(chaiHttp);
//Our parent block
describe('Users', () => {
    beforeEach((done) => { //Before each test we empty the database
        Repository.removeAllUsers(() => {
        	done();
        });
    });        
/*
  * Test the /GET route
  */
  	describe('/POST user', () => {
      	it('it should POST a new user', (done) => {
      		let user = {"pk": "testUserUnitTest"}
        	chai.request(server)
            	.post('/user')
            	.send(user)
            	.end((err, res) => {
                  	res.should.have.status(200);
                  	res.body.should.have.status(true)
                  //res.body.should.be.a('array');
                  //res.body.length.should.be.eql(0);
              		done();
            	});
  		});
	});

	describe('/Post existing user', () => {
		it('it should POST an existing user and fail', (done) => {
			let user = {"pk":"testUserUnitTest"}
			Repository.insertNewUser(user.pk, (success) => {
				chai.request(server)
					.post('/user')
					.send(user)
					.end((err, res) => {
						res.should.have.status(400);
						res.body.should.have.status(false);
						done();
					});
			})
		});
	});
});

describe('Requests', () => {
	let user = "testUserUnitTest"
	beforeEach((done) => {
		Repository.removeAllUsers(() => {
			Repository.insertNewUser(user, (success) => {
				Repository.deleteAllRequests(() => {
					done()
				})
			})
		})
	})

	describe('/GET requests for user', () => {
		it('it should GET all aggregations for the user', (done) => {
			let request = {
				"start"  : "2019-01-01",
				"end": "2019-01-02",
				"type": "steps",
				"n": 0,
				"value": 0.1
			}

			Repository.insertSampleAggregationRequest(request, (success) => {
				if (success) {
					chai.request(server)
						.get('/requests?pk=' + user)
						.end((err, res) => {
							res.should.have.status(200)
							res.body.should.be.a('array')
							res.body.should.have.lengthOf(1)
							res.body[0].should.have.property("type", "steps")
							res.body[0].should.have.property("start", "2019-01-01")
							res.body[0].should.have.property("end", "2019-01-02")
							res.body[0].should.have.property("n", 0)
							res.body[0].should.have.property("value", 0.1)
							res.body[0].should.have.property("nextUser", user)
							done()
						})
				} else {
					throw "Failed to set up test"
				}
			})
		})
	})

	describe('/POST forward', () => {
		it('it should POST a request to be forwarded', (done) => {
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
					request.pk = doc.pk
					request.n = 3
					request.value = 3.3
					chai.request(server)
						.post('/forward')
						.send(request)
						.end((err, res) => {
							res.should.have.status(200)
							res.body.should.have.status(true)
							done()
						})
				} else {
					throw "Failed to set up test"
				}
			})
		})
	})
})