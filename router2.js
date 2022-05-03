const projector = require("./projector");
const util = require("util");
const fs = require("fs");

// Function that creates a DFSM used to run a router
function synthesize(globalType, p, qs, recursiveDefs) {
	let state = {
		transitions: {},
	};
	switch (globalType["type"]) {
		case "EXCHANGE":
			const deps = [];
			qs.forEach((q) => {
				if (hdep(q, p, globalType) && q != globalType["receiver"]) deps.push(q);
			});
			if (p == globalType["sender"] || p == globalType["receiver"]) {
				state["transitions"][globalType["sender"]] = {};
				Object.keys(globalType["branches"]).forEach((label) => {
					const nextState = synthesize(
						globalType["branches"][label]["protocolContinuation"],
						p,
						qs,
						recursiveDefs
					);

					state["transitions"][globalType["sender"]][label] = {
						to: globalType["receiver"],
						deps: [...deps],
						valueType: globalType["branches"][label]["valueType"],
						transitions: nextState["transitions"],
					};
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
						const nextState = synthesize(
							globalType["branches"][label]["protocolContinuation"],
							p,
							qs,
							recursiveDefs
						);
						state["transitions"][globalType["sender"]][label] = {
							to: p,
							deps: [],
							valueType: NaN,
							transitions: nextState.transitions,
						};
					});
				} else if (depon_r && depon_s) {
					state["transitions"][globalType["sender"]] = {};
					Object.keys(globalType["branches"]).forEach((label) => {
						const nextState = synthesize(
							globalType["branches"][label]["protocolContinuation"],
							p,
							qs,
							recursiveDefs
						);
						// Receive the label from the sender
						state["transitions"][globalType["sender"]][label] = {
							to: p,
							deps: [],
							valueType: NaN,
							transitions: {},
						};
						// Receive the label from the receiver
						state["transitions"][globalType["sender"]][label]["transitions"][
							globalType["receiver"]
						] = {};
						state["transitions"][globalType["sender"]][label]["transitions"][
							globalType["receiver"]
						][label] = {
							to: p,
							deps: [],
							valueType: NaN,
							transitions: nextState.transitions,
						};
					});
				} else {
					// Return the synthesis of any branch
					state = synthesize(
						globalType["branches"][Object.keys(globalType["branches"])[0]][
							"protocolContinuation"
						],
						p,
						qs,
                        recursiveDefs
					);
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
				recursiveDefs[globalType["recursionVariable"]] = state;
				state["transitions"] = synthesize(
					globalType["protocolContinuation"],
					p,
					qsPrime,
					recursiveDefs
				)["transitions"];
			}
			break;
		case "RECURSIVE_CALL":
			state = recursiveDefs[globalType["recursionVariable"]];
			console.log(
				"🚀 ~ file: router.js ~ line 117 ~ synthesize ~ state",
				state
			);
			break;
	}
	return state;
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
Object.keys(CSA["participants"]).forEach((participant) => {
	if (participant != p) qs.push(participant);
});
console.log(
	util.inspect(
		synthesize(CSA["globalType"], p, qs, recursiveDefs),
		false,
		null,
		true
	)
);
