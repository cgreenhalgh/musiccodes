var editorApp = angular.module('editorApp', ['ngAnimate','ui.bootstrap','ngRoute']);

editorApp.config(['$routeProvider',
  function($routeProvider) {
    $routeProvider.when('/:experience', {
      templateUrl: '/partials/experience.html',
      controller: 'ExperienceCtrl'
    }).
    when('/', {
      templateUrl: '/partials/list.html',
      controller: 'ListCtrl'
    }).
    otherwise({
      redirectTo: '/'
    });
  }
]);

editorApp.controller('ListCtrl', ['$scope', '$http', function($scope,$http) {
  // TODO
}]);

editorApp.controller('ExperienceCtrl', ['$scope', '$http', '$routeParams', function ($scope,$http,$routeParams) {
  $scope.filename = $routeParams.experience;
  console.log('Edit experience '+$scope.filename);

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
  $http.get('/experience/'+$scope.filename).success(function(data) {
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
    // vamp plugin instrument
    if (data.parameters.vampParameters===undefined)
      data.parameters.vampParameters = { instrument: 0 };
    else if (data.parameters.vampParameters.instrument===undefined)
      data.parameters.vampParameters.instrument = 0;
    $scope.parameters = data.parameters;
    $scope.instrumentOptions = [
	{name:"Multiple or unknown instruments",value:0},
	{name:"Piano",value:1},
	{name:"Guitar",value:2},
	{name:"Violin",value:3},
	{name:"Viola",value:4},
	{name:"Cello",value:5},
	{name:"Horn",value:6},
	{name:"Flute",value:7},
	{name:"Oboe",value:8},
	{name:"Clarinet",value:9},
	{name:"Tenor Sax",value:10},
	{name:"Bassoon",value:11},
	{name:"String quartet",value:12},
	{name:"Wind ensemble",value:13}
    ];
    $scope.name = data.name;
    $scope.description = data.description;
    console.log('read experience with '+(data.markers.length)+' markers');
  });
}]);

editorApp.controller('MarkerCtrl', ['$scope', function ($scope) {
	$scope.isCollapsed = true;
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
