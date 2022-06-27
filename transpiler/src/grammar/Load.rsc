module grammar::Load

import grammar::Grammar;
import grammar::Abstract;
import ParseTree;
import IO;

public Tree parseGlobalType(str txt) = parse(#start[GlobalType], txt);
public GT loadGlobalType(str txt) = implode(#GT, parseGlobalType(txt));
public GT loadFile(loc file) = loadGlobalType(readFile(file));