module grammar::Grammar

// array[str] to be added as type syntax instead of the Id regex
lexical Id = [a-zA-Z_][a-zA-Z0-9_\'\[\],]* !>> [a-zA-Z0-9_\'] \ "end";
lexical Label = [0-9a-zA-Z]+ !>> [0-9a-zA-Z];
lexical RecVar = [A-Z][0-9]* !>> [0-9];

lexical WhitespaceComment
	= [\ \t\n\r]
	| @category="Comment" "//" ![\n]* $
	;
	
layout Layout = WhitespaceComment* !>> [\ \t\n\r/];

start syntax GlobalType
	= message: Exchange exc "\<" Typ typ "\>" "." GlobalType cont
	| choice: Exchange exc "(" {Choice ","}+ choices ")"
	| recDef: "mu" RecVar var "." GlobalType cont
	| recCall: RecVar var
	| end: "end"
	;

syntax Exchange = exc: Id from "-\>" Id to;

syntax Typ
	= primitive: Id id
	| listTyp: "List(" Typ listtyp ")"
	| setTyp: "Set(" Typ settyp ")"
	| bagTyp: "Bag(" Typ bagtyp ")"
	| structTyp: "struct" {Constr "|"}+ constrs
	;
syntax Constr
    = constr: Id id "(" {Typ ","}* ")" typs 
    ;

syntax Choice = choice: Label label "." GlobalType cont;