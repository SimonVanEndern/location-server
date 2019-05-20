process.env.NODE_ENV = 'test';

//Require the dev-dependencies
let chai = require('chai');
let chaiHttp = require('chai-http');
let server = require('../server');
let Repository = require('../repository');
let should = chai.should();

chai.use(chaiHttp);
//Our parent block
describe('Books', () => {
    beforeEach((done) => { //Before each test we empty the database
        Repository.removeAllUsers();
        done();           
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
                  //res.body.should.be.a('array');
                  //res.body.length.should.be.eql(0);
              		done();
            	});
  		});
	});
});