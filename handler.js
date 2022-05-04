const router = require("./router");

// Function that handles the error that occured by logging it onto the console
// and exiting the process
function panic(error) {
	console.log(error);
	process.exit(-1);
}

// Function that handles the error that occured by logging it onto the console
// and attempting to recover the last "RECEIVE" state
function recover(error) {
	console.log(error);
	router.revertState();
}

module.exports = {
	panic,
	recover,
};
