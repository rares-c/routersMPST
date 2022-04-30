const util = require("util");
const fs = require("fs");

// Function that obtains the relative projection of the pair (p,q) from the global type
function relativeProjection(p, q, globalType) {
	// Recursive traversal based on the structure of the global type
	switch (globalType["type"]) {
		case "RECURSION_DEFINITION":
			return projectRecursionDefinition(p, q, globalType);
		case "RECURSIVE_CALL":
			// Just a recursive call
			return globalType;
		case "EXCHANGE":
			return projectExchange(p, q, globalType);
		case "END":
			// End of the protocol
			return globalType;
	}
}

// Function that computes the relative projection of a recursion definition
function projectRecursionDefinition(p, q, globalType) {
	// Recursion definition, check the contractiveness of the continuation
	if (
		isContractive(
			relativeProjection(p, q, globalType["protocolContinuation"]),
			globalType["recursionVariable"]
		)
	) {
		return {
			type: "RECURSION_DEFINITION",
			recursionVariable: globalType["recursionVariable"],
			protocolContinuation: relativeProjection(
				p,
				q,
				globalType["protocolContinuation"]
			),
		};
	} else {
		// Either non-contractive or undefined
		return {
			type: "END",
		};
	}
}

// Function that computes the relative projection of a message exchange
function projectExchange(p, q, globalType) {
	if (
		(p == globalType["sender"] && q == globalType["receiver"]) ||
		(q == globalType["sender"] && p == globalType["receiver"])
	) {
		const returnType = {
			type: "EXCHANGE",
			sender: globalType["sender"],
			branches: {},
		};
		// For each label, compute the relative projection of the continuation
		Object.keys(globalType["branches"]).forEach((label) => {
			returnType["branches"][label] = {
				valueType: globalType["branches"][label]["valueType"],
				protocolContinuation: relativeProjection(
					p,
					q,
					globalType["branches"][label]["protocolContinuation"]
				),
			};
		});
		return returnType;
	} else {
		return ddep(p, q, globalType);
	}
}

// Function that checks whether the given relative type is contractive or not.
function isContractive(relativeType, recursionVariable) {
	switch (relativeType["type"]) {
		case "RECURSIVE_CALL":
			if (recursionVariable != relativeType["recursionVariable"]) return true;
			else return false;
		case "EXCHANGE":
			return true;
		case "END":
			return false;
		case "RECURSION_DEFINITION":
			return isContractive(
				relativeType["protocolContinuation"],
				recursionVariable
			);
		case "DEPENDENCY":
			return true;
	}
}

// Function that computes the dependencies, if possible, of a given exchange
function ddep(p, q, globalType) {
	const branchesProjections = [];
	Object.keys(globalType["branches"]).forEach((label) => {
		branchesProjections.push(
			relativeProjection(
				p,
				q,
				globalType["branches"][label]["protocolContinuation"]
			)
		);
	});
	let allEqual = true;
	for (let i = 0; i < branchesProjections.length; i++) {
		for (let j = i + 1; j < branchesProjections.length; j++) {
			if (
				!util.isDeepStrictEqual(branchesProjections[i], branchesProjections[j])
			)
				allEqual = false;
		}
	}
	if (allEqual) {
		// All branches are equal, not a non-local choice, just select one of them and omit the skip
		return branchesProjections[0];
	}
	const returnType = {
		type: "DEPENDENCY",
		branches: {},
		sender: globalType["sender"],
		receiver: globalType["receiver"],
	};
	if (p == globalType["sender"] || q == globalType["sender"]) {
		// Output dependency
		returnType["dependencyType"] = "OUTPUT";
	} else if (p == globalType["receiver"] || q == globalType["receiver"]) {
		// Input dependency
		returnType["dependencyType"] = "INPUT";
	} else {
        // Undefined, throw an error
		throw "Undefined relative type";
	}
	Object.keys(globalType["branches"]).forEach((label) => {
		returnType["branches"][label] = {
			protocolContinuation: relativeProjection(
				p,
				q,
				globalType["branches"][label]["protocolContinuation"]
			),
		};
	});
	return returnType;
}

const CSA = JSON.parse(fs.readFileSync("./Protocols/CSA.json", "utf8"));
const r = relativeProjection("c", "s", CSA["globalType"]);

// Uncomment to use the global type from Example 3, and comment the two lines above
// const Example3 = JSON.parse(fs.readFileSync("./Protocols/Example3.json", "utf8"));
// const r = relativeProjection("q", "s", Example3["globalType"]);

// Uncomment to see an undefined relative projection generate an error
// const error = JSON.parse(fs.readFileSync("./Protocols/Error.json", "utf8"));
// const r = relativeProjection("r", "s", error["globalType"]);

console.log(util.inspect(r, false, null, true));
