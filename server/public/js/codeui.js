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

codeui.factory('CodeParser',['CodeNode', function(CodeNode) {
	var debug = true;
	
	function CodeParser() {
		
	};
	CodeParser.OK = 0;
	CodeParser.EMPTY = 1;
	CodeParser.ERROR = 2;
	// Return parse state:
	//   state - 0=EMPTY, 1=OK, 2=ERROR
	//   pos - position
	//   node - result
	CodeParser.prototype.parse = function(text) {
		if (text===null || text===undefined || text.length==0) {
			return {
				state: CodeParser.EMPTY
			};
		}
		//   nodes - list of possible parse trees in progress
		//   next - valid next tokens/terms
		var nodes = [];
		nodes.push( { pos: 0 } );
		var completed = []
		
		while (nodes.length>0) {
			var nextNodes = [];
			for (var noi in nodes) {
				var node = nodes[noi];
				var rest = text.substring(node.pos);
				if (debug)
					console.log('parse '+text.substring(0,node.pos)+'<>'+rest+' with '+JSON.stringify(node));
				if (rest.length==0) {
					if (debug)
						console.log('  completed');
					completed.push(node);
					continue;
				}
				var nexts = this.getNexts(node);
				if (nexts.length==0) {
					if (debug)
						console.log('  no nexts for '+JSON.stringify(node));
					state = CodeParser.PART_MATCH;
					continue;
				}
				for (var ni in nexts) {
					var next = nexts[ni];
					if (debug)
						console.log('  test next '+JSON.stringify(next));

					if (next.token===undefined) {
						continue;
					}
					var reg = new RegExp('^'+next.token);
					var res = reg.exec(rest);
					if (res===null || res[0].length==0) {
						continue;
					}
					if (debug)
						console.log('  -> '+JSON.stringify(res));
					// possible match
					if (debug)
						console.log('Matched token '+next.token+' at '+node.pos+': '+res[0]);
					var nextNode = next.node;
					if (next.nodeType!==undefined) {
						// new node
						nextNode = { type: next.nodeType, pos: node.pos, valid: next.valid };
						if (next.parent!==undefined)
							nextNode.parent = next.parent;
						if (next.children!==undefined)
							nextNode.children = next.children;
						if (debug)
							console.log('  added node '+JSON.stringify(nextNode));
					}
					if (nextNode!==null && nextNode!==undefined) {
						nextNode.pos += res[0].length
						if (next.accept!==undefined) {
							next.accept(nextNode, res[0]);
						}

						if (nextNode.parent!==null && nextNode.parent!==undefined) {
							// shallow clone, avoid children <-> parent
							var parent = angular.extend({}, nextNode.parent);
							parent.children = parent.children.slice(0);
							if (parent.children===null || parent.children===undefined) {
								parent.children = [node];
							} else if (parent.children.length==0 || parent.children[parent.children.length-1]!==null) {
								parent.children.push(nextNode);
							} else {
								parent.children[parent.children.length-1] = nextNode;
							}
							parent.pos = nextNode.pos;
							if (debug)
								console.log('  push parent node '+JSON.stringify(nextNode));
							nextNodes.push( parent );
						}
						if (debug)
							console.log('  push node '+JSON.stringify(nextNode));
						nextNodes.push( nextNode );

					} 
				}
			}
			nodes = nextNodes;
		}
		for (var ci in completed) {
			var node = completed[ci];
			if (node.valid && (node.parent===undefined || node.parent===null)) {
				// clean up
				var children = [];
				children.push(node);
				while(children.length>0) {
					var child = children.splice(0,1)[0];
					if (child!==null) {
						delete child.valid;
						delete child.pos;
						delete child.parent;
						if (child.children!==undefined) {
							for (var ci in child.children) {
								children.push(child.children[ci]);
							}
						}
					}
				}
				return {
					state: CodeParser.OK,
					node: node
				}
			}
			else {
				if (debug)
					console.log('invalid completed node '+JSON.stringify(node));
			}
		}
		
		// TODO
		return {
			state: CodeParser.ERROR
		};
	};
	var ANY_NEXT = [
	                { nodeType: CodeNode.NOTE },
	                { nodeType: CodeNode.DELAY },
	                { nodeType: CodeNode.GROUP },
	                { nodeType: CodeNode.SEQUENCE },
	                { nodeType: CodeNode.CHOICE },
	                { nodeType: CodeNode.REPEAT },
	                { nodeType: CodeNode.REPEAT_0_OR_MORE },
	                { nodeType: CodeNode.REPEAT_1_OR_MORE },
	                { nodeType: CodeNode.REPEAT_0_OR_1 },
	                { nodeType: CodeNode.NOTE_RANGE },
	                { nodeType: CodeNode.DELAY_RANGE }
	                ];
	CodeParser.prototype.getNexts = function(node) {
		// possible next(s)
		if (node.pos==0) {
			// start
			return this.expandNexts(ANY_NEXT);
		} else {
			var nexts = [];
			switch (node.type) {
			case CodeNode.NOTE:
				if (node.valid) {
					// could be SEQUENCE, CHOICE, REPEAT
					nexts.push({ token: ',', nodeType: CodeNode.SEQUENCE, children: [node,null], valid: true });
					nexts.push({ token: '\\|', nodeType: CodeNode.CHOICE, children: [node,null], valid: true });
					nexts.push({ token: '\\*', nodeType: CodeNode.REPEAT_0_OR_MORE, children: [node], valid: true });
					nexts.push({ token: '\\+', nodeType: CodeNode.REPEAT_1_OR_MORE, children: [node], valid: true });
					nexts.push({ token: '\\?', nodeType: CodeNode.REPEAT_0_OR_1, children: [node], valid: true });
				}
				if (node.octave===undefined) {
					// could be octave
					nexts.push({ token: '[0-9]+', accept: function(node, match) { node.octave = Number(match); }, node: node});

					if (node.accidental===undefined) {
						// could be accidental
						nexts.push({ token: '#|b', accept: function(node, match) { node.accidental = match; }, node: node });
					}
				}
				break;
			case CodeNode.SEQUENCE:
				if (node.children[1]===null) {
					// second note or delay
					nexts.push({ nodeType: CodeNode.NOTE, parent: node });
					nexts.push({ nodeType: CodeNode.DELAY, parent: node });
				}
				nexts.push({ token: ',', nodeType: CodeNode.SEQUENCE, children: [node,null] });
				// TODO 
				break;
			default:
				// TODO
				break;
			}
			// parent?
			return this.expandNexts(nexts);
		}
	};
	CodeParser.prototype.expandNexts = function(nexts) {
		for (var ni=0; ni<nexts.length; ni++) {
			var next = nexts[ni];
			if (next.token===undefined) {
				if (next.nodeType!==undefined){
					// new node
					switch(next.nodeType) {
					case CodeNode.NOTE:
						next.token = '[A-Ga-g]';
						next.accept = function(node, match) { console.log('accept note!'); node.name = match; node.valid = true; };
						break;
					case CodeNode.DELAY:
						next.token = '/';
						break;
					case CodeNode.GROUP:
						next.token = '\\(';
						break;
					case CodeNode.NOTE_RANGE:
						next.token = '\\[';
						break;
					case CodeNode.DELAY_RANGE:
						next.token = '/\\[';
						// alt form
						nexts.push({ token: '\\[/', nodeType: CodeNode.DELAY_RANGE, accept: function(node) { node.needSlash = true; } });
						break;
					case CodeNode.SEQUENCE:
						// null delay first
						next.token = ',';
						next.children = [null,null]
						next.valid = true;
						break;
					case CodeNode.CHOICE:
						// null delay first
						next.token = '\\|';
						next.children = [null,null]
						next.valid = true;
						break;
					}
				}
			}
		}
		return nexts;
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
