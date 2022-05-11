const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

// The port that will be used by the server to listen to incoming messages
const serverPort = 8081;
// The address of the server's router
const routerAddress = "http://localhost:8001";

// Send the login label initially to the client
axios.post(routerAddress, {
	sender: "s",
	receiver: "c",
	payload: "login",
}).catch((err) => {
    console.log(
        `Error occurred when communicating with the router`
    );
    // Communication with the router cannot happen. Quit the process.
    process.exit(-1);
});

// Initial state of the server
let state = 1;

// Wait for POST requests on the root ('/') path
app.post("/", (req, res) => {
	res.end();
	if (state == 1) {
		// In this state the server receives the auth label from the authorization server
		state = 2;
	} else {
		// In this state the server receives the boolean from the authorization server denoting whether the
		// client is authorized or not
		if (req.body.payload) console.log("Client authorized!");
		else console.log("Authorization denied!");
        state = 1;
	}
});

setTimeout(() => {
    // Send the quit label to the client after 10 seconds
    axios.post(routerAddress, {
        sender: "s",
        receiver: "c",
        payload: "quit",
    }).catch((err) => {
        console.log(
            `Error occurred when communicating with the router`
        );
        // Communication with the router cannot happen. Quit the process.
        process.exit(-1);
    }).then(() => {
        process.exit(0);
    });
}, 10000);

// Start the server
app.listen(serverPort, () => {
	console.log(`Server listening on ${serverPort}`);
});
