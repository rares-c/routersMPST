const projector = require("./projector");
const checker = require("./typechecker");
const synthesizer = require("./synthesizer");
const fs = require("fs");
const express = require("express");
const axios = require("axios").default;
const chalk = require("chalk");

let currentState, participants, lastReceiveState, partyOnline, networkOnline;

// Function that forwards a received message to its corresponding receivers
async function forwardMessage(message, p) {
	// Keep track of all the requests that were sent in order to wait for them if the protocol is finalised
	const requests = [];
	if (message["receiver"] != currentState["to"]) {
		// The received message's recipient does not conform to the expected recipient
		throw `The received message is intended for ${message["receiver"]}, while the message had to be sent to ${currentState["to"]}\nPROTOCOL VIOLATION`;
	}
	console.log(
		`Forwarding message to actual receiver ${JSON.stringify(message)}`
	);
	// Forward the message to the actual receiver
	requests.push(
		axios.post(participants[currentState["to"]], message).catch((err) => {
			console.log(
				`Error occurred when communicating with ${currentState["to"]}`
			);
			// Communication with other routers cannot happen, even after 3 retries. Quit the process.
			process.exit(-1);
		})
	);
	// Forward the message to every dependency
	currentState["deps"].forEach((d) => {
		console.log(
			`Forwarding message to dependency ${JSON.stringify({
				sender: p,
				receiver: d,
				payload: message["payload"],
			})}`
		);
		requests.push(
			axios
				.post(participants[d], {
					sender: p,
					receiver: d,
					payload: message["payload"],
				})
				.catch((err) => {
					console.log(`Error occurred when communicating with ${d}`);
					// Communication with other routers cannot happen, even after 3 retries. Quit the process.
					process.exit(-1);
				})
		);
	});
	// Advance to the next state
	currentState = currentState["continuation"];
	if (currentState["actionType"] == "END") {
		// Protocol finished, safe to quit the router
		console.log("Protocol finalised. Shutting down router.");
		// Wait for all requests to settle, such that all the other routers have received the intended messages
		await Promise.all(requests);
		process.exit(0);
	}
}

// Function that changes the current state of the finite state machine according to the received message.
// It checks whether the router is supposed to receive a label/value, and moves on to forward it to the
// actual receivers
function messageReceived(message, p) {
	console.log(`Received message ${JSON.stringify(message)}`);
	lastReceiveState = currentState;
	if (message["sender"] != currentState["from"]) {
		// Received a message from a different participant, protocol violation
		throw `Received message from ${message["sender"]}, expected to receive message from ${currentState["from"]}\nPROTOCOL VIOLATION`;
	} else if (
		currentState["messageType"] == "LABEL" &&
		typeof message["payload"] != "string"
	) {
		// Received a message that contains a value instead of a label
		throw `The received message from ${message["sender"]} does not contain a label\nPROTOCOL VIOLATION`;
	} else if (
		currentState["messageType"] == "LABEL" &&
		!(message["payload"] in currentState["branches"])
	) {
		// Received an unknown label from the correct sender
		throw `The received message from ${message["sender"]} contains an unknown label\nPROTOCOL VIOLATION`;
	} else if (
		(currentState["messageType"] == "str" &&
			typeof message["payload"] != "string") ||
		(currentState["messageType"] == "int" &&
			!Number.isInteger(message["payload"])) ||
		(currentState["messageType"] == "bool" &&
			typeof message["payload"] != "boolean")
	) {
		// The type of the actual value that was sent does not match the type of the expected value
		throw `The received message from ${
			message["sender"]
		} contains a ${typeof message["payload"]}, while the router expected a ${
			currentState["messageType"]
		}`;
	}
	// The sender of the message matches the expected sender, and the payload conforms to the expected type.
	// Forward the message to the required destinations.
	if (currentState["messageType"] == "LABEL") {
		currentState = currentState["branches"][message["payload"]];
	} else {
		currentState = currentState["continuation"];
	}
	if (currentState["actionType"] == "END") {
		// Protocol finished, safe to quit the router
		console.log("Protocol finalised. Shutting down router.");
		process.exit(0);
	}
	if (currentState["actionType"] == "SEND") {
		// After receiving a message, check if it needs to be forwarded to the actual receiver.
		// This check is vital when the wrapped party depends on both the output of the sender and the
		// input of a receiver, as the action sequence would be RECEIVE-SEND-RECEIVE
		forwardMessage(message, p);
	}
}

// Function that handles the error that occurred by logging it onto the console
// and exiting the process
function panic(error) {
	console.log(error);
	process.exit(-1);
}

// Function that handles the error that occurred by logging it onto the console
// and attempting to recover the last "RECEIVE" state
function recover(error) {
	console.log(error);
	currentState = lastReceiveState;
}

// Function that checks whether the party at the given address is online through a GET request to
// the route /api/alive
async function checkParty(participant, qs, participants) {
	await axios
		.get(participants[participant] + "/api/alive", { timeout: 100 })
		.then((_) => {
			console.log(
				`Implementing party ${participant} ` + chalk.green("online") + "."
			);
			partyOnline = true;
		})
		.catch((_) => {
			console.log(
				`Check party for participant ${participant}` +
					chalk.red("failed") +
					`. Aborting...`
			);
			process.exit(-1);
		});
	// Check the status of the rest of the network
	waitOnNetwork(participant, qs, participants);
}

// Function that checks whether the rest of the network is online
async function waitOnNetwork(p, qs, participants) {
	const online = {};
	while (qs.length > 0) {
		const failed = [];
		for (let i = 0; i < qs.length; i++) {
			await axios
				.get(participants[qs[i]] + "/api/alive", { timeout: 100 })
				.then((_) => {
					console.log(`Router for participant ${qs[i]} ` + chalk.green("online"));
				})
				.catch((_) => {
					if (!(qs[i] in online)) {
						console.log(`Router for participant ${qs[i]} ` + chalk.red("not online"));
						online[qs[i]] = false;
					}
					failed.push(qs[i]);
				});
		}
		qs = failed;
	}
	networkOnline = true;
	// Signal the implementing party that the transmission can commence
	signalParty(p, participants[p]);
}

// Function that sends the given party a message to confirm that the communication can begin
async function signalParty(p, address) {
	await axios.post(address + "/api/alive").catch((_) => {
		console.log(
			`Could not communicate with party ${p} to begin the communication. Aborting...`
		);
		process.exit(-1);
	});
}

// Function that initialises a router. It reads the protocol, checks the global type for errors, checks for
// relative wellformedness, and then computes the process corresponding to it.
function initialise(protocolPath) {
	partyOnline = false;
	networkOnline = false;
	// Parse protocol
	const protocol = JSON.parse(fs.readFileSync(protocolPath, "utf8"));
	// Check for the correct specification of the protocol
	checker.checkGlobalType(protocol["globalType"], [], protocol["participants"]);
	// Check for relative wellformedness
	projector.checkWellformedness(
		protocol["globalType"],
		protocol["participants"]
	);
	const p = protocol["implementingParty"];
	const qs = [];
	Object.keys(protocol["participants"]).forEach((participant) => {
		if (participant != p) qs.push(participant);
	});
	// Obtain the finite state machine corresponding to the given router process
	currentState = synthesizer.createMachine(protocol["globalType"], p, qs);
	participants = protocol["participants"];
	// Create an HTTP server an wait for incoming message
	const app = express();
	app.use(express.json());
	app.post("/", (req, res) => {
		if (!networkOnline || !partyOnline) {
			console.log(
				`Received message ${req.body}, but the handshake was not complete`
			);
			res.end();
			return;
		}
		try {
			// On each received message, transition to new states
			messageReceived(req.body, p);
			res.end();
		} catch (error) {
			res.end();
			// Protocol violation, delegate the handling of the error to the appropriate function
			panic(error);
		}
	});
	app.get("/api/alive", (_, res) => {
		if (!partyOnline) res.status(400);
		res.end();
	});
	app.listen(protocol["routerPort"], () => {
		console.log(`Router for ${p} listening on port ${protocol["routerPort"]}`);
	});
	// Check whether implementing party is online
	checkParty(p, [...qs], participants);
}

// Initialise the router with the protocol given as an argument
initialise(process.env.PROTOCOL_PATH);
