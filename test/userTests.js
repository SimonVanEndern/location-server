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
describe('Users', () => {
    beforeEach((done) => { //Before each test we empty the database
        UserRepository.deleteAllUsers().then(() => {
        	done();
        });
    });        
/*
  * Test the /GET route
  */
  	describe('/POST new user', () => {
      	it('should create a new user and respond with the linked password', (done) => {
      		let user = {"publicKey": "testUserUnitTest"}
        	chai.request(server)
            	.post('/user')
            	.send(user)
            	.end((err, res) => {
                  	res.should.have.status(200);
                  	res.body.publicKey.should.have.string(user.publicKey)
                  	res.body.password.should.not.be.empty
              		done();
            	});
  		});
	});

	describe('/Post existing user', () => {
		it('should fail with status 400 because the user already exists', (done) => {
			let user = {"publicKey":"testUserUnitTest"}
			UserRepository.createUser(user.publicKey).then(() => {
				chai.request(server)
					.post('/user')
					.send(user)
					.end((err, res) => {
						res.should.have.status(400);
						res.body.should.be.empty
						done();
					});
			})
		});
	});
});