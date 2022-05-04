# Protocol conformance verification tool
This tool was developed as part of the Bachelor's project of Rares Dobre. Supervisors: Bas van den Heuvel, Jorge A. Pérez.


## Requirements
- Node - download [link](https://nodejs.org/en/download/)
- npm - installation guide [link](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)

## How to run the project
To run the router, the modules have to be installed first, and then the router can be started. Execute

```
npm install
node router.js
``` 


in a terminal window.

For now, the router is configured to listen on port `8080` for HTTP requests. There is a test server defined to inspect all the messages forwarded by the router in `testserver.js`. To start the test server, simply execute

```
node testserver.js
```

HTTP requests can now be sent to the router by sending them to the address `http://localhost:8080`. Tools like Insomnia or Postman come in handy, because they allow us to specify what types of requests to do and more. The routers are configured to listen to HTTP POST requests on the root ('/') path. An example of an acceptable HTTP request is:
```
URL: http://localhost:8080
Method: POST
Body: {
    "sender": "s",
    "receiver": "c",
    "payload": "login"
}
```
Upon receiving the HTTP request, the router will log its actions, such as the receipt of a message, to the console.