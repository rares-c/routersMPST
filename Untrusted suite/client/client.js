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
const clientPort = 8097;
// The address of the client's router
const routerAddress = "http://localhost:8007";

let state = 1;

// Wait for POST requests on the root ('/') path
app.post("/", (req, res) => {
	// End the response first
	res.end();
	switch (state) {
		case 1:
			// Initial state, the client receives either the coordinates or the missingCity label
			if (req.body.payload == "coordinates") {
				state = 2;
			} else {
				// Received the missingCity label
				console.log("City not found in the database");
				promptUser();
			}
			break;
		case 2:
			// Second state, the client receives the coordinates as a string
			console.log("Received coordinates, making weather request");
			// Forward coordinates to the weather process
			axios
				.post(routerAddress, {
					sender: "c",
					receiver: "w",
					payload: "coordinates",
				})
				.catch((_) => {
					console.log(`Error occurred when communicating with the router`);
					// Communication with the router cannot happen. Quit the process.
					process.exit(-1);
				})
				.then((_) => {
					// Send the city as a string after the label has been transmitted
					axios
						.post(routerAddress, {
							sender: "c",
							receiver: "w",
							payload: req.body.payload,
						})
						.catch((_) => {
							console.log(`Error occurred when communicating with the router`);
							// Communication with the router cannot happen. Quit the process.
							process.exit(-1);
						});
				});
			state = 3;
			break;
		case 3:
			// In the third state, the client receives the temperature label
			state = 4;
			break;
		case 4:
			// In the fourth state, the client receives the temperature in the given city
			console.log(`Received temperature: ${req.body.payload}`);
			promptUser();
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
    // Prompt the user for the API key and send it to the weather wrapper
	rl.question("Enter your API key: ", (key) => {
		axios
			.post(routerAddress, {
				sender: "c",
				receiver: "w",
				payload: "key",
			})
			.catch((_) => {
				console.log(`Error occurred when communicating with the router`);
				// Communication with the router cannot happen. Quit the process.
				process.exit(-1);
			})
			.then((_) => {
				axios
					.post(routerAddress, {
						sender: "c",
						receiver: "w",
						payload: key,
					})
					.catch((_) => {
						console.log(`Error occurred when communicating with the router`);
						// Communication with the router cannot happen. Quit the process.
						process.exit(-1);
					})
					.then((_) => promptUser()); // Prompt the user for any queries
			});
	});
});

// Function that prompts the user for a city or to quit the process
function promptUser() {
	rl.question("Enter the desired city (or QUIT to exit): ", (city) => {
		if (city == "QUIT") {
			// Client wants to exit, send a quit message to the database and terminate the process
			axios
				.post(routerAddress, {
					sender: "c",
					receiver: "d",
					payload: "quit",
				})
				.catch((_) => {
					console.log(`Error occurred when communicating with the router`);
					// Communication with the router cannot happen. Quit the process.
					process.exit(-1);
				})
				.then((_) => {
					rl.close();
					process.exit(0);
				});
		} else {
			// The client must now send a query to the database with the given city
			axios
				.post(routerAddress, {
					sender: "c",
					receiver: "d",
					payload: "city",
				})
				.catch((_) => {
					console.log(`Error occurred when communicating with the router`);
					// Communication with the router cannot happen. Quit the process.
					process.exit(-1);
				})
				.then((_) => {
					// Send the city as a string after the label has been transmitted
					axios
						.post(routerAddress, {
							sender: "c",
							receiver: "d",
							payload: city,
						})
						.catch((_) => {
							console.log(`Error occurred when communicating with the router`);
							// Communication with the router cannot happen. Quit the process.
							process.exit(-1);
						});
				});
		}
	});
}

// Start the client server
app.listen(clientPort, () => {
	console.log(`Client listening on ${clientPort}`);
});
