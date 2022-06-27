module compile::RouterConformanceCheck

import grammar::Abstract;

import Message;

// Function that checks the global type to ensure that all value exchanges are preceded
// by a labeled choice
set[Message] check(GT globalType){
	set[Message] msgs = {};
	switch(globalType){
		case message(EXC exc, TYP typ, GT cont):{
			// Every value exchange needs to be preceded by a label
			msgs += {error("Value exchange between <exc.from> and <exc.to> is not preceded by a labeled exchange")};
			msgs += checkType(typ);
			msgs += check(cont);
		}
		case choice(EXC exc, list[CHOICE] choices):{
			// Choice encountered, need to check every branch
			for(CHOICE c <- choices){
				switch(c.cont){
					case message(EXC nextExc, TYP typ, GT cont):{
						if(exc.from != nextExc.from || exc.to != nextExc.to){
							// The exchange following the label does not involve the current pair
							msgs += {error("Value exchange between <nextExc.from> and <nextExc.to> not preceded by a labeled exchange")};
						}
						// Check the type and the continuation as well
						msgs += checkType(typ);
						msgs += check(cont);
					}
					case choice(EXC _, list[CHOICE] _):
						// The continuation is a choice, recursively check it
						msgs += check(c.cont);
					case recDef(str _, GT cont):
						// Check the continuation of recursive definitions
						msgs += check(cont);
				}
			}
		} 
		// Check the continuation of recursive definitions
		case recDef(str _, GT cont):
			msgs += check(cont);
	}
	return msgs;
}

// Function that checks a given type to ensure that it is a primitive from the set {int, bool, str}
set[Message] checkType(TYP typ){
	set[Message] msgs = {};
	switch(typ){
		case primitive(str id):{
			// Only the primitives int, bool and str are supported. Anything else gives an error.
			if(id != "str" && id != "int" && id != "bool" && id != "real"){
				msgs += {error("Unsupported type <id>")};
			}
		}
		default:
			msgs += {error("Lists, bags, sets and structs are not supported!")};
	}
	return msgs;
}