var editorApp = angular.module('editorApp', ['ngAnimate','ui.bootstrap','ngRoute',
                                             'muzicodes.audio','muzicodes.viz','muzicodes.stream','muzicodes.filters','muzicodes.midi','muzicodes.socket',
                                             'muzicodes.softkeyboard','muzicodes.noteprocessor','muzicodes.codeui','muzicodes.context','muzicodes.audioout',
                                             'muzicodes.osc']);

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

editorApp.controller('EditorCtrl', ['$scope', 'socket', function($scope,socket) {
	// register for select etc.
	socket.emit('editor');
	$scope.selectedNotes = null;
	socket.on('selectNotes', function(notes) {
		console.log('selectNotes '+JSON.stringify(notes));
		$scope.selectedNotes = notes;
	});
}]);

editorApp.controller('ExperienceCtrl', ['$scope', '$http', '$routeParams', 'getIPAddress', '$location', 'audionotes', '$interval',
                                        'noteGrouperFactory', 'midinotes', 'socket', 'audioout', '$timeout', 'midiutils',
                                        '$window', 'getIPAddresses',
                                        function ($scope,$http,$routeParams,getIPAddress,$location,audionotes,$interval,
                                        		noteGrouperFactory,midinotes,socket,audioout, $timeout, midiutils,
                                        		$window, getIPAddresses) {
	$scope.defaults = {};
	$scope.topTab = 1;
	$scope.setTopTab = function(tab) {
		$scope.topTab = tab;
	}
	$scope.bottomTab = 1;
	$scope.setBottomTab = function(tab) {
		$scope.bottomTab = tab;
	}
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
	$scope.altServerUrls = [$scope.serverProtocol+'://'+$scope.serverHost+':'+$scope.serverPort];
	if ($scope.serverHost=='localhost' || $scope.serverHost=='127.0.0.1') {
		getIPAddress().then(function(myIP) {
			console.log('resolved IP '+myIP);
			$scope.serverHost = myIP;
		});
		getIPAddresses(function(myIP) {
			var url = $scope.serverProtocol+'://'+myIP+':'+$scope.serverPort;
			if($scope.altServerUrls.indexOf(url)<0)
				$scope.altServerUrls.push( url );			
		});
	}
  $scope.filename = $routeParams.experience;
  $scope.version = $routeParams.version;
  console.log('Edit experience '+$scope.filename+' (version '+$routeParams.version+')');

  $scope.status = 'Loading '+$routeParams.experience+'...';

  $scope.addMarker = function() {
	  console.log('addMarker');
	var marker = { code: $scope.newMarkerCode, title: $scope.newMarkerTitle, 
			projection: $scope.newMarkerProjection, actions:[]};
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
  $scope.addControl = function() {
	  console.log('addControl');
	var control = { inputUrl: $scope.newControlUrl, actions:[]};
	$scope.newControlUrl = '';
	$scope.controls.push( control );
	//$scope.experienceForm.$setDirty();
	$scope.formChanged = true;
  };
  $scope.deleteControl = function(index) {
	$scope.controls.splice(index,1);  
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
		  midiOutput: '',
		  midiControl: '',
		  audioInput: '',
		  audioChannel: 0
  };
  $scope.defaultContext = {};
  $scope.projections = [];
  $scope.newProjection = {};
  $scope.markers = [];
  $scope.controls = [];
  $scope.examples = [];
  $scope.channels = [''];
  $scope.variables = [];
  $scope.showState = false;
  //$scope.experienceForm.$setDirty();
  $scope.formChanged = false;
  
  audionotes.setInput($scope.parameters.audioInput, $scope.parameters.audioChannel);
  $scope.$watch('parameters.audioInput', function(input) {audionotes.setInput(input, $scope.parameters.audioChannel); });
  $scope.$watch('parameters.audioChannel', function(channel) {audionotes.setChannel(channel);});
  
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
    if (data.controls!==undefined && data.controls!==null)
    	$scope.controls = data.controls;
    else
    	$scope.controls = [];
    if (data.examples!==undefined && data.examples!==null) {
        for (var ei in data.examples) {
        	var example = data.examples[ei];
        	if (example.filterParameters===undefined)
        		example.filterParameters = {};
        }
    	$scope.examples = data.examples;
    }
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
    $scope.defaultContext = data.defaultContext!==undefined ? data.defaultContext : {};
    $scope.projections = data.projections!==undefined ? data.projections : [];
    $scope.newProjection = {};
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
		  var data = { parameters: {}, markers: [], examples: [], controls: [] };
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
	  if ($scope.newMarkerCode || $scope.newMarkerTitle)
	    $scope.addMarker();
	  if ($scope.newControlUrl)
		$scope.addControl();
	  if ($scope.newInitstateName)
		  $scope.addInitstate();
	  if ($scope.newProjection.countsPerBeat || $scope.newProjection.pitchesPerSemitone)
		  $scope.addProjection();
	  
	  var experience = { name: $scope.name, description: $scope.description, 
			  author: $scope.author, recordAudio: $scope.recordAudio,
			  markers: $scope.markers, parameters: $scope.parameters,
			  examples: $scope.examples, defaultContext: $scope.defaultContext, 
			  projections: $scope.projections, controls: $scope.controls };
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
	window.open('/player.html#?f='+encodeURIComponent('/experiences/'+$scope.filename+($scope.version!==undefined ? '/'+$scope.version : '')),'musiccodes_master');  
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
	var onNote = function(note) {
		console.log('Got note '+JSON.stringify(note)); //note.freq+','+note.velocity+' at '+note.time);
		if (!!note.localTime && !note.time) {
			if ($scope.addingReftime===null) {
				// fudge
				$scope.addingReftime = 0;
				$scope.addingReftimeLocal = note.localTime;
			}
			note.time = (note.localTime-$scope.addingReftimeLocal)*0.001+$scope.addingReftime;
		} else if ($scope.addingReftime===null) {
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
	$scope.onNote = onNote;
	
	audionotes.onNote(onNote);
	midinotes.onNote(onNote);
	var RECORDING_TIMESTEP = 100;
	$scope.startAddExample = function() {
		$scope.addingExample = true;
		$scope.addingGroups = [];
		$scope.addingGrouper = noteGrouperFactory.create($scope.parameters);
		if (!!$scope.parameters.midiInput)
			midinotes.start($scope.parameters.midiInput);
		else {
			console.log('start recording');
			socket.emit('recordAudio', true);
			audionotes.start($scope.parameters.vampParameters);
		}
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
	$scope.pasteExample = function(notes) {
		$scope.addingExample = true;
		$scope.recordingExample = false;
		$scope.addingGrouper = noteGrouperFactory.create($scope.parameters);
		console.log('Adding pasted notes to example');
		for (var ni in notes) {
			var note = notes[ni];
			onNote(note);
		}
	}
	$scope.doneAddExample = function() {
		$scope.stopRecordingExample();
		var example = { title: $scope.newExampleTitle, rawnotes: $scope.addingExampleNotes, filterParameters: {} };
		example.context = JSON.parse(JSON.stringify($scope.defaultContext));
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
	var playTimer = null;
	var playingNotes = [];
	var playNotes = [];
	var playTime = 0;
	function playNextNote() {
		var nextTime = null;
		for (var ni=0; ni<playingNotes.length; ni++) {
			var note = playingNotes[ni];
			if (note.time+note.duration<=playTime) {
				audioout.noteOff(note);
				playingNotes.splice(ni,1);
				ni--;
			} else if (nextTime===null || nextTime>note.time+note.duration) {
				nextTime = note.time+note.duration;
			}
		}
		while (playNotes.length>0) {
			var note = playNotes[0];
			if (note.time<=playTime) {
				playNotes.splice(0,1);
				for (var ni=0; ni<playingNotes.length; ni++) {
					var n = playingNotes[ni];
					if (Math.abs(note.freq-n.freq)<0.001) {
						audioout.noteOff(n);
						playingNotes.splice(ni,1);
						ni--;
					}
				}
				if (note.duration!==undefined && note.duration!==null) {
					audioout.noteOn(note);
					playingNotes.push();
					if (nextTime===null || note.time+note.duration<nextTime)
						nextTime = note.time+note.duration;
				}
			}
			else {
				if (nextTime===null || note.time<nextTime)
					nextTime = note.time;
				break;
			}
		}
		if (nextTime!==null) {
			playTimer = $timeout(function() {
				playTime = nextTime;
				playTimer = null;
				playNextNote();
			}, 1000*(nextTime-playTime));
		}
	}
	$scope.playExample = function(example) {
		audioout.stop();
		if (playTimer!==null) {
			$timeout.cancel(playTimer);
			playTimer = null;
		}
		playNotes = example.rawnotes.slice(0);
		playingNotes = [];
		playTime = 0;
		playNextNote();
	}
	$scope.exportExample = function(example) {
		// Export to PureData midisequence.pd format, i.e.
		// 'add' delay(ms) 'note' midinote velocity duration(ms) ';'
		var notes = example.rawnotes;
		// freq, time, velocity, duration
		var time = 0;
		var output = '';
		for (var ni in notes) {
			var note = notes[ni];
			if (ni==0)
				time = note.time;
			var elapsed = note.time - time;
			time = note.time;
			output += 'add '+Math.round(elapsed*1000)+' note '+midiutils.ftom(note.freq)+' '+note.velocity+' '+Math.round(note.duration*1000)+', ';
		}
		var dataurl = 'data:text/plain;base64,'+btoa(output);
		console.log('export: '+output);
		$window.open(dataurl, '', '');
	}
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
	$scope.addProjection = function() {
		$scope.projections.push($scope.newProjection);
		$scope.newProjection = "";
		$scope.formChanged = true;
	};
	$scope.deleteProjection = function(index) {
		$scope.projections.splice(index,1);
		$scope.formChanged = true;
	}
}]);

editorApp.controller('MarkerCtrl', ['$scope', function ($scope) {
	$scope.isCollapsed = false;
	$scope.isSimple = false;
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

editorApp.controller('ControlCtrl', ['$scope', function ($scope) {
	$scope.isCollapsed = false;
	console.log('new ControlCtrl');
	// nested...
	$scope.addAction = function() {
		console.log('Add action '+$scope.newActionUrl);
		var action = {url: $scope.control.newActionUrl, channel: $scope.control.newActionChannel};
		delete $scope.control.newActionUrl;
		delete $scope.control.newActionChannel;
		$scope.control.actions.push( action );
		//$scope.experienceForm.$setDirty();
		$scope.setFormChanged();
	};
	$scope.deleteAction = function(index) {
		$scope.control.actions.splice(index,1);  
		//$scope.experienceForm.$setDirty();
		$scope.setFormChanged();
	};
}]);

editorApp.controller('ExampleCtrl', ['$scope', function ($scope) {
	$scope.isCollapsed = false;
}]);

editorApp.directive('muzicode', ['NoteProcessor', function(NoteProcessor) {
	function link(scope, element, attrs) {
		var proc = new NoteProcessor();
		scope.code = '';
		function update() {
			var projection = {};
			for (var pi in scope.projections) {
				var p = scope.projections[pi];
				if (scope.projection == p.id) 
					projection = p;
			}
			console.log('projection '+scope.projection+' = '+JSON.stringify(projection)+' (from '+JSON.stringify(scope.projections)+')');
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
				// convert to note/delay format, 
				// project notes through context and projection, normalise 
				// to String
				console.log('raw note: '+JSON.stringify(notes));
				var newNotes = proc.mapRawNotes(scope.context, notes);
				console.log('context mapped: '+JSON.stringify(newNotes));
				newNotes = proc.projectNotes(projection, newNotes);
				console.log('projected: '+JSON.stringify(newNotes));
				var code = proc.notesToString(newNotes);
				console.log('core = '+code);
				text = text + code;
			}
			scope.code = text;
		}
		scope.$watch('notes', update, true);
		scope.$watch('projection', update);
		scope.$watch('projections', update, true);
		scope.$watch('context', update, true);
		update();
	}
	return {
		restrict: 'E',
		scope: {
			 notes: '=',
			 context: '=',
			 projection: '=',
			 projections: '='
		},
		template: '<input type="text" ng-model="code" readonly="readonly">',
		link: link
	};
}]);

editorApp.directive('urlchecker', ['$http', '$timeout', 'midiout', 'MIDI_HEX_PREFIX', 'OSC_TCP_PREFIX', 'OSC_UDP_PREFIX', 'oscout',
                                   function($http, $timeout, midiout, MIDI_HEX_PREFIX, OSC_TCP_PREFIX, OSC_UDP_PREFIX, oscout) {
	return {
		restrict: 'E',
		scope: {
			ngModel: '=',
			parameters: '='
		},
		template: '<button ng-click="click()">Test</button> <span>{{ status }}</span>',
		controller: function($scope, $element) {
			function reallyCheckurl(url) {
				timeout = null;
				//console.log('test url '+url);
				if (url===undefined || url===null) {
					$scope.status = '';
					return;				
				}
				else if (url.indexOf(MIDI_HEX_PREFIX)==0) {
					$scope.status = 'Send MIDI';
					$timeout(function() { $scope.status = ''; }, 1000);
					if (!$scope.parameters.midiOutput) {
						alert('No midi output specified');
					} else {
						midiout.start($scope.parameters.midiOutput, function() { midiout.send(url); });
					}
					return;
				} else if (url.indexOf(OSC_TCP_PREFIX)==0|| url.indexOf(OSC_UDP_PREFIX)==0) {
					$scope.status = 'Send OSC';
					$timeout(function() { $scope.status = ''; }, 1000);
					oscout.send(url);
					return;
				} else if (url.indexOf('data:text/plain,')==0) {
					$scope.status = 'OK';
					return;
				} else if (url.indexOf('http:')!=0 && url.indexOf('https:')!=0) {
					$scope.status = 'Unsupported URL';
					return;
				}
				$scope.status = 'checking...';
				$http.get('/testiframeurl/?u='+encodeURIComponent(url)).success(function(data) {
					//console.log('test url (get) '+url);
					if (url!=$scope.ngModel)
						return;
					if (data=='0')
						$scope.status = 'OK';
					else if (data=='-1')
						$scope.status = 'HTTP error';
					else if (data=='-2')
						$scope.status = 'Cannot use in iframe';
					else if (data=='-3')
						$scope.status = 'Badly formed URL';
					else
						$scope.status = 'HTTP error ('+data+')';
					//$scope.status = $scope.status+' ('+data+')';
				}).error(function(data) {
					console.log('test url error '+data);
				});
			};
			$scope.click = function() {
				reallyCheckurl($scope.ngModel);
			}
		},
		link: function(scope, element, attrs) {
		}
	};
}]);
editorApp.directive('musProjection', [function() {
	return {
		restrict: 'E',
		scope: {
			projection: '='
		},
		templateUrl: '/partials/mus-projection.html'
	};
}]);
editorApp.directive('musFilterParameters', [function() {
	return {
		restrict: 'E',
		scope: {
			parameters: '='
		},
		templateUrl: '/partials/mus-filter-parameters.html'
	};
}]);
editorApp.directive('musProjectionChoice', [function() {
	return {
		restrict: 'E',
		scope: {
			 projections: '=',
			 projection: '='
		},
		template: '<label>Matching Profile:</label><select ng-model="projection">'+
	        '<option ng-repeat="projection in projections" value="{{projection.id}}">{{projection.id}}</option>'+
	      '</select>'
	};
}]);
editorApp.directive('musCodeInput', ['CodeParser', function(CodeParser) {
	var parser = new CodeParser();
	return {
		restrict: 'E',
		scope: {
			 ngModel: '='
		},
		// leave feedback to Matches
		template: '<input type="text" ng-model="ngModel" size="60">',
		link: function(scope, element, attrs) {
			function update() {
				scope.feedback = '';
				scope.error = false;
				var code = scope.ngModel;
				if (code) {
					var res = parser.parse(code);
					if (res.state==CodeParser.OK) {
						scope.feedback = 'OK';
					} else if (res.state==CodeParser.ERROR) {
						scope.error = true;
						scope.feedback = 'Error'+(res.location ? ' at char '+(res.location+1) : '')+': '+res.message;
					} else {
						scope.error = true;
						scope.feedback = JSON.stringify(res);
					}
				}
			}
			scope.$watch('ngModel', update);
			update();
		}
	};
}]);
/*				
<label>Matches:</label>
<div class="match-example" ng-repeat="example in examples">
	<span>{{ example.title }}</span>
</div>
</div>
*/

editorApp.directive('musCodeMatches', ['CodeParser','CodeMatcher','NoteProcessor', 'InexactMatcher', 'noteGrouperFactory', 
                                       function(CodeParser, CodeMatcher, NoteProcessor, InexactMatcher, noteGrouperFactory) {
	var parser = new CodeParser();
	return {
		restrict: 'E',
		scope: {
			 examples: '=',
			 code: '=',
			 projection: '=',
			 projections: '=',
			 atStart: '=',
			 atEnd: '=',
			 inexact: '=',
			 inexactError: '=',
			 isSimple: '=',
			 parameters: '='
		},
		template: '<label>Matches:</label> <span  ng-class="{\'code-error\': error}">{{ feedback }}</span>'+
		'<div class="match-example" ng-repeat="match in matches">'+
		'<span>{{ match.title }} ({{ match.error==0 ? "exact" : "error "+match.error }})</span> '+
		'</div>',
		link: function(scope, element, attrs) {
			scope.matches = [];
			function update(values) {
				scope.feedback = '';
				scope.error = false;
				if (values.code===undefined) values.code = scope.code;
				if (values.projection===undefined) values.projection = scope.projection;
				if (values.projections===undefined) values.projections = scope.projections;
				if (values.examples===undefined) values.examples = scope.examples;
				if (values.atStart===undefined) values.atStart = scope.atStart;
				if (values.atEnd===undefined) values.atEnd = scope.atEnd;
				if (values.inexact===undefined) values.inexact = scope.inexact;
				if (values.inexactError===undefined) values.inexactError = scope.inexactError;
				if (values.parameters===undefined) values.parameters = scope.parameters;
				scope.isSimple = false;
				console.log('update mus-code-matches code='+values.code+', projection='+values.projection+', examples=[0..'+(values.examples.length-1)+'], atStart='+values.atStart+', atEnd='+values.atEnd+', inexact='+values.inexact+', inexactError='+values.inexactError);
				var matcher = null;
				if (values.code) {
					var res = parser.parse(values.code);
					if (res.state==CodeParser.OK) {
						// no op
					} else if (res.state==CodeParser.ERROR) {
						scope.error = true;
						scope.feedback = 'Error'+(res.location ? ' at char '+(res.location+1) : '')+': '+res.message;
						scope.matches = [];
						return;
					} else {
						scope.error = true;
						scope.feedback = JSON.stringify(res);
						scope.matches = [];
						return;
					}
				} else {
					// empty
					scope.matches = [];
					return;					
				}
				if (!values.projections || !values.projection) {
					scope.error = true;
					scope.feedback = 'No matching profile specified';
					scope.matches = [];
					return;
				}
				var projection=null;
				for (var pi in values.projections) {
					if (values.projections[pi].id==values.projection) {
						projection = values.projections[pi];
						break;
					}
				}
				if (projection===null) {
					scope.error = true;
					scope.feedback = 'Matching profile "'+values.projection+'" not known';
					scope.matches = [];
					return;
				}
				// filter parameter overrides
				values.parameters = angular.extend({}, values.parameters, projection.filterParameters);
				//console.log('parameters',values.parameters);
				// now again with start/end (don't mess up error messages!)
				var code = values.code;
				if (!values.atStart)
					code = '.*,('+code+')';
				var res = parser.parse(code);
				if (res.state==CodeParser.OK) {
					var node = parser.normalise(res.node);
					scope.isSimple = InexactMatcher.canMatch(node);
					
					if (!values.inexact) {
						matcher = new CodeMatcher(node);
					} else if (!scope.isSimple) {
						scope.error = true;
						scope.feedback = 'Sorry, code is not simple enough for inexact match';
						scope.matches = [];
						return;
					} else {
						matcher = new InexactMatcher(node, values.inexactError, projection.inexactParameters)
					}
				}
				else {
					scope.error = true;
					scope.feedback = 'Sorry, could not build matcher for '+code;
					scope.matches = [];
					return;						
				}
				var matches = [];
				var noteprocessor = new NoteProcessor();
				for (var ei in scope.examples) {
					var example = scope.examples[ei];
					var grouper = noteGrouperFactory.create(values.parameters);
					var allnotes = [];
					for (var ni in example.rawnotes) {
						var note = example.rawnotes[ni];
						// clone due to mutation (group id)
						note = { velocity:note.velocity, freq:note.freq, time:note.time };
						allnotes.push(note);
						grouper.addNote(note);
					}
					var groups = grouper.getGroups();
					for (var gi in groups) {
						var groupid = groups[gi].id;
						var rawnotes = [];
						for (var ni in allnotes) {
							var note = allnotes[ni];
							if (note.group==groupid)
								rawnotes.push(note);
						}
						if (rawnotes.length>0) {
							//console.log('check example group '+groupid+': '+JSON.stringify(rawnotes));
							var notes = noteprocessor.mapRawNotes(example.context, rawnotes);
							if (!notes) {
								scope.error = true;
								scope.feedback = 'Sorry, could not map raw notes';
								scope.matches = [];
								return;						
							}
							notes = noteprocessor.projectNotes(projection, notes);
							if (!notes) {
								scope.error = true;
								scope.feedback = 'Sorry, could not project notes';
								scope.matches = [];
								return;						
							}
							//console.log('check projected notes '+JSON.stringify(notes));
							matcher.reset();
							var everMatch = false, lastMatch = false, everError, lastError;
							for (var ni in notes) {
								var note = notes[ni];
								lastMatch = matcher.matchNext(note);
								lastError = matcher.getError();
								if (lastMatch) {
									if (!everMatch || lastError<everError)
										everError = lastError;
									everMatch = true;
								}
							}
							if (lastMatch || (everMatch && !values.atEnd)) {
								console.log('code '+values.code+' matches example '+example.title);
								if (everMatch && !values.atEnd)
									matches.push({title: example.title, error: everError});
								else
									matches.push({title: example.title, error: lastError});
							} else {
								console.log('code '+values.code+' does not match example '+example.title+': '+JSON.stringify(notes)+' vs '+JSON.stringify(node));
							}
						}
						else {
							console.log('no notes found in example group '+groupid+' from '+JSON.stringify(allnotes));
						}
					}
				}
				scope.matches = matches;
			}
			scope.$watch('code', function(code) { update({code:code}); });
			scope.$watch('projection', function(projection) { update({projection:projection}); });
			scope.$watch('projections', function(projections) { update({projections:projections}); }, true);
			scope.$watch('examples', function(examples) { update({examples:examples}); }, true);
			scope.$watch('atEnd', function(atEnd) { update({atEnd:atEnd}); });
			scope.$watch('atStart', function(atStart) { update({atStart:atStart}); });
			scope.$watch('inexact', function(inexact) { update({inexact:inexact}); });
			scope.$watch('inexactError', function(inexactError) { update({inexactError:inexactError}); });
			scope.$watch('parameters', function(parameters) { update({parameters:parameters}); }, true);
			update({});
		}
	};
}]);

