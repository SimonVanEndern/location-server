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
          let publicKey = "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAp/he1JTafLx5ngpLKe2YL/dCvphetQNg6e2zw6ive+crGwwSkF3oyY7adyGxTWBQOcgBwYg67KJQaIhdgA3noRaSidJBbXPqNBxulr1GFaBq3SZh0l+YbajznU0EaeI/ENElTAs605/jkzMXdtq7cF3kbkdLOi2jLCN42H3C5EDR8UPDMifyrRl66p3IsapTuLVPoBU+lWSsRnxa4ZQuAAJy1OrzdqNFrfF355TD03gi+d/Fz4A29lDtaZ1eXxz9H8RkfCQclXR79D7ih4p7+KNKjm8IisQ6auceBNYaZm9q+TXPN9Wo1tYyGIZOeFp1xddcVk47zJPBprDmHWAGKwIDAQAB\n-----END PUBLIC KEY-----"
      		let user = {"publicKey": publicKey}
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
			let publicKey = "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAp/he1JTafLx5ngpLKe2YL/dCvphetQNg6e2zw6ive+crGwwSkF3oyY7adyGxTWBQOcgBwYg67KJQaIhdgA3noRaSidJBbXPqNBxulr1GFaBq3SZh0l+YbajznU0EaeI/ENElTAs605/jkzMXdtq7cF3kbkdLOi2jLCN42H3C5EDR8UPDMifyrRl66p3IsapTuLVPoBU+lWSsRnxa4ZQuAAJy1OrzdqNFrfF355TD03gi+d/Fz4A29lDtaZ1eXxz9H8RkfCQclXR79D7ih4p7+KNKjm8IisQ6auceBNYaZm9q+TXPN9Wo1tYyGIZOeFp1xddcVk47zJPBprDmHWAGKwIDAQAB\n-----END PUBLIC KEY-----"
      let user = {"publicKey": publicKey}
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