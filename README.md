# Aggregation server
This is a lightwight node.js server for working with an [Android App](https://github.com/SimonVanEndern/location-app) that collects location and movement data. The data is aggregated by the server in a decentralized manner and stored publicly available. 

## Getting Started
Run a mongoDB instance locally (via "service mongod start")
Then run "npm install"
Then run "npm start"
This will start the server on port 8888 of your local machine

### Prerequisites
You have to have node.js and mongoDB installed.

## Running the tests
All tests can be run via "npm test"

###
The tests are integration tests written against the API exposed by the Webserver.
All background functionality is automatically tested with those tests.

## Deployment
For deploying the server on a live system, one has to replace the IP address of the globally available MongoDB instance in the first line of [repository.js](repository.js)

## Built with

* [Express](https://expressjs.com/) - The web framework used
* [MongoDB](https://www.mongodb.com/) - The NoSQL object store used as database

## Contributing

I will be happy if this project will serve not only as a base for further related research projects but will also be further developed by those researchers instead of forking into other projects.

## Authors

Simon van Endern

## License

This project is licensed under the GNU GPL v3.0 License - see the [LICENSE.md](LICENSE.md) file for details
