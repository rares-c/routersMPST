const express = require("express");
const axios = require("axios");

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
    if(req.body.payload == "login") {
        // The server asked the client to login
        console.log("Attempting to authorize");
        // The client must now send the authorization server the label passwd together with a password
        axios.post(routerAddress, {
            sender: "c",
            receiver: "a",
            payload: "passlllllwd"
        }).catch((err) => {
            console.log(
                `Error occurred when communicating with the router`
            );
            // Communication with the router cannot happen. Quit the process.
            process.exit(-1);
        });
        axios.post(routerAddress, {
            sender: "c",
            receiver: "a",
            payload: "notSoSecretPassword"
        }).catch((err) => {
            console.log(
                `Error occurred when communicating with the router`
            );
            // Communication with the router cannot happen. Quit the process.
            process.exit(-1);
        });
    } else {
        // The server asked the client to quit
        console.log("Quitting the protocol");
        // The client must send the authorization server a quit label
        axios.post(routerAddress, {
            sender: "c",
            receiver: "a",
            payload: "quit"
        }).catch((err) => {
            console.log(
                `Error occurred when communicating with the router`
            );
            // Communication with the router cannot happen. Quit the process.
            process.exit(-1);
        }).then(() => {
            // Protocol is terminated
            process.exit(0);
        });
    }
});

// Start the client server
app.listen(clientPort, () => {
    console.log(`Client listening on ${clientPort}`);
});
