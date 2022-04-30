const fs = require("fs");

// Function that checks a global type recursively, in a depth-first manner
// 3 errors are checked:
// -- All exchanges involve participants defined in the participants list
// -- All recursive calls use a variable defined beforehand
// -- All recursion definitions use free variables
function checkGlobalType(globalType, recursiveVariables, participants) {
	switch (globalType["type"]) {
		case "EXCHANGE":
			if (
				!(globalType["sender"] in participants) ||
				!(globalType["receiver"] in participants)
			) {
				throw "Undefined sender/receiver for exchange";
			}
			// Check each branch
			Object.keys(globalType["branches"]).forEach((label) => {
				checkGlobalType(
					globalType["branches"][label]["protocolContinuation"],
					recursiveVariables,
					participants
				);
			});
			break;
		case "RECURSIVE_CALL":
			if (!recursiveVariables.includes(globalType["recursionVariable"]))
				throw (
					"Recursive call to undefined variable " +
					globalType["recursionVariable"]
				);
			break;
		case "RECURSION_DEFINITION":
			if (recursiveVariables.includes(globalType["recursionVariable"]))
				throw (
					"Redefinition of recursion on variable " +
					globalType["recursionVariable"]
				);
			checkGlobalType(
				globalType["protocolContinuation"],
				[...recursiveVariables, globalType["recursionVariable"]],
				participants
			);
			break;
	}
}

const errorProtocol = JSON.parse(
	fs.readFileSync("./Protocols/TypeError.json", "utf8")
);
checkGlobalType(errorProtocol["globalType"], [], errorProtocol["participants"]);
