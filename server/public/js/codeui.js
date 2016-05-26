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
	return CodeNode;
});

// PEGJS parser
codeui.factory('CodeParser',['CodeNode', function(CodeNode) {
	var debug = true;
	
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
			
			return {
				state: CodeParser.ERROR
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
	CodeParser.prototype.normalise = function(node) {
		switch(node.type) {
		case CodeNode.NOTE:
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
					node.midinote = 60+12*(oct-4)+p;
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
			while (children.length>0) {
				var child = children.splice(0,1)[0];
				if (child===null) {
					// ignore
					
				} else if (child.type==node.type) {
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
					child = this.normalise(child);
					if (child!==null) {
						// except we want to merge consecutive delays in a sequence...
						if (node.type==CodeNode.SEQUENCE && child.type==CodeNode.DELAY && node.children.length>0 && node.children[node.children.length-1].type==CodeNode.DELAY) {
							var prev = node.children[node.children.length-1];
							prev.beats += child.beats;
						} else {
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
		}
		return node;
	};
	
	return CodeParser;
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
