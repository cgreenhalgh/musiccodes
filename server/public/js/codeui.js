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
	CodeNode.SEQUENCE = 3;
	CodeNode.CHOICE = 4;
	CodeNode.REPEAT = 5;
	CodeNode.REPEAT_0_OR_MORE = 6;
	CodeNode.REPEAT_1_OR_MORE = 7;
	CodeNode.REPEAT_0_OR_1 = 8;
	CodeNode.NOTE_RANGE = 9;
	CodeNode.DELAY_RANGE = 10;
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
