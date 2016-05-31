// PEG syntax for codes ?!

start
  = it:choice { return it; }
  
choice 
  = left:sequence "|" right:choice { return { type: 5, children: [left,right] }; }
  / it:sequence{ return it; } 
  
sequence
  = left:repeat "," right:sequence { return { type: 4, children: [left,right] }; }
  / it:repeat { return it; }

repeat
  = child:unit "?" { return { type: 9, children: [child] }; }
  / child:unit "*" { return { type: 7, children: [child] }; }
  / child:unit "+" { return { type: 8, children: [child] }; }
  / child:unit "{" min:integer? "-" max:integer? "}" { return { type: 6, children: [child], minRepeat: min, maxRepeat: max }; }
  / it:unit { return it; }
  
unit
  = it:note { return it; }
  / it:delay { return it; }
  / it:group { return it; }
  / it:noterange { return it; }
  / it:delayrange { return it; }
  / "." { return { type: 12 }; }
  
group
  = "(" choice ")" { return { type: 3, children: [ choice ] }; }

note
  = name:notename accidental:accidental? octave:integer? { return { type: 1, name: name, accidental: accidental, octave: octave }; }

notename
  = name:[A-Ga-g]  { return name; } 
  
accidental
  = accidental:"#" { return "#"; } 
  / accidental:"b" { return "b"; } 

integer
  = value:[0-9]+ { return Number(value.join("")); }

delay
  = "/" time:time { return { type: 2, beats: time }; }
  
time
  = value:[0-9]+("."[0-9]+)? { return Number(value.join("")); }
 
noterange
   = "[" min:note "-" max:note "]" { return { type: 10, minNote: min, maxNote: max }; }
 
delayrange
   = "/[" min:time "-" "/"? max:time "]" { return { type: 11, minBeats: min, maxBeats: max }; }
   / "[/" min:time "-" "/"? max:time "]" { return { type: 11, minBeats: min, maxBeats: max }; }
 