// Express is a framework of Node.js that facilitates the development
// of HTTP servers. It abstracts away a lot of uneccessary details provided
// by the basic functionality of Node.js for creating HTTP servers. In the
// current template, it is used to listen for HTTP requests on the routes
// "/", "/api/alive", and to format the contents of the requests as JSON
const express = require("express");
// Axios is a Node.js package that is used to make HTTP requests to the router
const axios = require("axios");

const app = express();
app.use(express.json());

// The port that will be used by the service to listen to incoming messages
const servicePort = `<PORT>`;
// The address of the service's router
const routerAddress = `<ADDRESS>`;
// Whether the initial action has been taken or not
let actionTaken = false;

// Initial state of the service
let state = 1;

// Wait for POST requests on the root ('/') path: messages from the router
app.post("/", (req, res) => {
	res.end();
	switch(state){
        case 1:
            // Actions to be done in the first state
            console.log("State 1 action example");
            // transition to the new state
            state = 2;
            break;
        case 2:
            // Actions to be done in the second state
            console.log("State 2 action example");
            // transition to the new state
            state = 3;
            break;
        case 3:
            // Actions to be done in the second state
            console.log("State 3 action example");
            // transition to the new state
            state = 4;
            break;
        // Use as many states as needed. 1 state should correspond to 1 incoming message (label or value).
        // Actions happen inside the states, after the receipt of a message
    }
});

// Protocol violation handler
app.post("/api/violation", (req, res) => {
    res.end();
    console.log("PROTOCOL VIOLATION");
    process.exit(-1);
});

// Respond with an empty object to signal that the party is online
app.get("/api/alive", (req, res) => {
    res.end();
});

// Party can commence the transmission
app.post("/api/alive", (req, res) => {
    res.end();
    // If the service does not have to do anything initially, the following if statement can be deleted
    if(!actionTaken){
        actionTaken = true;
        // Initial actions go here
        console.log("Initial action example");
    }
});

// Start listening to incoming messages
app.listen(servicePort, () => {
    console.log(`Service listening on ${servicePort}`);
});