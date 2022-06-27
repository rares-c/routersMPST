module grammar::Abstract


data GT
	= message(EXC exc, TYP typ, GT cont)
	| choice(EXC exc, list[CHOICE] choices)
	| recDef(str var, GT cont)
	| recCall(str var)
	| end();
	
data EXC
	= exc(str from, str to);
	
data TYP
    = primitive(str id)
    | listTyp(TYP listtyp)
    | setTyp(TYP settyp)
    | bagTyp(TYP bagtyp)
    | structTyp(list[CONSTR] constrs)
    ;
data CONSTR
    = constr(str id, list[TYP] typs)
    ;
	
data CHOICE
	= choice(str label, GT cont);