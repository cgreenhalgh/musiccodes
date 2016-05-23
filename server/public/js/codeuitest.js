var testApp = angular.module('codeuitestApp', ['ngAnimate','ui.bootstrap',
                                             'muzicodes.codeui']);

testApp.controller('codeuitestCtrl', ['$scope','CodeNode', function($scope,CodeNode) {
	$scope.testcode = CodeNode.newSequence();
}]);