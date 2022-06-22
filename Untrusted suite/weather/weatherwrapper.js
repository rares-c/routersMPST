const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

// The port that will be used by the weather wrapper to listen to incoming messages
const weatherPort = 8099;
// The address of the weather wrapper's router
const routerAddress = "http://localhost:8009";

// The initial state of the weather wrapper
let state = 1;
let API_KEY;

// Wait for POST requests on the root ('/') path
app.post("/", (req, res) => {
	// End the response first
	res.end();
	switch (state) {
		case 1:
			// Initial state, the weather wrapper receives the key label
			state = 2;
			break;
		case 2:
			// The weather wrapper receives the API key as a string
			API_KEY = req.body.payload;
			state = 3;
			break;
		case 3:
			// The weather wrapper receives the dependency labels city or quit
			if (req.body.payload == "city") {
				// Client asked the database for a city
				state = 4;
			} else {
				// Client asked the database to quit, terminate the weather wrapper
				process.exit(0);
			}
			break;
		case 4:
			// The weather wrapper receives the dependency labels coordinates or missingCity
			if (req.body.payload == "coordinates") {
				// The city requested by the client is in the database
				state = 5;
			} else {
				// The city requested by the client is absent from the database
				state = 3;
			}
			break;
		case 5:
			// The weather wrapper receives the coordinates label from the client
			state = 6;
			break;
		case 6:
			// The weather wrapper receives the coordinates as a string from the client
			const coords = req.body.payload.split(" ");
			axios
				.get(
					`https://api.openweathermap.org/data/2.5/weather?lat=${coords[0]}&lon=${coords[1]}&appid=${API_KEY}&units=metric`
				)
				.catch((_) => {
					console.log("Error occurred when communicating with the weather API");
					process.exit(-1);
				})
				.then((res) => {
					// Send the temperature label to the client
					console.log(
						`Temperature of the requested coordinates: ${res.data.main.temp}`
					);
					axios
						.post(routerAddress, {
							sender: "w",
							receiver: "c",
							payload: "temperature",
						})
						.catch((_) => {
							console.log(`Error occurred when communicating with the router`);
							// Communication with the router cannot happen. Quit the process.
							process.exit(-1);
						})
						.then((_) => {
							// Send the actual temperature value of the given city
							axios
								.post(routerAddress, {
									sender: "w",
									receiver: "c",
									payload: res.data.main.temp,
								})
								.catch((_) => {
									console.log(
										`Error occurred when communicating with the router`
									);
									// Communication with the router cannot happen. Quit the process.
									process.exit(-1);
								});
						});
				});
			state = 3;
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

// Start the weather wrapper
app.listen(weatherPort, () => {
	console.log(`Weather wrapper listening on ${weatherPort}`);
});
