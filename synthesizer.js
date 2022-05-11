const projector = require("./projector");

// Function that returns the router process corresponding to participant p and the given global type
function synthesize(globalType, p, qs) {
	switch (globalType["type"]) {
		case "EXCHANGE":
			return synthesizeExchange(globalType, p, qs);
		case "RECURSION_DEFINITION":
			return synthesizeDefinition(globalType, p, qs);
		case "RECURSIVE_CALL":
			return synthesizeCall(globalType, p, qs);
		case "END":
			return {
				actionType: "END",
			};
	}
}

// Function that returns the router process corresponding to a given exchange
function synthesizeExchange(globalType, p, qs) {
	const deps = [];
	qs.forEach((q) => {
		if (hdep(q, p, globalType)) deps.push(q);
	});
	if (p == globalType["sender"] || p == globalType["receiver"]) {
		// Receive the label
		const returnState = {
			actionType: "RECEIVE",
			messageType: "LABEL",
			from: globalType["sender"],
			branches: {},
		};
		Object.keys(globalType["branches"]).forEach((label) => {
			// Send the label to all dependencies, and then receive the value & forward it to the recipient
			returnState["branches"][label] = {
				actionType: "SEND",
				to: globalType["receiver"],
				deps: deps,
				continuation: {},
			};
			if (globalType["branches"][label]["valueType"] == "unit") {
				// If the message that was sent is supposed to have a unit type, no further value will be sent
				returnState["branches"][label]["continuation"] = synthesize(
					globalType["branches"][label]["protocolContinuation"],
					p,
					qs
				);
			} else {
				// The message implies a value of some type, receive it from the sender and forward it to the receiver
				returnState["branches"][label]["continuation"] = {
					actionType: "RECEIVE",
					messageType: globalType["branches"][label]["valueType"],
					from: globalType["sender"],
					continuation: {
						actionType: "SEND",
						to: globalType["receiver"],
						deps: [],
						continuation: synthesize(
							globalType["branches"][label]["protocolContinuation"],
							p,
							qs
						),
					},
				};
			}
		});
		return returnState;
	} else if (p != globalType["sender"] && p != globalType["receiver"]) {
		const depon_s =
			qs.includes(globalType["sender"]) &&
			hdep(p, globalType["sender"], globalType);
		const depon_r =
			qs.includes(globalType["receiver"]) &&
			hdep(p, globalType["receiver"], globalType);
		if (depon_s && !depon_r) {
			// p only depends on an output from the sender. Wait for a label from the sender, and forward it
			// to p
			const returnState = {
				actionType: "RECEIVE",
				messageType: "LABEL",
				from: globalType["sender"],
				branches: {},
			};
			Object.keys(globalType["branches"]).forEach((label) => {
				// Send the label to p
				returnState["branches"][label] = {
					actionType: "SEND",
					to: p,
					deps: [],
					continuation: synthesize(
						globalType["branches"][label]["protocolContinuation"],
						p,
						qs
					),
				};
			});
			return returnState;
		} else if (!depon_s && depon_r) {
			// p only depends on an input from the receiver. Wait for a label from the receiver, and forward it
			// to p
			const returnState = {
				actionType: "RECEIVE",
				messageType: "LABEL",
				from: globalType["receiver"],
				branches: {},
			};
			Object.keys(globalType["branches"]).forEach((label) => {
				// Send the label to p
				returnState["branches"][label] = {
					actionType: "SEND",
					to: p,
					deps: [],
					continuation: synthesize(
						globalType["branches"][label]["protocolContinuation"],
						p,
						qs
					),
				};
			});
			return returnState;
		} else if (depon_s && depon_r) {
			// p only depends on an input from the sender and on an input from the receiver. Wait for the label
			// from the sender, forward it to p, wait for the input from the receiver,
			const returnState = {
				actionType: "RECEIVE",
				messageType: "LABEL",
				from: globalType["sender"],
				branches: {},
			};
			Object.keys(globalType["branches"]).forEach((label) => {
				// Send the label to p
				returnState["branches"][label] = {
					actionType: "SEND",
					to: p,
					deps: [],
					continuation: {
						actionType: "RECEIVE",
						messageType: "LABEL",
						from: globalType["receiver"],
						branches: {},
					},
				};
				returnState["branches"][label]["continuation"]["branches"][label] =
					synthesize(
						globalType["branches"][label]["protocolContinuation"],
						p,
						qs
					);
			});
			return returnState;
		} else {
			const firstBranchContinuation =
				globalType["branches"][Object.keys(globalType["branches"])[0]][
					"protocolContinuation"
				];
			return synthesize(firstBranchContinuation, p, qs);
		}
	}
}

// Function that returns the router process corresponding to a recursion definition
function synthesizeDefinition(globalType, p, qs) {
	const qsPrime = [];
	qs.forEach((q) => {
		if (projector.relativeProjection(p, q, globalType)["type"] != "END")
			qsPrime.push(q);
	});
	if (qsPrime.length > 0) {
		return {
			actionType: "RECURSION_DEFINITION",
			recursionVariable: globalType["recursionVariable"],
			continuation: synthesize(globalType["protocolContinuation"], p, qsPrime),
		};
	} else {
		return {
			actionType: "END",
		};
	}
}

// Function that returns the router process corresponding to a recursive call
function synthesizeCall(globalType, p, qs) {
	return {
		actionType: "RECURSIVE_CALL",
		recursionVariable: globalType["recursionVariable"],
	};
}

// Function that computes whether the given exchange affects the communication
// between p and q
function hdep(p, q, exchange) {
	return (
		exchange["type"] == "EXCHANGE" &&
		(q == exchange["sender"] || q == exchange["receiver"]) &&
		p != exchange["sender"] &&
		p != exchange["receiver"] &&
		!projector.ddep(p, q, exchange)[0]
	);
}

// Function that transforms the router process into its corresponding state machine
// The process is traversed recursively, recursive definitions are removed, and recursive calls are transformed
// into transitions to previous states
function transform(process, recursiveDefs, pendingVars) {
	let returnState = JSON.parse(JSON.stringify(process));
	switch (process["actionType"]) {
		case "RECEIVE":
			pendingVars.forEach((v) => {
				recursiveDefs[v] = returnState;
			});
			if (process["messageType"] == "LABEL") {
				// Need to transform each branch separately
				Object.keys(process["branches"]).forEach((label) => {
					returnState["branches"][label] = transform(
						returnState["branches"][label],
						recursiveDefs,
						[]
					);
				});
			} else {
				// No possible branches, just transform the continuation
				returnState["continuation"] = transform(
					returnState["continuation"],
					recursiveDefs,
					[]
				);
			}
			break;
		case "SEND":
			pendingVars.forEach((v) => {
				recursiveDefs[v] = returnState;
			});
			// Just transform the continuation
			returnState["continuation"] = transform(
				returnState["continuation"],
				recursiveDefs,
				[]
			);
			break;
		case "RECURSION_DEFINITION":
			// New recursive variable that must be replaced by the next state. Push it to the list of
			// pending variables, and transform the continuation. A list of pending recursive variables
			// is needed for sequences of recursion definitions.
			pendingVars.push(returnState["recursionVariable"]);
			returnState = transform(
				returnState["continuation"],
				recursiveDefs,
				pendingVars
			);
			break;
		case "RECURSIVE_CALL":
			// Replace the recursive call by a transition to the recursive definition
			returnState = recursiveDefs[returnState["recursionVariable"]];
			break;
	}
	return returnState;
}

// Function that computes the finite state machine corresponding to the global type, and the implementing party p
function createMachine(globalType, p, qs){
    return transform(synthesize(globalType, p, qs), {}, []);
}

module.exports = {
    createMachine
}