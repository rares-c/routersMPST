const express = require("express");
const axios = require("axios");
const readline = require("readline");

// Create an interface for reading the user's input from the console
const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
});
const app = express();
app.use(express.json());

// The port that will be used by the client to listen to incoming messages
const clientPort = 8080;
// The address of the client's router
const routerAddress = "http://localhost:8000";

// Wait for POST requests on the root ('/') path
app.post("/", (req, res) => {
	// End the response first
	res.end();
	if (req.body.payload == "login") {
		// The server asked the client to login
		console.log("Attempting to authorize");
		// Prompt the user for its password
		rl.question("Enter your password: ", (password) => {
			// The client must now send the authorization server the label passwd together with its password
			axios
				.post(routerAddress, {
					sender: "c",
					receiver: "a",
					payload: "passwd",
				})
				.catch((_) => {
					console.log(`Error occurred when communicating with the router`);
					// Communication with the router cannot happen. Quit the process.
					process.exit(-1);
				})
				.then((_) => {
					// Send the password after the passwd label has been transmitted
					axios
						.post(routerAddress, {
							sender: "c",
							receiver: "a",
							payload: password,
						})
						.catch((_) => {
							console.log(`Error occurred when communicating with the router`);
							// Communication with the router cannot happen. Quit the process.
							process.exit(-1);
						});
				});
		});
	} else {
		// The server asked the client to quit
		console.log("Quitting the protocol");
		// The client must send the authorization server a quit label
		axios
			.post(routerAddress, {
				sender: "c",
				receiver: "a",
				payload: "quit",
			})
			.catch((_) => {
				console.log(`Error occurred when communicating with the router`);
				// Communication with the router cannot happen. Quit the process.
				process.exit(-1);
			})
			.then(() => {
				// Protocol is terminated
				rl.close();
				process.exit(0);
			});
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

// Start the client server
app.listen(clientPort, () => {
	console.log(`Client listening on ${clientPort}`);
});
