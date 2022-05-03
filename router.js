const projector = require("./projector");
const util = require("util");
const fs = require("fs");

let newState = 0;

// Function that creates a DFSM used to run a router
function synthesize(
	globalType,
	p,
	qs,
	recursiveDefs,
	to,
	dependencies,
	valueType,
	states
) {
	let state = {
		transitions: {},
		to: to,
		deps: dependencies,
		valueType: valueType,
	};
	const currentState = newState;
	states[newState.toString(10)] = state;
	switch (globalType["type"]) {
		case "EXCHANGE":
			const deps = [];
			qs.forEach((q) => {
				if (hdep(q, p, globalType) && q != globalType["receiver"]) deps.push(q);
			});
			if (p == globalType["sender"] || p == globalType["receiver"]) {
				state["transitions"][globalType["sender"]] = {};
				Object.keys(globalType["branches"]).forEach((label) => {
					newState++;
					state["transitions"][globalType["sender"]][label] = newState;
					synthesize(
						globalType["branches"][label]["protocolContinuation"],
						p,
						qs,
						recursiveDefs,
						globalType["receiver"],
						[...deps],
						globalType["branches"][label]["valueType"],
						states
					);
				});
			} else if (p != globalType["sender"] && p != globalType["receiver"]) {
				const depon_s =
					qs.includes(globalType["sender"]) &&
					hdep(p, globalType["sender"], globalType);
				const depon_r =
					qs.includes(globalType["receiver"]) &&
					hdep(p, globalType["receiver"], globalType);
				if ((depon_s && !depon_r) || (depon_r && !depon_s)) {
					state["transitions"][globalType["sender"]] = {};
					Object.keys(globalType["branches"]).forEach((label) => {
						newState++;
						state["transitions"][globalType["sender"]][label] = newState;
						synthesize(
							globalType["branches"][label]["protocolContinuation"],
							p,
							qs,
							recursiveDefs,
							p,
							[],
							NaN,
							states
						);
					});
				} else if (depon_r && depon_s) {
					state["transitions"][globalType["sender"]] = {};
					Object.keys(globalType["branches"]).forEach((label) => {
						newState++;
						state["transitions"][globalType["sender"]][label] = newState;
						const intermediaryState1 = {
							transitions: {},
							to: p,
							deps: [],
							valueType: NaN,
						};
						states[newState.toString(10)] = intermediaryState1;
						intermediaryState1["transitions"][globalType["receiver"]] = {};
						newState++;
						intermediaryState1["transitions"][globalType["receiver"]][label] =
							newState;
						synthesize(
							globalType["branches"][label]["protocolContinuation"],
							p,
							qs,
							recursiveDefs,
							p,
							[],
							NaN,
							states
						);
					});
				} else {
					newState++;
					const newStateId = newState;
					// Return the synthesis of any branch
					synthesize(
						globalType["branches"][Object.keys(globalType["branches"])[0]][
							"protocolContinuation"
						],
						p,
						qs,
						recursiveDefs,
						to,
						dependencies,
						valueType,
						states
					);
					states[currentState.toString(10)] = states[newStateId.toString(10)];
				}
			}
			break;
		case "RECURSION_DEFINITION":
			const qsPrime = [];
			qs.forEach((q) => {
				if (projector.relativeProjection(p, q, globalType)["type"] != "END")
					qsPrime.push(q);
			});
			if (qsPrime.length > 0) {
				newState++;
				recursiveDefs[globalType["recursionVariable"]] = newState;
				const newStateId = newState;
				synthesize(
					globalType["protocolContinuation"],
					p,
					qs,
					recursiveDefs,
					to,
					dependencies,
					valueType,
					states
				);
				states[currentState.toString(10)] = states[newStateId.toString(10)];
			}
			break;
		case "RECURSIVE_CALL":
			states[currentState.toString(10)]["transitions"] =
				states[recursiveDefs[globalType["recursionVariable"]].toString(10)][
					"transitions"
				];
			break;
	}
}

// Function that computes whether the given exchange affects the communication
// between p and q
function hdep(p, q, exchange) {
	return (
		exchange["type"] == "EXCHANGE" &&
		(q == exchange["sender"] || q == exchange["receiver"]) &&
		!projector.ddep(p, q, exchange)[0]
	);
}

const CSA = JSON.parse(fs.readFileSync("./Protocols/CSA.json", "utf8"));
const p = CSA["implementingParty"];
const recursiveDefs = {};
const qs = [];
const states = {};
Object.keys(CSA["participants"]).forEach((participant) => {
	if (participant != p) qs.push(participant);
});
synthesize(CSA["globalType"], p, qs, recursiveDefs, NaN, [], NaN, states);
console.log(util.inspect(states, false, null, true));
