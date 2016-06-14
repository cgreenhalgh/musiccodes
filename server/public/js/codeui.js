var codeui = angular.module('muzicodes.codeui', []);

// Code node class
codeui.factory('CodeNode', function() {

	function CodeToken(type) {
		this.type = type;
	}
	CodeToken.FIXED_TEXT = 1;
	CodeToken.NODE = 2;
	CodeToken.NOTE_NAME = 3;
	CodeToken.NOTE_ACCIDENTAL = 4;
	CodeToken.NUMBER = 5;
	CodeToken.prototype.toString = function() {
		switch(this.type) {
		case CodeToken.FIXED_TEXT:
		case CodeToken.NOTE_NAME:
		case CodeToken.NOTE_ACCIDENTAL:
			return this.text;
		case CodeToken.NUMBER:
			// TODO precision?
			return this.number;
		}
		console.log('Warning: CodeToken.toString for type '+this.type);
	};
	CodeToken.prototype.createElement = function(ix, insertPoint) {
		var el = angular.element('<div></div>').addClass('muz-part').data('ix', ix);
		if (insertPoint && insertPoint[0]>0) {
			// text before insert
			var text = angular.element('<span></span>');
			text.text(this.text.substring(0,insertPoint[0]));
			el.append(text);
		}
		if (insertPoint) {
			var text = angular.element('<span>&nbsp;</span>').addClass('muz-caret');
			el.append(text);
		}
		if (insertPoint) {
			// text after insert
			var text = angular.element('<span></span>');
			text.text(this.text.substring(insertPoint[0]));
			el.append(text);
		} else {
			var text = angular.element('<span></span>');
			text.text(this.text);
			el.append(text);
		}
		this.el = el;
		return el;
	};
	CodeToken.newFixedText = function(text) {
		var part = new CodeToken(CodeToken.FIXED_TEXT);
		part.text = text;
		return part;
	};
	
	function CodeNode(type) {
		this.type = type;
		// SEQUENCE, CHOICE, REPEAT:
		this.children = [];
		// NOTE:
		// this.midinote = 60;
		// this.frequency = ??
		// DELAY
		// this.beats = 1;
		// this.seconds = ??
		// NOTE_RANGE:
		// this.minMidinote = 
		// this.maxMidinote = 
		// DELAY_RANGE
		// this.minBeat = 
		// this.maxBeats =
		// REPEAT
		// this.minRepeat =
		// this.maxRepeat = 
		this.initParts();
	};
	CodeNode.NOTE = 1;
	CodeNode.DELAY = 2;
	CodeNode.GROUP= 3;
	CodeNode.SEQUENCE = 4;
	CodeNode.CHOICE = 5;
	CodeNode.REPEAT = 6;
	CodeNode.REPEAT_0_OR_MORE = 7;
	CodeNode.REPEAT_1_OR_MORE = 8;
	CodeNode.REPEAT_0_OR_1 = 9;
	CodeNode.NOTE_RANGE = 10;
	CodeNode.DELAY_RANGE = 11;
	CodeNode.WILDCARD = 12;
	CodeNode.prototype.initParts = function() {
		switch(this.type) {
		case CodeNode.NOTE:
			this.parts = [new CodeToken(CodeToken.NOTE_NAME), new CodeToken(CodeToken.NOTE_ACCIDENTAL)];
			break;
		case CodeNode.DELAY:
			this.parts = [CodeToken.newFixedText('/'), new CodeToken(CodeToken.NUMBER)];
			break;
		case CodeNode.SEQUENCE:
			this.parts = [CodeToken.newFixedText('')];
			// TODO children?
			break;
		case CodeNode.CHOICE:
			this.parts = [CodeToken.newFixedText('('), CodeToken.newFixedText(')')];
			// TODO children?
			break;
		case CodeNode.REPEAT:
			this.parts = [new CodeToken(CodeToken.NODE), CodeToken.newFixedText('{'), CodeToken.newFixedText(','), CodeToken.newFixedText('}') ]
			// TODO min/max?
			break;
		case CodeNode.REPEAT_0_OR_1:
			this.parts = [new CodeToken(CodeToken.NODE), CodeToken.newFixedText('?')];
			break;
		case CodeNode.REPEAT_0_OR_MORE:
			this.parts = [new CodeToken(CodeToken.NODE), CodeToken.newFixedText('*')];
			break;
		case CodeNode.REPEAT_1_OR_MORE:
			this.parts = [new CodeToken(CodeToken.NODE), CodeToken.newFixedText('+')];
			break;
		case CodeNode.NOTE_RANGE:
		case CodeNode.DELAY_RANGE:
			this.parts = [CodeToken.newFixedText('['), CodeToken.newFixedText('-'), CodeToken.newFixedText(']')];
			// TODO min/max?
			break;
		case CodeNode.WILDCARD:
			this.parts = [CodeToken.newFixedText('.')];
			break;
		default:
			this.parts = [];
			break;
		}
	}
	CodeNode.prototype.getParts = function() {
		return this.parts;
	}
	CodeNode.prototype.createElement = function(ix, insertPoint, selection) {
		var el = angular.element('<div></div>').addClass('muz-node').data('ix', ix);
		for (var pi in this.parts) {
			var part = this.parts[pi];
			var childInsert = null;
			if (insertPoint && insertPoint[0]==pi)
				childInsert = insertPoint.slice(1);
			var child = part.createElement(pi, childInsert);
			el.append(child);
		}
		this.el = el;
		return el;
	}
	
	CodeNode.newSequence = function() {
		return new CodeNode(CodeNode.SEQUENCE);
	}
	CodeNode.newChoice = function() {
		return new CodeNode(CodeNode.CHOICE);
	}
	var NOTES = [ 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B' ];
	CodeNode.midinoteToString = function(midinote) {
		// C4 = 60
		var pitch = Math.floor(midinote+0.5 - 60);
		var octave = Math.floor( pitch / 12);
		pitch = pitch - 12*octave;
		octave = octave+4;
		//console.log('midinote '+midinote+' -> pitch '+pitch+', octave '+octave);
		// TODO: alt print forms?
		var res = NOTES[pitch] + String(octave);
		return res;
	};
	CodeNode.beatsToString = function(beats) {
		// centibeats?!
		var res = String(Number(beats).toFixed(2));
		if (res.substring(res.length-3)=='.00') {
			res = res.substring(0, res.length-3);
		} else if (res.substring(res.length-1)=='0') {
			res = res.substring(0, res.length-1);
		}
		return res;
	}
	var PRECEDENCE_CHOICE = 1;
	var PRECEDENCE_SEQUENCE = 2;
	var PRECEDENCE_REPEAT = 3;
	CodeNode.toString = function(node, precedence) {
		var res = '';
		switch(node.type) {
		case CodeNode.NOTE:
			res += CodeNode.midinoteToString(node.midinote);
			break;
		case CodeNode.DELAY:
			res += '/'+CodeNode.beatsToString(node.beats);
			break;
		case CodeNode.SEQUENCE:
			if (precedence!==undefined && precedence>PRECEDENCE_SEQUENCE) {
				res += '(';
			}
			for (var ci = 0; ci<node.children.length; ci++) {
				var child = node.children[ci];
				if (ci>0)
					res += ',';
				res += CodeNode.toString(child, PRECEDENCE_SEQUENCE);
			}
			if (precedence!==undefined && precedence>PRECEDENCE_SEQUENCE) {
				res += ')';
			}
			break;
		case CodeNode.CHOICE:
			if (precedence!==undefined && precedence>PRECEDENCE_CHOICE) {
				res += '(';
			}
			for (var ci = 0; ci<node.children.length; ci++) {
				var child = node.children[ci];
				if (ci>0)
					res += '|';
				res += CodeNode.toString(child, PRECEDENCE_CHOICE);
			}
			if (precedence!==undefined && precedence>PRECEDENCE_CHOICE) {
				res += ')';
			}
			break;
		case CodeNode.REPEAT:
		case CodeNode.REPEAT_0_OR_1:
		case CodeNode.REPEAT_0_OR_MORE:
		case CodeNode.REPEAT_1_OR_MORE:
			var child = node.children[0];
			if (child.type!=CodeNode.NOTE && child.type!=CodeNode.DELAY &&
					child.type!=CodeNode.NOTE_RANGE && child.type!=CodeNode.DELAY_RANGE &&
					child.type!=CodeNode.WILDCARD && child.type!=CodeNode.GROUP) {
				res += '(';
			}
			res += CodeNode.toString(child);
			if (child.type!=CodeNode.NOTE && child.type!=CodeNode.DELAY &&
					child.type!=CodeNode.NOTE_RANGE && child.type!=CodeNode.DELAY_RANGE &&
					child.type!=CodeNode.WILDCARD && child.type!=CodeNode.GROUP) {
				res += ')';
			}
			if (node.type==CodeNode.REPEAT_0_OR_1) {
				res += '?';
			} else if (node.type==CodeNode.REPEAT_1_OR_MORE) {
				res += '+';
			} else if (node.type==CodeNode.REPEAT_0_OR_MORE) {
				res += '*';
			} else {
				res += '{';
				if (node.minRepeat!==undefined && node.minRepeat!==null)
					res += node.minRepeat;
				res += '-';
				if (node.maxRepeat!==undefined && node.maxRepeat!==null)
					res += node.maxRepeat;
				res += '}';
			}
			break;
		case CodeNode.NOTE_RANGE:
			res += '[';
			if (node.minMidinote!==undefined && node.minMidinote!==null) 
				res += CodeNode.midinoteToString(node.minMidinote);
			res += '-';
			if (node.maxMidinote!==undefined && node.maxMidinote!==null) 
				res += CodeNode.midinoteToString(node.maxMidinote);
			res += ']';
			break;
		case CodeNode.DELAY_RANGE:
			res += '/[';
			if (node.minBeats!==undefined && node.minBeats!==null) 
				res += CodeNode.beatsToString(node.minBeats);
			res += '-';
			if (node.maxBeats!==undefined && node.maxBeats!==null) 
				res += CodeNode.beatsToString(node.maxBeats);
			res += ']';
			break;
		case CodeNode.WILDCARD:
			res += '.';
			break;
		case CodeNode.GROUP:
			res += '(';
			var child = node.children[0];
			res += CodeNode.toString(child);
			res += ')';
			break;
		default:
			res += '<ERROR:unknown type '+node.type+'>';
			break;
		}		
		return res;
	};
	CodeNode.label = function(node) {
		var nextId = 1;
		function label(node) {
			if (node===undefined)
				return;
			node.id = nextId++;
			//console.log('label '+node.id+'('+nextId+'): '+JSON.stringify(node));
			if (node.children!==undefined && node.children!==null) {
				for (var ci in node.children) {
					var child = node.children[ci];
					label(child);
				}
			}
		}
		label(node);
	};
	var SMALL_PITCH = 0.1;
	var SMALL_DELAY = 0.1;
	var debug = false;
	CodeNode.matchesAtomic = function(node, note) {
		if (note.midinote!==undefined && note.midinote!==null) {
			if (node.type==CodeNode.NOTE) {
				if (Math.abs(node.midinote-note.midinote)<SMALL_PITCH) {
					return true;
				}
				else {
					// failed
					if (debug) 
						console.log('fail match '+JSON.stringify(note)+' against '+JSON.stringify(node)+': NOTE '+note.midinote+' expected '+node.midinote);
					return false;
				}
			} else if (node.type==CodeNode.NOTE_RANGE) {
				if (node.minMidinote!==undefined && node.minMidinote!==null && node.minMidinote-SMALL_PITCH>note.midinote) {
					// failed
					if (debug) 
						console.log('fail match '+JSON.stringify(note)+' against '+JSON.stringify(node)+': NOTE min '+note.midinote+' expected '+node.minMidinote);
					return false;
				} else if (node.maxMidinote!==undefined && node.maxMidinote!==null && node.maxMidinote+SMALL_PITCH<note.midinote) {
					// failed
					if (debug) 
						console.log('fail match '+JSON.stringify(note)+' against '+JSON.stringify(node)+': NOTE max '+note.midinote+' expected '+node.maxMidinote);
					return false;
				} else {
					// OK
					return true;
				}
			} else if (node.type==CodeNode.WILDCARD) {
				// OK
				return true;
			} else {
				// failed - can't match against...
				if (debug) 
					console.log('fail match '+JSON.stringify(note)+' against '+JSON.stringify(node)+': NOTE '+note.midinote);
				return false;
			}
		} else if (note.beats!==undefined && note.beats!==null) {
			if (node.type==CodeNode.DELAY) {
				if (Math.abs(node.beats-note.beats)<SMALL_DELAY) {
					return true;
				}
				else {
					// failed
					if (debug) 
						console.log('fail match '+JSON.stringify(note)+' against '+JSON.stringify(node)+': DELAY '+note.beats+' expected '+node.beats);
					return false;
				}
			} else if (node.type==CodeNode.DELAY_RANGE) {
				if (node.minBeats!==undefined && node.minBeats!==null && node.minBeats-SMALL_DELAY>note.beats) {
					// failed
					if (debug) 
						console.log('fail match '+JSON.stringify(note)+' against '+JSON.stringify(node)+': DELAY min '+note.beats+' expected '+node.minBeats);
					return false;
				} else if (node.maxBeats!==undefined && node.maxBeats!==null && node.maxBeats+SMALL_DELAY<note.beats) {
					// failed
					if (debug) 
						console.log('fail match '+JSON.stringify(note)+' against '+JSON.stringify(node)+': DELAY max '+note.beats+' expected '+node.maxBeats);
					return false;
				} else {
					// OK
					return true;
				}
			} else if (node.type==CodeNode.WILDCARD) {
				// OK
				return true;
			} else {
				if (debug) 
					console.log('fail match '+JSON.stringify(note)+' against '+JSON.stringify(node)+': DELAY '+note.beats);
				return false;
			}
		}
		if (debug) 
			console.log('fail match '+JSON.stringify(note)+' against non-atomic '+JSON.stringify(node));
		return false;
		
	}

	return CodeNode;
});

// PEGJS parser
codeui.factory('CodeParser',['CodeNode', function(CodeNode) {
	var debug = false;
	
	function CodeParser() {
		
	};
	CodeParser.OK = 0;
	CodeParser.EMPTY = 1;
	CodeParser.ERROR = 2;

	function stripNulls(obj) {
		for (var key in obj) {
			if (obj[key]===null)
				delete obj[key];
		}
		if (obj.children!==undefined) {
			for (var ci in obj.children) {
				stripNulls(obj.children[ci]);
			}
		}
		return obj;
	}
	CodeParser.prototype.parse = function(text) {
		try {
			var res = codeuiparser.parse(text);
			return {
				state: CodeParser.OK,
				node: stripNulls(res)
			};
		}
		catch (err) {
			console.log("Error parsing "+text+(err.location ? ' at '+JSON.stringify(err.location.start) : ''), err);
			console.log(err);
			return {
				state: CodeParser.ERROR,
				location: (err.location ? err.location.start.offset : undefined),
				message: err.message
			};
		}
	};
	var NOTE_NAMES = {
		'C': 60,
		'D': 62,
		'E': 64,
		'F': 65,
		'G': 67,
		'A': 69,
		'B': 71,
		'c': 72,
		'd': 74,
		'e': 76,
		'f': 77,
		'g': 79,
		'a': 81,
		'b': 83
	};
	var ACCIDENTALS = {
		'#': 1,
		'b': -1
		// TODO double, etc.
	};
	CodeParser.prototype.normaliseNote = function(node) {
		// middle C = 60 = C4; 'C' = C4, 'c' = C5 (ABC - Helmholz is two octaves lower)
		if (node.name!==undefined && node.name!==null) {
			var n = NOTE_NAMES[node.name];
			if (n!==undefined) {
				node.midinote = n;
				delete node.name;
			} else {
				console.log('Unknown note name '+node.name);
				node.midinote = 60;
				delete node.name;
			}
		}
		// octave before accidental!
		if (node.octave!==undefined && node.octave!==null) {
			if (node.midinote!==undefined) {
				var oct = Math.floor((node.midinote-60+4*12+0.5)/12);
				var p = node.midinote-60+(4-oct)*12;
				node.midinote = 60+12*(node.octave-4)+p;
			}
			else {
				node.midinote = 60+12*(oct-4);
			}
			delete node.octave;
		}
		if (node.accidental!==undefined && node.accidental!==null) {
			var a = ACCIDENTALS[node.accidental];
			if (a!==undefined) {
				node.midinote += a;
				delete node.accidental;
			}
			else {
				console.log('Unknown accidental '+node.accidental);
				delete node.accidental;
			}
		}		
	}
	CodeParser.prototype.normaliseNotes = function(node) {
		switch(node.type) {
		case CodeNode.NOTE:
			this.normaliseNote(node);
			break;
		case CodeNode.NOTE_RANGE:
			if (node.minNote!==undefined && node.minNote!==null) {
				node.minMidinote = this.normalise(node.minNote).midinote;
				delete node.minNote;
			}
			if (node.maxNote!==undefined && node.maxNote!==null) {
				node.maxMidinote = this.normalise(node.maxNote).midinote;
				delete node.maxNote;
			}
			break;
		default:
			break;
		}
		if (node.children!==undefined && node.children!==null) {
			for (var ci in node.children) {
				var child = node.children[ci];
				this.normaliseNotes(child);
			}
		}
		return node;		
	}
	CodeParser.prototype.normalise = function(node) {
		switch(node.type) {
		case CodeNode.NOTE:
			this.normaliseNote(node);
			break;
		case CodeNode.DELAY:
			if (node.beats===null || node.beats===undefined || node.beats===0 || node.beats<0) {
				// ignore
				return null;
			}
			break;
		case CodeNode.GROUP:
			// not needed at abstract syntax level
			if (node.children!==null && node.children!==undefined && node.children.length>0)
				return this.normalise(node.children[0]);
			return null;
		case CodeNode.SEQUENCE:
		case CodeNode.CHOICE:
			// merge child nodes of same type
			var children = node.children;
			node.children = [];
			//console.log('normalise children '+JSON.stringify(children));
			while (children.length>0) {
				var child = children.splice(0,1)[0];
				//console.log('normalise check child '+JSON.stringify(child));
				while(child!==undefined && child.type==CodeNode.GROUP) {
					if (child.children.length>0) {
						// into group
						child = child.children[0];
					}
					else {
						child = undefined;
						break;
					}
				}
				if (child===null) {
					// ignore
				} else if (child.type==node.type) {
					//console.log('normalise recurse into sequence/choice '+JSON.stringify(child));
					// replace with children in place/order
					if (child.children!==undefined && child.children!==null) {
						var j = 0;
						for (var ci in child.children) {
							if (child.children[ci]!==null)
								children.splice(j++, 0, child.children[ci]);
						}
					}
				} else {
					// OK to include anything else
					//console.log('normalise simple child '+JSON.stringify(child));
					child = this.normalise(child);
					if (child!==null) {
						// except we want to merge consecutive delays in a sequence...
						if (node.type==CodeNode.SEQUENCE && child.type==CodeNode.DELAY && node.children.length>0 && node.children[node.children.length-1].type==CodeNode.DELAY) {
							var prev = node.children[node.children.length-1];
							prev.beats += child.beats;
						} else {
							//console.log('normalise add child '+JSON.stringify(child));
							node.children.push(child);
						}
					}
				}
			}
			if (node.children===null || node.children===undefined || node.children.length==0)
				// ignore
				return null;
			if (node.children.length==1) {
				// only one!
				return node.children[0];
			}
			break;
		case CodeNode.REPEAT:
		case CodeNode.REPEAT_0_OR_MORE:
		case CodeNode.REPEAT_1_OR_MORE:
		case CodeNode.REPEAT_0_OR_1:
			// TODO extend to REPEAT as child of REPEAT
			// not needed at abstract syntax level
			if (node.children!==null && node.children!==undefined && node.children.length>0) {
				var child = this.normalise(node.children[0]);
				if (child!==null)
					node.children = [child];
				else {
					// meaningless
					return null;
				}
			}
			if (node.type==CodeNode.REPEAT_0_OR_MORE) {
				node.minRepeat = 0;
				delete node.maxRepeat;
				node.type = CodeNode.REPEAT;
			} else if (node.type==CodeNode.REPEAT_1_OR_MORE) {
				node.minRepeat = 1;
				delete node.maxRepeat;
				node.type = CodeNode.REPEAT;
			} else if (node.type==CodeNode.REPEAT_0_OR_1) {
				node.minRepeat = 0;
				node.maxRepeat = 1;
				node.type = CodeNode.REPEAT;
			} else if (node.maxRepeat!==undefined && node.maxRepeat<=0) {
				// nothing!
				return null;
			}
			break;
		case CodeNode.NOTE_RANGE:
			if (node.minNote!==undefined && node.minNote!==null) {
				node.minMidinote = this.normalise(node.minNote).midinote;
				delete node.minNote;
			}
			if (node.maxNote!==undefined && node.maxNote!==null) {
				node.maxMidinote = this.normalise(node.maxNote).midinote;
				delete node.maxNote;
			}
			break;
		case CodeNode.DELAY_RANGE:
			break;
		case CodeNode.WILDCARD:
			// OK
			break;
		}
		return node;
	};
	
	return CodeParser;
}]);

codeui.factory('CodeMatcher', ['CodeNode', function(CodeNode) {
	var debug = false;
	
	function CodeMatcher(node) {
		this.compile(node);
	};
	CodeMatcher.prototype.compile = function(node) {
		this.node = node;
		CodeNode.label(node);
	};
	// return true/false and decorate notes with match status for vis'n
	// normalised input notes, i.e. note.freq or delay.beats
	CodeMatcher.prototype.match = function(notes) {
		this.reset();
		var matched = true;
		for (var ni in notes) {
			var note = notes[ni];
			matched = this.matchNext(note);
		}
		
		if(debug)
			console.log('end match '+matched+' with states '+JSON.stringify(this.states)+' and matchedIds '+JSON.stringify(this.matchedIds));
		
		return matched;
	};
	CodeMatcher.prototype.reset = function() {
		// alternative part-match states, each with place in code hierarchy
		this.states = [ { nodes: [this.node], counts: [0], matched: [] } ];	
		this.matchedIds = null;
	}
	CodeMatcher.prototype.matchNext = function(note) {
		this.matchedIds = null;
		// each state possibility...
		var newStates = [];
		// expand possible states
		while(this.states.length>0) {
			var state = this.states.splice(0,1)[0];
			if (debug)
				console.log('expand next state '+JSON.stringify(state));
			var depth = state.nodes.length-1;

			var node = state.nodes[depth];
			if (node.type==CodeNode.SEQUENCE) {
				state.nodes.splice(depth+1, 0, node.children[state.counts[depth]]);
				state.counts.splice(depth+1, 0, 0);
				if (debug)
					console.log('down into sequence child '+state.counts[depth]);
				this.states.push(state);
			} else if (node.type==CodeNode.DELAY || node.type==CodeNode.NOTE ||
						node.type==CodeNode.DELAY_RANGE || node.type==CodeNode.NOTE_RANGE ||
						node.type==CodeNode.WILDCARD) {
				// OK
				newStates.push(state);
			} else if (node.type==CodeNode.CHOICE) {
				// each choice is an option...
				for (var ci in node.children) {
					var child = node.children[ci];
					var newState = { nodes: state.nodes.concat(child), counts: state.counts.concat(0), matched: state.matched.slice(0) };
					// go down in each choice...
					this.states.push(newState);
					if (debug)
						console.log('down into choice child '+ci);
				}
			} else if (node.type==CodeNode.REPEAT) {
				// maybe can be skipped? but still need to eat a token
				if (depth>0 && state.counts[depth]==0 && (node.minRepeat===undefined || node.minRepeat===null || node.minRepeat<=0)) {
					// special case here on pre-check is to match with 0 occurrences; otherwise it would have appeared
					// as a candidate match on the way out!
					if (debug)
						console.log('done match 0-repeat at depth '+depth+' on '+JSON.stringify(node));
					// clone/alt!
					var newState = { nodes: state.nodes.slice(0,depth), counts: state.counts.slice(0,depth), matched: state.matched.slice(0) };
					if (newState.matched.length==0 || newState.matched[newState.matched.length-1]!==node) {
						newState.matched.push(node);
					}
					// match at parent
					newState.counts[depth-1]++;
					// what else if matched ?! any new repeat is in states for drill-down 
					this.checkCloseState(newState, this.states);
					if (newState.nodes.length>0)
						this.states.push(newState);
				}
				// maybe it can be matched again?
				if ((node.maxRepeat===undefined || node.maxRepeat===null || node.maxRepeat>state.counts[depth]) && node.children!==undefined && node.children.length>0) {
					var newState = { nodes: state.nodes.concat(node.children[0]), counts: state.counts.concat(0), matched: state.matched.slice(0) };
					// go down in each choice...
					this.states.push(newState);
					if (debug)
						console.log('down into repeat child '+JSON.stringify(node.children[0]));
				}
				// Note: to avoid state explosion perhaps need to suppress skip state if match state succeeds?!
				// Or perhaps we only insert the skip state if the match state fails?
			} else {
				console.log('unhandled state node '+JSON.stringify(node));
			}
		}
		this.states = newStates;
		newStates = [];
		for (var si in this.states) {
			var state = this.states[si];
			// check leaf state
			var node = state.nodes[state.nodes.length-1];
			if(CodeNode.matchesAtomic(node, note)) {
				// OK
				state.matched.push(node);
				state.counts[state.nodes.length-1]++;
				newStates.push(state);
			}
		}
		this.states = newStates;

		newStates = [];
		// close finished states 
		var matched = false;
		while(this.states.length>0) {
			var state = this.states.splice(0,1)[0];
			this.checkCloseState(state, newStates);
			if (state.nodes.length==0) {
				// finished
				matched = true;
				this.matchedIds = this.getMatchedIds([state]);
			} else {
				newStates.push(state);
			}
		}
		this.states = newStates;
		return matched;
	}
	CodeMatcher.prototype.checkCloseState = function(state, newStates) {
		var depth = state.nodes.length-1;
		// close finished states
		while (depth>=0 && state.counts[depth]>0) {
			var node = state.nodes[depth];
			// a successfully matched repeat which could match again has to fork here
			if (node.type==CodeNode.REPEAT && 
					(node.minRepeat===undefined || node.minRepeat===null || node.minRepeat<=state.counts[depth]) &&
					(node.maxRepeat===undefined || node.maxRepeat===null || node.maxRepeat>state.counts[depth])) {
				// clone!
				if (debug)
					console.log('clone matched repeat '+JSON.stringify(node));
				var newState = { nodes: state.nodes.slice(0), counts: state.counts.slice(0), matched: state.matched.slice(0) };
				newStates.push(newState);
			}
			// atom
			if ((node.type==CodeNode.DELAY || node.type==CodeNode.NOTE ||
					node.type==CodeNode.DELAY_RANGE ||node.type==CodeNode.NOTE_RANGE ||
					node.type==CodeNode.CHOICE || node.type==CodeNode.WILDCARD) ||
					// sequence
					(node.type==CodeNode.SEQUENCE && state.counts[depth]>=node.children.length) ||
					// repeat
					(node.type==CodeNode.REPEAT && 
					 (node.minRepeat===undefined || node.minRepeat===null || node.minRepeat<=state.counts[depth]))) {
				// done 
				if (debug)
					console.log('done match at depth '+depth+' on '+JSON.stringify(node));
				if (state.matched.length==0 || state.matched[state.matched.length-1]!==node) {
					state.matched.push(node);
				}
				state.nodes.splice(depth,1);
				state.counts.splice(depth,1);
				depth--;
				if (depth>=0)
					state.counts[depth]++;
			}
			else 
				break;
		}

	};
	// map with ids as keys (for speed)
	CodeMatcher.prototype.getMatchedIds = function(states) {
		if (states===undefined && this.matchedIds!==null) {
			// cached from success
			return this.matchedIds;
		}
		var matched = {};
		if (states===undefined)
			states = this.states;
		for (var si in states) {
			var state = states[si];
			for (var mi in state.matched) {
				var node = state.matched[mi];
				if (node.id!==undefined && node.id!==null) {
					matched[node.id] = node;
				}
			}
		}
		return matched;
	}
	return CodeMatcher;
}]);

codeui.directive('muzCode', [function() {
	return {
		restrict: 'E',
		scope: {
			ngModel: '='
		},
		link: function(scope, element, attrs) {
			element.attr('tabindex', 0);
			// if the model is assigned we should rebuild the DOM representation
			// Otherwise we will only deal with changes from the user, i.e. UI actions
			function rebuild(code) {
				// clear insert & selection
				scope.insertPoint = [0,0];
				scope.selection = null;
				var el = code.createElement(0, scope.insertPoint, scope.selection);
				element.empty();
				element.append(el);
			};
			scope.$watch('ngModel', function(newValue) {
				rebuild(newValue);
			});
			element.on('click', function(ev) {
				//console.log('click...');
				element[0].focus();
			});
			// focus / blur just css for now
			element.on('keypress', function(ev) {
				if(ev.charCode) {
					console.log('keypress: '+ev.charCode);
				}
			});
			// focus / blur just css for now
			element.on('keydown', function(ev) {
				console.log('keydown: '+ev.which);
			});
		}
	};
}]);

codeui.factory('InexactMatcher', ['CodeNode', 'CodeMatcher', function(CodeNode, CodeMatcher) {
	var debug = false;
	
	function InexactMatcher(node, error, parameters) {
		if (node!==undefined)
			this.compile(node, error, parameters);
	};
	// API
	InexactMatcher.prototype.compile = function(node, error, parameters) {
		if (node.type!=CodeNode.SEQUENCE) {
			node = { type: CodeNode.SEQUENCE, children: [node] };
		}
		this.node = node;
		this.error = error;
		this.parameters = parameters;
		CodeNode.label(node);
		this.codeLength = this.node.children.length;
		this.costs = new Array(this.codeLength+1);
		this.costs[0] = 0;
		this.costs2 = new Array(this.codeLength+1);
		this.noteInsertError = parameters!==undefined && parameters.noteInsertError!==undefined ? parameters.noteInsertError: 1;
		this.noteDeleteError = parameters!==undefined && parameters.noteDeleteError!==undefined ? parameters.noteDeleteError: 1;
		this.noteReplaceError = parameters!==undefined && parameters.noteReplaceError!==undefined ? parameters.noteReplaceError: 2;
		this.delayError = parameters!==undefined && parameters.delayError!==undefined ? parameters.delayError: 1;		
	};
	// API
	InexactMatcher.prototype.reset = function() {
		// ix 0 is before first child in pattern, etc.
		this.costs[0] = 0;
		this.costLength = 1;
	};
	// API
	InexactMatcher.prototype.match = function(notes) {
		this.reset();
		var matched = true;
		for (var ni in notes) {
			var note = notes[ni];
			matched = this.matchNext(note);
		}
		
		//if(debug)
		//	console.log('end match '+matched);
		
		return matched;
	};
	InexactMatcher.prototype.errorChoice = function(node, note, parameters) {
		if (node.type==CodeNode.CHOICE) {
			var error = undefined;
			for (var ci in node.children) {
				var child = node.children[ci];
				var err = InexactMatcher.matchesAtomic(child, note, parameters);
				if (error===undefined || (error!==undefined && err!==undefined && err<error))
					error = err;
			}
			if (error===undefined) {
				if (node!==undefined && note.midinote!==undefined) {
					var maxError = parameters!==undefined && parameters.noteReplaceError!==undefined ? parameters.noteReplaceError : 2;
					return maxError;
				}
				else {
					var maxError = parameters!==undefined && parameters.delayError!==undefined ? parameters.delayError : 1;
					return maxError;
				}
			}
			return error;
		}
		return this.errorAtomic(node, note, parameters);
	}
	var SMALL_PITCH = 0.005;
	var SMALL_DELAY = 0.005;
	function errorNote(note1, note2, parameters) {
		var diff = Math.abs(note1-note2);
		var maxError = parameters!==undefined && parameters.noteReplaceError!==undefined ? parameters.noteReplaceError : 2;
		var allow = parameters!==undefined && parameters.noteAllowRange!==undefined ? parameters.noteAllowRange : 0;
		var error = parameters!==undefined && parameters.noteErrorRange!==undefined ? parameters.noteErrorRange : 0;
		if (diff <= allow+SMALL_PITCH)
			return 0;
		if (diff > error)
			return maxError;
		return maxError*(diff-allow)/(error-allow);
	}
	function errorDelay(delay1, delay2, parameters) {
		var diff = Math.abs(delay1-delay2);
		var maxError = parameters!==undefined && parameters.delayError!==undefined ? parameters.delayError : 1;
		var allow = parameters!==undefined && parameters.delayAllowRange!==undefined ? parameters.delayAllowRange : 0;
		var error = parameters!==undefined && parameters.delayErrorRange!==undefined ? parameters.delayErrorRange : 0;
		var err1 = undefined;
		if (diff <= allow+SMALL_DELAY)
			err1 = 0;
		else if (diff > error)
			err1 = maxError;
		else
			err1 = maxError*(diff-allow)/(error-allow);
		
		if (delay1>0 && delay2>0) {
			if (delay1>delay2)
				diff = delay1/delay2-1;
			else
				diff = delay2/delay1-1;
			allow = parameters!==undefined && parameters.tempoAllowRange!==undefined ? parameters.tempoAllowRange : 0;
			error = parameters!==undefined && parameters.tempoErrorRange!==undefined ? parameters.tempoErrorRange : 0;
			var err2 = undefined;
			if (diff <= allow)
				err2 = 0;
			else if (diff > error)
				err2 = maxError;
			else
				err2 = maxError*(diff-allow)/(error-allow);
			if (err2 < err1)
				return err2;
		}
		return err1;
	}
	// API
	InexactMatcher.prototype.matchNext = function(note) {
		// all previous positions in pattern
		if (debug) {
			var costs = '';
			for (var i=0; i<this.costs.length && i<this.costLength; i++) {
				if (i>0)
					costs += ',';
				costs += this.costs[i];
			}
			console.log('matchNext('+JSON.stringify(note)+') with costs=['+costs+']');
		}
		var nextCostLength = 0;
		var matched = false;
		for (var i=0; i<this.codeLength+1; i++) {
			if (debug) {
				console.log('['+i+'] '+(i>0 ? CodeNode.toString(this.node.children[i-1]) : '^')+' was '+this.costs[i]);
			}
			var cost2 = undefined;
			// insert?
			if (i<this.costLength && this.costs[i]!==undefined) {
				var INSERT_COST = note.beats!==undefined ? errorDelay(note.beats, 0, this.parameters) : this.noteInsertError;
				var c = this.costs[i]+INSERT_COST;
				if (debug)
					console.log('['+i+'] insert cost '+INSERT_COST+' = '+c);
				if (c<=this.error && (cost2===undefined || c<cost2)) {
					cost2 = c;
					matched = true;
				}	
			}
			if (i>0) {
				var node = this.node.children[i-1];
				// deleted?				
				if (this.costs2[i-1]!==undefined) {
					var DELETE_COST;
					if (node.type==CodeNode.REPEAT && (node.minRepeat===undefined || node.minRepeat==0)) {
						DELETE_COST = 0;
					}
					else {
						// delete cost should be based on code, not note!
						DELETE_COST = this.errorChoice(node, null, this.parameters);
					}
					// optional?
					var c = this.costs2[i-1]+DELETE_COST;
					if (debug)
						console.log('['+i+'] delete cost '+DELETE_COST+' = '+c);
					if (c<=this.error && (cost2===undefined || c<cost2)) {
						cost2 = c;
						matched = true;
					}
				}
				if (i-1<this.costLength  && this.costs[i-1]!==undefined) {
					// match?
					var err = undefined;
					// repeat, 1 first
					if (node.type==CodeNode.REPEAT) {
						err = this.errorChoice(node.children[0], note, this.parameters);
					} else {
						err = this.errorChoice(node, note, this.parameters);
					}
					if (err!==undefined) {
						var c = this.costs[i-1]+err;
						if (debug)
							console.log('['+i+'] match cost '+err+' = '+c);
						if (c<=this.error && (cost2===undefined || c<cost2)) {
							cost2 = c;
							matched = true;
							// could match again?
							if (node.type==CodeNode.REPEAT && node.maxRepeat===undefined) {
								if (this.costs2[i-1]===undefined || cost2<this.costs2[i-1]) {
									this.costs2[i-1] = cost2;
								}
							}
						}
					} 
				}
			}
			if (cost2===undefined) {
				if ((i-1)+1>=this.costLength) {
					if (debug)
						console.log('['+i+'] <- '+cost2+'; give up');
					break;
				}
				if (debug)
					console.log('['+i+'] <- '+cost2);
				this.costs2[i] = cost2;
			} else {
				if (debug)
					console.log('['+i+'] <- '+cost2);
				this.costs2[i] = cost2;
				nextCostLength = i+1;
			}
		}
		var tmp = this.costs;
		this.costs = this.costs2;
		this.costs2 = tmp;
		this.costLength = nextCostLength;
		return this.costLength>this.codeLength;
	};
	InexactMatcher.prototype.getError = function() {
		return this.costLength<=this.codeLength ? undefined : this.costs[this.codeLength];
	}
	// API
	// map with ids as keys (for speed)
	InexactMatcher.prototype.getMatchedIds = function() {
		if (!this.costLength) {
			return {};
		}
		console.log('getMatchedIds costLength='+this.costLength+'/'+this.codeLength);
		var matchedIds = {};
		for (var i=1; i<this.costLength && i-1<this.codeLength; i++) {
			var node = this.node.children[i-1];
			if (node) {
				if (debug)
					console.log('match child '+(i-1)+' with id '+node.id+': '+JSON.stringify(node));
				function addMatched(n) {
					matchedIds[n.id] = n;
					for (var ci in n.children) {
						var child = n.children[ci];
						if (!!child)
							addMatched(child);
					}
				}
				addMatched(node);
			}
		}
		if (this.costLength>this.codeLength)
			matchedIds[this.node.id] = this.node;
		return matchedIds;
	};
	InexactMatcher.canMatch = function(node) {
		function isSingle(node) {
			switch (node.type) {
			case CodeNode.NOTE:
			case CodeNode.DELAY:
			case CodeNode.NOTE_RANGE:
			case CodeNode.DELAY_RANGE:
			case CodeNode.WILDCARD:
				return true;
			case CodeNode.REPEAT:
				if ((node.minRepeat===undefined || node.minRepeat<=1) && (node.maxRepeat===undefined || node.maxRepeat==1)) {
					return isSingle(node.children[0]);
				}
				else {
					return false;
				}
			case CodeNode.REPEAT_0_OR_1:
			case CodeNode.REPEAT_0_OR_MORE:
			case CodeNode.REPEAT_1_OR_MORE:
				return isSingle(node.children[0]);
			case CodeNode.CHOICE:
				var ok = false;
				for (var i in node.children) {
					var child = node.children[i];
					if (!isSingle(child))
						return false;
					else
						ok = true;
				}
				return ok;
			case CodeNode.SEQUENCE:
				if (node.children.length!=1)
					return false;
				return isSinlge(node.children[0]);
			default:
				return false;
			}
 		}
		if (node.type==CodeNode.SEQUENCE) {
			var children = node.children.slice(0);
			while (children.length>0) {
				var child = children.splice(0,1)[0];
				if (child.type==CodeNode.SEQUENCE) {
					children = children.concat(child.children);
				} else {
					if (!isSingle(child))
						return false;
				}
			}
			return true;
		} else {
			return isSingle(node);
		}
	}
	InexactMatcher.prototype.errorAtomic = function(node, note, parameters) {
		if (note===undefined || note===null) {
			if (node.type==CodeNode.NOTE || node.type==CodeNode.NOTE_RANGE) {
				// delete
				return this.noteDeleteError;
			}
			else if (node.type==CodeNode.DELAY) {
				// like 0 delay?!
				return errorDelay(0, node.beats, parameters);
			} else if (node.type==CodeNode.DELAY_RANGE) {
				if (node.minBeats!==undefined && node.minBeats!==null && node.minBeats) {
					// like 0 delay?!
					return errorDelay(0, node.minBeats, parameters);
				} else {
					// OK
					return 0;
				}
			} else if (node.type==CodeNode.WILDCARD) {
				// note? delay?? best case???
				return this.noteDeleteError;				
			}
			else {
				// or??
				return this.noteDeleteError;
			}
		}
		else if (note.midinote!==undefined && note.midinote!==null) {
			if (node.type==CodeNode.NOTE) {
				return errorNote(node.midinote, note.midinote, parameters);
			} else if (node.type==CodeNode.NOTE_RANGE) {
				if (node.minMidinote!==undefined && node.minMidinote!==null && node.minMidinote>note.midinote) {
					return errorNote(node.minMidinote, note.midinote, parameters);
				} else if (node.maxMidinote!==undefined && node.maxMidinote!==null && node.maxMidinote<note.midinote) {
					return errorNote(node.maxMidinote, note.midinote, parameters);
				} else {
					// OK
					return 0;
				}
			} else if (node.type==CodeNode.WILDCARD) {
				// OK
				return 0;
			} else {
				// insert note, delete whatever it is
				var noteInsertError = parameters!==undefined && parameters.noteInsertError!==undefined ? parameters.noteInsertError : 1;
				if (node.type==CodeNode.DELAY) {
					return noteInsertError+errorDelay(0, node.beats, parameters);
				} else if (node.type==CodeNode.DELAY_RANGE) {
					if (node.minBeats!==undefined && node.minBeats!==null && node.minBeats>0) {
						return noteInsertError+errorDelay(note.beats, node.minBeats, parameters);
					}
					return noteInsertError;
				}
				// failed - can't match against...
				return noteInsertError;
			}
		} else if (note.beats!==undefined && note.beats!==null) {
			if (node.type==CodeNode.DELAY) {
				return errorDelay(note.beats, node.beats, parameters);
			} else if (node.type==CodeNode.DELAY_RANGE) {
				if (node.minBeats!==undefined && node.minBeats!==null && node.minBeats>note.beats) {
					return errorDelay(note.beats, node.minBeats, parameters);
				} else if (node.maxBeats!==undefined && node.maxBeats!==null && node.maxBeats<note.beats) {
					return errorDelay(note.beats, node.maxBeats, parameters);
				} else {
					// OK
					return 0;
				}
			} else if (node.type==CodeNode.WILDCARD) {
				// OK
				return 0;
			} else {
				// delete delay insert whatever
				var delayError =  parameters!==undefined && parameters.delayError!==undefined ? parameters.delayError : 1;
				if (node.type==CodeNode.NOTE || node.type==CodeNode.NOTE_RANGE) {
					var noteDeleteError = parameters!==undefined && parameters.noteDeleteError!==undefined ? parameters.noteDeleteError : 1;
					return delayError+noteDeleteError;
				}
				return delayError;
			}
		}
		return 2;
	}

	return InexactMatcher;
}]);