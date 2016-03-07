var editorApp = angular.module('editorApp', []);

editorApp.controller('EditorCtrl', ['$scope', '$http', function ($scope,$http) {
  $scope.filename = 'example.json';
  
  $scope.foo = function(a) {
	  console.log('foo: '+a);
  }
  
  $scope.addMarker = function() {
	  console.log('addMarker');
	var marker = {codeformat: $scope.newMarkerCodeformat, code: $scope.newMarkerCode, title: $scope.newMarkerTitle};
	$scope.newMarkerCodeformat = '';
	$scope.newMarkerCode = '';
	$scope.newMarkerTitle = '';
	$scope.markers.push( marker );
  };
  $scope.deleteMarker = function(index) {
	$scope.markers.splice(index,1);  
  };
  $http.get($scope.filename).success(function(data) {
    /* fix default actions */
    for (var mi in data.markers) {
      var marker = data.markers[mi];
      if (marker.action!==undefined) {
        if (marker.actions===undefined)
          marker.actions = [];
        marker.actions.push({url:marker.action,channel:''});
        delete marker.action;
      }
    }
    $scope.markers = data.markers;
    $scope.parameters = data.parameters;
    console.log('read experience with '+(data.markers.length)+' markers');
  });
}]);

editorApp.controller('MarkerCtrl', ['$scope', function ($scope) {
	console.log('new MarkerCtrl');
	// nested...
	$scope.addAction = function() {
		console.log('Add action '+$scope.newActionUrl);
		var action = {url: $scope.newActionUrl, channel: $scope.newActionChannel};
		$scope.newActionUrl = '';
		$scope.newActionChannel = '';
		$scope.marker.actions.push( action );
	};
	$scope.deleteAction = function(index) {
		$scope.marker.actions.splice(index,1);  
    };
}]);