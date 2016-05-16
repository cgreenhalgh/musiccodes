var editorApp = angular.module('editorApp', ['ngAnimate','ui.bootstrap','ngRoute',
                                             'muzicodes.audio','muzicodes.viz','muzicodes.stream','muzicodes.filters','muzicodes.midi']);

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
// getIPAddress().then(...)
editorApp.factory('getIPAddress', ['$window', '$q', function($window, $q) {
	var deferred = $q.defer();
	var promise = deferred.promise;
	// get ip address
	// see http://stackoverflow.com/questions/20194722/can-you-get-a-users-local-lan-ip-address-via-javascript
	// Local only - no stun / public
	$window.RTCPeerConnection = $window.RTCPeerConnection || $window.mozRTCPeerConnection || $window.webkitRTCPeerConnection;   //compatibility for firefox and chrome
	var pc = new RTCPeerConnection({iceServers:[]}), noop = function(){};
	pc.createDataChannel("");    //create a bogus data channel
	pc.createOffer(pc.setLocalDescription.bind(pc), noop);    // create offer and set local description
	pc.onicecandidate = function(ice){  //listen for candidate events
		if(!ice || !ice.candidate || !ice.candidate.candidate)  return;
		console.log('got candidate '+ice.candidate.candidate);
		var myIP = /([0-9]{1,3}(\.[0-9]{1,3}){3}|[a-f0-9]{1,4}(:[a-f0-9]{1,4}){7})/.exec(ice.candidate.candidate);
		if (myIP!==null) {
			console.log('my IP: ', myIP[1]);
			pc.onicecandidate = noop;
			deferred.resolve(myIP[1]);
		}
	};
	return function() { return promise; }

}]);

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

editorApp.controller('ExperienceCtrl', ['$scope', '$http', '$routeParams', 'getIPAddress', '$location', 'audionotes', '$interval',
                                        'noteGrouperFactory', 'midinotes',
                                        function ($scope,$http,$routeParams,getIPAddress,$location,audionotes,$interval,noteGrouperFactory,midinotes) {
	$scope.defaults = {};
	$http.get('/defaults').success(function(data) {
		$scope.defaults = data;
		console.log('loaded defaults '+JSON.stringify(data));
		if ($scope.author===undefined && $scope.defaults.author!==undefined && $scope.defaults.author!='') {
			$scope.author = $scope.defaults.author;
			$scope.formChanged = true;
		}
		if ($scope.recordAudio===undefined && $scope.defaults.recordAudio===true) {
			$scope.recordAudio = $scope.defaults.recordAudio;
			$scope.formChanged = true;
		}
	});
	$scope.instrumentOptions = [{value:0,name:'Unspecified'}];
	// vamp parameters
	$http.get('/vampPlugins').success(function(data) {
		// TODO generalise
		if (data['silvet:silvet']!==undefined) {
			var silvet = data['silvet:silvet'];
			if (silvet.parameters!==undefined) {
				var found = false;
				for (var pi in silvet.parameters) {
					var parameter = silvet.parameters[pi];
					if (parameter.name=='instrument') {
						console.log('Read silvet instrument options: '+parameter.options);
						$scope.instrumentOptions = parameter.options;
						found = true;
					}
				}
				if (!found) {
					console.log('Got silvet info but no instrument parameter: '+JSON.stringify(silvet));					
				}
			}
			else {
				console.log('Got silvet info but no parameters: '+JSON.stringify(silvet));
			}
		}
		else {
			console.log('Got vampPlugins  but no silvet plugin: '+JSON.stringify(data));
		}
	});
	// ip
	$scope.serverProtocol = $location.protocol();
	$scope.serverHost = $location.host();
	$scope.serverPort = $location.port();
	if ($scope.serverHost=='localhost' || $scope.serverHost=='127.0.0.1') {
		getIPAddress().then(function(myIP) {
			console.log('resolved IP '+myIP);
			$scope.serverHost = myIP;
		});
	}
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
	//$scope.experienceForm.$setDirty();
	$scope.formChanged = true;
  };
  $scope.deleteMarker = function(index) {
	$scope.markers.splice(index,1);  
	//$scope.experienceForm.$setDirty();
	$scope.formChanged = true;
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
		  vampParameters: { instrument: 0 },
		  midiInput: '',
		  midiOutput: ''
  };
  $scope.markers = [];
  $scope.examples = [];
  $scope.channels = [''];
  $scope.variables = [];
  $scope.showState = false;
  //$scope.experienceForm.$setDirty();
  $scope.formChanged = false;
  var loaded = function(data) {
	  console.log('loaded '+JSON.stringify(data));
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
      if (marker.poststate===undefined)
    	  marker.poststate = {};
      for (var v in marker.poststate)
    	  if ($scope.variables.indexOf(v)<0)
    		  $scope.variables.push(v);
    }
    $scope.markers = data.markers;
    if (data.examples!==undefined && data.examples!==null)
    	$scope.examples = data.examples;
    else
    	$scope.examples = [];
    // TODO update group/parameters?
    // vamp plugin instrument
    if (data.parameters.vampParameters===undefined)
      data.parameters.vampParameters = { instrument: 0 };
    else if (data.parameters.vampParameters.instrument===undefined)
      data.parameters.vampParameters.instrument = 0;
    // variables
    if (data.parameters.initstate===undefined)
    	data.parameters.initstate = {};
    for (var v in data.parameters.initstate)
  	  if ($scope.variables.indexOf(v)<0)
  		  $scope.variables.push(v);
    for (var vi in $scope.variables) {
    	var name = $scope.variables[vi];
    	if (data.parameters.initstate[name]===undefined)
    		data.parameters.initstate[name] = '';
    }
    $scope.parameters = data.parameters;
    $scope.name = data.name;
    $scope.description = data.description;
    $scope.formChanged = false;
    $scope.author = data.author;
    $scope.recordAudio = data.recordAudio;
    console.log('read experience with '+(data.markers.length)+' markers');
    $scope.experienceForm.$setPristine();
  };
    $http.get('/experiences/'+$scope.filename+($scope.version!==undefined ? '/'+$scope.version : '')).then(function(res) {
    	var data = res.data;
    	$scope.status = 'Loaded '+$routeParams.experience;
    	loaded(data);
  }, function(error) {
	  if (error.status==404) {
		  $scope.status = 'File does not exist';
		  // new file
		  var data = { parameters: {}, markers: [], examples: [] };
		  if ($scope.defaults!==undefined) {
			  data.author = $scope.defaults.author;
			  data.recordAudio = $scope.defaults.recordAudio;
		  }
		  loaded(data);
		  $scope.formChanged = true;
	  } else
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
	    // fix poststate non-assigns
	    for (var name in marker.poststate) {
	    	if (marker.poststate[name]=='')
	    		delete marker.poststate[name];
	    }
	  }
	  if ($scope.newMarkerCodeformat || $scope.newMarkerCode || $scope.newMarkerTitle)
	    $scope.addMarker();
	  if ($scope.newInitstateName)
		  $scope.addInitstate();
	  
	  var experience = { name: $scope.name, description: $scope.description, 
			  author: $scope.author, recordAudio: $scope.recordAudio,
			  markers: $scope.markers, parameters: $scope.parameters,
			  examples: $scope.examples };
	  // refresh channels
	  $scope.channels = [''];
	  for (var mi in $scope.markers) {
	    var marker = $scope.markers[mi];
	    for (var ci in marker.actions) {
	      var action = marker.actions[ci];
	      if (action.channel!==undefined && $scope.channels.indexOf(action.channel)<0)
	        $scope.channels.push(action.channel);
	    }
	  }

	  $scope.status = "Saving...";
	  $scope.experienceForm.$setPristine();
	  $scope.formChanged = false;
	  // todo disable until done
	  $http.put('/experiences/'+filename, experience).then(function(res) {
		  $scope.status = 'Saved';
	  }, function(err) {
		 $scope.status = 'Error saving: '+err.statusText;
		 //$scope.experienceForm.$setDirty();
		 $scope.formChanged = true;
	  });
  };
  $scope.openMaster = function() {
	// Note: remote access to microphone requires https if not localhost
	// so no remote master for now
	window.open('/master.html?f='+encodeURIComponent('/experiences/'+$scope.filename+($scope.version!==undefined ? '/'+$scope.version : '')),'musiccodes_master');  
  };
  $scope.openSlave = function(ci) {
	window.open($scope.serverProtocol+'://'+$scope.serverHost+':'+$scope.serverPort+'/fullscreenslave.html?c='+
		encodeURIComponent($scope.channels[ci]),'musiccodes_slave_'+$scope.channels[ci]);  
	  };
	$scope.openSlaveQR = function(ci) {
		var url = $scope.serverProtocol+'://'+$scope.serverHost+':'+$scope.serverPort+'/fullscreenslave.html?c='+encodeURIComponent($scope.channels[ci]);
		var win=window.open('http://chart.googleapis.com/chart?cht=qr&chs=300x300&choe=UTF-8&chld=H&chl='+encodeURIComponent(url),'qr','height=300,width=300,left='+(screen.width/2-150)+',top='+(screen.height/2-150)+',titlebar=no,toolbar=no,location=no,directories=no,status=no,menubar=no');
		if (window.focus) {win.focus();}
	};
	$scope.addInitstate = function() {
		if ($scope.newInitstateName===undefined || $scope.newInitstateName=='')
			return;
		$scope.parameters.initstate[$scope.newInitstateName] = $scope.newInitstateValue;
		if ($scope.variables.indexOf($scope.newInitstateName)<0)
			$scope.variables.push($scope.newInitstateName);
		$scope.newInitstateName = '';
		$scope.newInitstateValue = '';
		//$scope.experienceForm.$setDirty();
		$scope.formChanged = true;
	};
	$scope.deleteInitstate = function(name) {
		delete $scope.parameters.initstate[name];
		// delete from all poststates!
		for (var mi in $scope.markers) {
			var marker = $scope.markers[mi];
			if (marker.poststate[name]!==undefined)
				delete marker.poststate[name];
		}
		$scope.variables.splice($scope.variables.indexOf(name),1);
		//$scope.experienceForm.$setDirty();
		$scope.formChanged = true;
	};
	$scope.setFormChanged = function() {
		$scope.formChanged = true;
	};
	// examples...
	$scope.addingExample = false;
	$scope.addingExampleNotes = [];
	$scope.recordingExample = false;
	$scope.nextNoteId = 1;
	$scope.addingReftime = null;
	$scope.addingReftimeLocal = null;
	$scope.addingActiveNotes = {};
	$scope.addingTime = 0;
	$scope.recordingTimer = null;
	$scope.addingGrouper = null;
	$scope.addingGroups = [];
	// default...
	$scope.addingExampleCodeformat = 'no';
	var onNote = function(note) {
		console.log('Got note '+JSON.stringify(note)); //note.freq+','+note.velocity+' at '+note.time);
		if ($scope.addingReftime===null) {
			$scope.addingReftime = note.time;
			$scope.addingReftimeLocal = new Date().getTime();
		}
		note.time = note.time-$scope.addingReftime;
		var n = $scope.addingActiveNotes[note.note];
		if (n!==undefined) {
			n.duration = note.time-n.time;
			delete $scope.addingActiveNotes[note.note];
		}
		if (!!note.velocity){
			if (note.time > $scope.addingTime)
				$scope.addingTime = note.time;
			note.id = $scope.nextNoteId++;
			if ($scope.addingGrouper!==null && $scope.addingGrouper!==undefined) {
				var gid = $scope.addingGrouper.addNote(note);
				if (gid!==undefined && gid!==null)
					$scope.addingGroups = $scope.addingGrouper.getGroups();
			}
			$scope.addingExampleNotes.push(note);
			$scope.addingActiveNotes[note.note] = note;
		}
	};
	audionotes.onNote(onNote);
	midinotes.onNote(onNote);
	var RECORDING_TIMESTEP = 100;
	$scope.startAddExample = function() {
		$scope.addingExample = true;
		$scope.addingGroups = [];
		$scope.addingGrouper = noteGrouperFactory.create($scope.parameters);
		if (!!$scope.parameters.midiInput)
			midinotes.start($scope.parameters.midiInput);
		else
			audionotes.start($scope.parameters.vampParameters);
		$scope.recordingExample = true;
		$scope.recordingTimer = $interval(function() {
			if ($scope.addingReftime!==null) {
				var now = 0.001*((new Date().getTime())-$scope.addingReftimeLocal);
				console.log('now '+now+' vs '+$scope.addingTime);
				if (now > $scope.addingTime)
					$scope.addingTime = now;
			}
		}, RECORDING_TIMESTEP);
	};
	$scope.stopRecordingExample = function() {
		if ($scope.recordingTimer) {
			$interval.cancel($scope.recordingTimer);
			$scope.recordingTimer = null;
		}
		audionotes.stop();
		midinotes.stop();
		// TODO midi, etc. aswell
		$scope.recordingExample = false;
	};
	$scope.doneAddExample = function() {
		$scope.stopRecordingExample();
		var example = { title: $scope.newExampleTitle, rawnotes: $scope.addingExampleNotes, codeformat: $scope.addingExampleCodeformat };
		$scope.examples.push( example );
		// tidy up
		$scope.cancelAddExample();
		$scope.formChanged = true;	
	};
	$scope.cancelAddExample = function() {
		$scope.stopRecordingExample();
		$scope.addingExample = false;
		$scope.newExampleTitle = '';
		$scope.addingExampleNotes = [];
		$scope.addingReftime = null;
		$scope.addingActiveNotes = {};
		$scope.addingTime = 0;
		$scope.addingGrouper = null;
		$scope.addingGroups = [];
	};
	$scope.deleteExample = function(index) {
		$scope.examples.splice(index,1);  
		$scope.formChanged = true;	
	};
	$scope.$watch('parameters', function(newVals, oldVals) {
		console.log('updated parameters -> update groups');
		if ($scope.addingExampleNotes.length>0) {
			$scope.addingGroups = [];
			$scope.addingGrouper = noteGrouperFactory.create($scope.parameters);
			for (var i in $scope.addingExampleNotes) {
				var note = $scope.addingExampleNotes[i];
				$scope.addingGrouper.addNote(note);
			}
			$scope.addingGroups = $scope.addingGrouper.getGroups();
		}
	}, true);

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
		//$scope.experienceForm.$setDirty();
		$scope.setFormChanged();
	};
	$scope.deleteAction = function(index) {
		$scope.marker.actions.splice(index,1);  
		//$scope.experienceForm.$setDirty();
		$scope.setFormChanged();
	};
}]);

editorApp.controller('ExampleCtrl', ['$scope', function ($scope) {
	$scope.isCollapsed = true;
}]);

editorApp.directive('codeformat', [function() {
	return {
		restrict: 'E',
		scope: {
			 data: '='
		},
		template: '<select ng-model="data">'+
	        '<option value=""></option>'+
			'<option value="n">n</option>'+
			'<option value="no">no</option>'+
			'<option value="no/crle4,">no/crle4,</option>'+
			'<option value="no/crfe4,">no/crfe4,</option>'+
			'<option value="mrle0/crle4,">mrle0/crle4,</option>'+
	      '</select>'
	};
}]);

editorApp.directive('muzicode', ['noteCoder', function(noteCoder) {
	function link(scope, element, attrs) {
		scope.code = '';
		function update() {
			var groups = [];
			for (var i in scope.notes) {
				var note = scope.notes[i];
				if (note.group!==undefined)
					if (groups.indexOf(note.group)<0)
						groups.push(note.group);
			}
			var text = '';
			for (var gi in groups) {
				var gid = groups[gi];
				if (text.length>0)
					text = text+' ';
				var notes = [];
				if (!!scope.notes) {
					for (var i in scope.notes) {
						var note = scope.notes[i];
						if (note.group==gid)
							notes.push(note);
						//text = text+note.note;
					}
				}
				text = text + noteCoder.code(scope.codeformat, notes);
			}
			scope.code = text;
		}
		scope.$watch('notes', update, true);
		scope.$watch('codeformat', update);
		update();
	}
	return {
		restrict: 'E',
		scope: {
			 notes: '=',
			 codeformat: '='
		},
		template: '<input type="text" ng-model="code" readonly="readonly">',
		link: link
	};
}]);