module compile::Translate

/*
	Module for translasting a given global type into its equivalent JSON specification
*/

import grammar::Abstract;
import grammar::Load;
import IO;

// Translates a global type into its JSON equivalent, and writes the result to a file with the same name
// The translation method using string templates to generate the JSON file
void translate(loc fileLoc, map[str, str] addresses, int routerPort, str implementingParty){
	GT globalType = loadFile(fileLoc);
	writeFile(fileLoc[extension="JSON"].top,"{
	'	\"implementingParty\": \"<implementingParty>\",
	'	\"routerPort\": <routerPort>,
	'	\"participants\": {
	'		<participants2json(addresses)>
	'	},
	'	\"globalType\": {
	'		<gt2json(globalType)>
	'	}
	'}");
}

// Computes the JSON equivalent object of a map containing the participants and their addresses
str participants2json(map[str, str] addresses){
	str returnString = "";
	for(str participant <- addresses){
		returnString += "\"<participant>\": \"<addresses[participant]>\",\n";
	}
	// Ommit the trailing comma and newline
	return returnString[0..-2];
}

// Computes the JSON equivalent of the given global type by recursively traversing it
str gt2json(GT globalType){
	str returnString = "";
	switch(globalType){
		case message(EXC exc, TYP typ, GT cont): 
			returnString += "\"type\": \"EXCHANGE\",
			'\"sender\": \"<exc.from>\",
			'\"receiver\": \"<exc.to>\",
			'\"branches\": {
			'	\"unitLabel\": {
			'		\"valueType\": <typ2json(typ)>,
			'		\"protocolContinuation\": {
			'			<gt2json(cont)>
			'		}
			'	}
			'}";
		case choice(EXC exc, list[CHOICE] choices):
			returnString += "\"type\": \"EXCHANGE\",
			'\"sender\": \"<exc.from>\",
			'\"receiver\": \"<exc.to>\",
			'\"branches\": {
			'	<choices2json(choices, exc.from, exc.to)>
			'}";
		case recDef(str var, GT cont):
			returnString += "\"type\": \"RECURSIVE_DEFINITION\",
			'\"recursionVariable\": \"<var>\",
			'\"protocolContinuation\": {
			'	<gt2json(cont)>
			'}";
		case recCall(str var):
			returnString += "\"type\": \"RECURSIVE_CALL\",
			'\"recursionVariable\": \"<var>\"";
		case end():
			returnString += "\"type\": \"END\"";
	}
	return returnString;
}

// Computes the JSON equivalent of a list of choices
str choices2json(list[CHOICE] choices, str from, str to){
	str returnString = "";
	for(CHOICE c <- choices){
		if(message(EXC exc, TYP typ, GT cont) := c.cont){
			// The message includes a label and a value
			// The semantic checker makes sure that every value exchange is preceded by a label
			returnString += "\"<c.label>\": {
			'	\"valueType\": <typ2json(typ)>,
			'	\"protocolContinuation\": {
			'		<gt2json(cont)>
			'	}
			'},
			'";
		} else {
			// Just a label exchange with unit values
			returnString += "\"<c.label>\": {
			'	\"valueType\": \"unit\",
			'	\"protocolContinuation\": {
			'		<gt2json(c.cont)>
			'	}
			'},
			'";
		}
	}
	// Ommit the trailing comma
	return returnString[0..-2];
}

// Computes the JSON equivalent of a type
str typ2json(TYP typ){
	return "\"<typ.id>\"";
}

