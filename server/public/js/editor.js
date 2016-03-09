var editorApp = angular.module('editorApp', ['ngAnimate','ui.bootstrap','ngRoute']);

editorApp.config(['$routeProvider',
  function($routeProvider) {
    $routeProvider.when('/:experience', {
      templateUrl: '/partials/experience.html',
      controller: 'ExperienceCtrl'
    }).
    when('/:experience/:version', {
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

editorApp.controller('ListCtrl', ['$scope', '$http', '$location', function($scope,$http,$location) {
	$http.get('/experiences/').success(function(data) {
		var experiences = [];
		for (var name in data) {
			var experience = data[name];
			experience.name = name;
			experiences.push(experience);
		}
		$scope.experiences = experiences;
	});
	$scope.newExperience = '';
	$scope.addExperience = function() {
		var experience = $scope.newExperience;
		if (experience.length==0)
			return;
		$scope.newExperience = '';
		if (experience.indexOf('.json')<0)
			experience = experience+'.json';
		console.log('add experience '+experience);
		$location.url('/'+experience);
	};
}]);

editorApp.controller('ExperienceCtrl', ['$scope', '$http', '$routeParams', function ($scope,$http,$routeParams) {
  $scope.filename = $routeParams.experience;
  $scope.version = $routeParams.version;
  console.log('Edit experience '+$scope.filename+' (version '+$routeParams.version+')');

  $scope.status = 'Loading '+$routeParams.experience+'...';

  $scope.addMarker = function() {
	  console.log('addMarker');
	var marker = {codeformat: $scope.newMarkerCodeformat, code: $scope.newMarkerCode, title: $scope.newMarkerTitle, actions:[]};
	$scope.newMarkerCodeformat = '';
	$scope.newMarkerCode = '';
	$scope.newMarkerTitle = '';
	$scope.markers.push( marker );
	$scope.experienceForm.$setDirty();
  };
  $scope.deleteMarker = function(index) {
	$scope.markers.splice(index,1);  
	$scope.experienceForm.$setDirty();
  };
  // defaults
  if ($scope.filename.indexOf('.json')>=0)
	  $scope.name = $scope.filename.substring(0,$scope.filename.indexOf('.json'));
  else
	  $scope.name = $scope.filename;
  $scope.parameters = {
		  streamGap: 1.0,
		  frequencyRatio: 2.05,
		  monophonic: false,
		  monophonicGap: 0.1,
		  vampParameters: { instrument: 0 }
  };
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
  $scope.markers = [];
  $scope.channels = [''];
  //$scope.experienceForm.$setDirty();
  $http.get('/experiences/'+$scope.filename+($scope.version!==undefined ? '/'+$scope.version : '')).then(function(res) {
	  var data = res.data;
	  $scope.status = 'Loaded '+$routeParams.experience;
    /* fix default actions */
    for (var mi in data.markers) {
      var marker = data.markers[mi];
      if (marker.action!==undefined) {
        if (marker.actions===undefined)
          marker.actions = [];
        marker.actions.push({url:marker.action,channel:''});
        delete marker.action;
      }
      for (var ci in marker.actions) {
    	  var action = marker.actions[ci];
    	  if (action.channel!==undefined && $scope.channels.indexOf(action.channel)<0)
    		  $scope.channels.push(action.channel);
      }
    }
    $scope.markers = data.markers;
    // vamp plugin instrument
    if (data.parameters.vampParameters===undefined)
      data.parameters.vampParameters = { instrument: 0 };
    else if (data.parameters.vampParameters.instrument===undefined)
      data.parameters.vampParameters.instrument = 0;
    $scope.parameters = data.parameters;
    $scope.name = data.name;
    $scope.description = data.description;
    console.log('read experience with '+(data.markers.length)+' markers');
    $scope.experienceForm.$setPristine();
  }, function(error) {
	  if (error.status==404)
		  $scope.status = 'File does not exist';
	  else
		  $scope.status = 'Error loading '+$routeParams.experience+': '+error.statusText;
  });
  $scope.checkFilename = function() {
	$scope.filenameStatus = '(checking...)';
	$http.get('/experiences/'+$scope.filename).then(function(res) {
		$scope.filenameStatus = '(file exists)';
	}, function(res) {
		if (res.status==404)
			$scope.filenameStatus = '(file does not exist)';
		else
			$scope.filenameStatus = '(error: '+res.statusText+')';
	});
  };
  $scope.save = function() {
	  var filename = $scope.filename;
	  console.log('save '+filename);
	  // fix part adds
	  for (var mi in $scope.markers) {
	    var marker = $scope.markers[mi];
	    if ((marker.newActionUrl!==undefined && marker.newActionUrl!='') || (marker.newActionChannel!==undefined && marker.newActionChannel!='')) {
	      var action = {url: marker.newActionUrl, channel: marker.newActionChannel};
	      delete marker.newActionUrl;
	      delete marker.newActionChannel;
	      marker.actions.push( action );
            }
	  }
	  if ($scope.newMarkerCodeformat || $scope.newMarkerCode || $scope.newMarkerTitle)
	    $scope.addMarker();
	  var experience = { name: $scope.name, description: $scope.description, 
			  markers: $scope.markers, parameters: $scope.parameters };
	  $scope.status = "Saving...";
	  $scope.experienceForm.$setPristine();
	  // todo disable until done
	  $http.put('/experiences/'+filename, experience).then(function(res) {
		  $scope.status = 'Saved';
	  }, function(err) {
		 $scope.status = 'Error saving: '+err.statusText;
		 $scope.experienceForm.$setDirty();
	  });
  };
  $scope.openMaster = function() {
	window.open('/master.html?f='+encodeURIComponent('/experiences/'+$scope.filename+($scope.version!==undefined ? '/'+$scope.version : '')),'musiccodes_master');  
  };
  $scope.openSlave = function(ci) {
		window.open('/fullscreenslave.html?c='+encodeURIComponent($scope.channels[ci]),'musiccodes_slave_'+$scope.channels[ci]);  
	  };
}]);

editorApp.controller('MarkerCtrl', ['$scope', function ($scope) {
	$scope.isCollapsed = true;
	console.log('new MarkerCtrl');
	// nested...
	$scope.addAction = function() {
		console.log('Add action '+$scope.newActionUrl);
		var action = {url: $scope.marker.newActionUrl, channel: $scope.marker.newActionChannel};
		delete $scope.marker.newActionUrl;
		delete $scope.marker.newActionChannel;
		$scope.marker.actions.push( action );
		$scope.experienceForm.$setDirty();
	};
	$scope.deleteAction = function(index) {
		$scope.marker.actions.splice(index,1);  
		$scope.experienceForm.$setDirty();
	};
}]);
