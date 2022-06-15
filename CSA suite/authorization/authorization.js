const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

// The port that will be used by the authorization server to listen to incoming messages
const authorizationPort = 8082;
// The address of the authorization's router
const routerAddress = "http://localhost:8002";

// The initial state of the authorization server
let state = 1;

// Wait for POST requests on the root ('/') path
app.post("/", (req, res) => {
	// End the response first
	res.end();
	switch (state) {
		case 1:
			// Initial state when the authorization must wait for the chosen label from the server
			if (req.body.payload == "login") state = 2;
			else state = 3;
			break;
		case 2:
			// The server asked the client to log in
			// In this state the authorization receives a label passwd from the client
			console.log("Authorizing client");
			state = 4;
			break;
		case 3:
			// The server asked the client to quit
			// In this state the authorization receives the quit label from the client, terminate the process
			console.log("Quitting the process");
			process.exit(0);
		case 4:
			// In this state the authorization received a password from the client. If the password is the correct
			// one, the server will receive a value of "true" from the authorization server, and "false" otherwise
			console.log("Verifying password");
			const authorized = req.body.payload == "secretPassword";
			// Send the auth label first
			axios
				.post(routerAddress, {
					sender: "a",
					receiver: "s",
					payload: "auth",
				})
				.catch((_) => {
					console.log(`Error occurred when communicating with the router`);
					// Communication with the router cannot happen. Quit the process.
					process.exit(-1);
				})
				.then((_) => {
					// Send the boolean value denoting the authorization status of the client after
					// the auth label has been sent
					axios
						.post(routerAddress, {
							sender: "a",
							receiver: "s",
							payload: authorized,
						})
						.catch((_) => {
							console.log(`Error occurred when communicating with the router`);
							// Communication with the router cannot happen. Quit the process.
							process.exit(-1);
						});
				});
			// Transition back to the initial state
			state = 1;
			break;
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
});

// Start the authorization server
app.listen(authorizationPort, () => {
	console.log(`Authorization listening on ${authorizationPort}`);
});
