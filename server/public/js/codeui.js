var codeui = angular.module('muzicodes.codeui', []);

// Code node class
codeui.factory('CodeNode', function() {
	var nextId = 1;
	function CodePart(type) {
		this.type = type;
		this.id = nextId++;
	}
	CodePart.FIXED_TEXT = 1;
	CodePart.NODE = 2;
	CodePart.NOTE_NAME = 3;
	CodePart.NOTE_ACCIDENTAL = 4;
	CodePart.NUMBER = 5;
	CodePart.prototype.toString = function() {
		switch(this.type) {
		case CodePart.FIXED_TEXT:
		case CodePart.NOTE_NAME:
		case CodePart.NOTE_ACCIDENTAL:
			return this.text;
		case CodePart.NUMBER:
			// TODO precision?
			return this.number;
		}
		console.log('Warning: CodePart.toString for type '+this.type);
	}

	CodePart.newFixedText = function(text) {
		var part = new CodePart(CodePart.FIXED_TEXT);
		part.text = text;
		return part;
	}
	
	function CodeNode(type) {
		this.type = type;
		this.children = [];
		this.initParts();
		this.id = nextId++;
	};
	CodeNode.NOTE = 1;
	CodeNode.DELAY = 2;
	CodeNode.SEQUENCE = 3;
	CodeNode.CHOICE = 4;
	CodeNode.REPEAT = 5;
	CodeNode.NOTE_RANGE = 6;
	CodeNode.DELAY_RANGE = 7;
	CodeNode.prototype.initParts = function() {
		switch(this.type) {
		case CodeNode.NOTE:
			this.parts = [new CodePart(CodePart.NOTE_NAME), new CodePart(CodePart.NOTE_ACCIDENTAL)];
			break;
		case CodeNode.DELAY:
			this.parts = [CodePart.newFixedText('/'), new CodePart(CodePart.NUMBER)];
			break;
		case CodeNode.SEQUENCE:
		case CodeNode.CHOICE:
			this.parts = [CodePart.newFixedText('('), CodePart.newFixedText(')')];
			// TODO children?
			break;
		case CodeNode.REPEAT:
			this.parts = [new CodePart(CodePart.NOTE), CodePart.newFixedText('{'), CodePart.newFixedText(','), CodePart.newFixedText('}') ]
			// TODO min/max?
			break;
		case CodeNode.NOTE_RANGE:
		case CodeNode.DELAY_RANGE:
			this.parts = [CodePart.newFixedText('['), CodePart.newFixedText('-'), CodePart.newFixedText(']')];
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
	
	CodeNode.newSequence = function() {
		return new CodeNode(CodeNode.SEQUENCE);
	}
	return CodeNode;
});

codeui.directive('muzCode', [function() {
	return {
		restrict: 'E',
		scope: {
			ngModel: '='
		},
		template: '<muz-term ng-model="ngModel"></muz-term>',
		link: function(scope, element, attrs) {
			scope.insertPoint = [];
			scope.selection = [];
		}
	};
}]);
codeui.directive('muzTerm', [function() {
	return {
		restrict: 'E',
		scope: {
			ngModel: '='
		},
		template: '<muz-part ng-repeat="part in parts track by part.id" ng-model="part"></muz-part>',
		link: function(scope, element, attrs) {
			console.log('muzTerm with parts '+JSON.stringify(scope.ngModel.parts));
			scope.parts = scope.ngModel.getParts();
		}
	};
}]);
codeui.directive('muzPart', [function() {
	return {
		restrict: 'E',
		scope: {
			ngModel: '='
		},
		template: '{{ngModel.toString()}}',
		link: function(scope, element, attrs) {
		}
	};
}]);