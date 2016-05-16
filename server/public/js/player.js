var playerApp = angular.module('playerApp', ['ngAnimate','ui.bootstrap',
                                             'muzicodes.audio','muzicodes.viz','muzicodes.stream','muzicodes.midi']);
// main player app
playerApp.controller('PlayerCtrl', ['$scope', '$http', '$location', 'socket', 'audionotes', '$interval',
                                    'noteGrouperFactory', 'midinotes', 'noteCoder', 'safeEvaluate',
                                    function ($scope, $http, $location, socket, audionotes, $interval,
                                    		noteGrouperFactory, midinotes, noteCoder, safeEvaluate) {
	console.log('url: '+$location.absUrl());
	var params = $location.search();
	console.log('params', params);
	var experienceFile = params['f'];
	$scope.room = params['r']===undefined ? 'default' : params['r'];
	var pin = params['p']===undefined ? '' : params['p'];
	$scope.channel = params['c']===undefined ? '' : params['c'];
	$scope.midiInputName = params['i'];
	$scope.midiOutputName = params['o'];
	
	console.log('experience='+experienceFile+', room='+$scope.room+', pin='+pin+', channel='+$scope.channel+', midiin='+$scope.midiInputName+', midiout='+$scope.midiOutputName);
	
	$scope.notes = [];
	$scope.time = 0;
	$scope.groups = [];
	$scope.activeNotes = {};
	$scope.activeGroups = {};
	
	$scope.markers = [];
	
	$scope.state = 'loading';
	$scope.noteGrouper = null;
	$scope.reftime = null;
	$scope.reftimeLocal = null;
	$scope.nextNoteId = 1;
	$scope.actionUrl = 'data:text/plain,Testing';
	
	$scope.experienceState = {};
	function updateState(state) {
		var output = {};
		for (var name in state) {
			var expression = state[name];
			output[name] = safeEvaluate($scope.experienceState, expression);
			console.log('State '+name+' = '+output[name]+' = '+expression);
		}
		for (var name in output) {
			if ($scope.experienceState [name]!==output[name]) {
				$scope.experienceState [name] = output[name];
			}
		}
		socket.emit('log', {event:'state.update', info:$scope.experienceState });
	};
	
	// midi message url prefix
	var MIDI_HEX_PREFIX = 'data:text/x-midi-hex,';

	function checkGroup(group) {
		var notes = [];
		for (var i in $scope.notes) {
			var note = $scope.notes[i];
			if (note.group==group.id)
				notes.push(note);
		}
		var codes = {};
		for (var mi in $scope.markers) {
			var marker = $scope.markers[mi];
			if (marker.precondition===undefined)
				marker.preconditionok = true;
			else
				marker.preconditionok = true==safeEvaluate($scope.experienceState, marker.precondition);
			if (!marker.preconditionok)
				continue;
			if (marker.codeformat!==undefined && marker.codeformat!==null && marker.codeformat.length>0 && marker.code!==undefined && marker.code!==null && marker.code.length>0) {
				var code = codes[marker.codeformat];
				if (code===undefined) {
					codes[marker.codeformat] = code = noteCoder.code(marker.codeformat, notes, group.closed);
				}
				if (code!==undefined) {
					if (marker.code == code) {
						console.log('Matched marker '+marker.title+' code '+marker.codeformat+':'+code);
						socket.emit('action',marker);
						if (marker.poststate!==undefined)
							updateState(marker.poststate);
						for (var ai in marker.actions) {
							var action = marker.actions[ai];
							if ($scope.channel==action.channel && action.url) {
								console.log('open '+action.url);
								if (action.url.indexOf(MIDI_HEX_PREFIX)==0) {
									// midi output
									//TODO midiSend( action.url.substring(MIDI_HEX_PREFIX.length) );
								} else {
									$scope.actionUrl = action.url;
								}
							}
						}
					} else {
						//console.log('No match, '+marker.codeformat+':'+code+' vs '+marker.code);
					}
				}
			}
		}
	}

	function checkClosedGroups(time) {
		// TODO GC old groups				
		for (var id in $scope.activeGroups) {
			var group = $scope.activeGroups[id];
			if (!!group.closed) {
				console.log('closed group '+group.id);
				delete $scope.activeGroups[group.id];
				checkGroup(group);
			}
		}
	}
	
	var RECORDING_TIMESTEP = 100;
	$scope.recordingTimer = $interval(function() {
		if ($scope.reftime!==null) {
			var now = 0.001*((new Date().getTime())-$scope.reftimeLocal);
			//console.log('now '+now+' vs '+$scope.time);
			if (now > $scope.time) {
				$scope.time = now;
				if ($scope.noteGrouper!=null) {
					$scope.noteGrouper.setTime($scope.time);
					checkClosedGroups($scope.time);
				}
			}
		}
	}, RECORDING_TIMESTEP);

	function onNote(note) {
		console.log('Got note '+JSON.stringify(note)); //note.freq+','+note.velocity+' at '+note.time);

		if ($scope.reftime===null) {
			$scope.reftime = note.time;
			$scope.reftimeLocal = new Date().getTime();
		} else {
			var now = 0.001*((new Date().getTime())-$scope.reftimeLocal);
			$scope.reftimeLocal -= note.time - now;
		}
		note.time = note.time-$scope.reftime;
		var n = $scope.activeNotes[note.note];
		if (n!==undefined) {
			n.duration = note.time-n.time;
			delete $scope.activeNotes[note.note];
		}
		if (!!note.velocity){
			if (note.time > $scope.time)
				$scope.time = note.time;
			note.id = $scope.nextNoteId++;
			$scope.notes.push(note);
			if ($scope.noteGrouper!==null && $scope.noteGrouper!==undefined) {
				var gid = $scope.noteGrouper.addNote(note);
				// TODO GC old notes
				if (gid!==undefined && gid!==null) {
					$scope.groups = $scope.noteGrouper.getGroups();
					console.log('updated group '+gid);
					for (var i in $scope.groups) {
						var group = $scope.groups[i];
						if (!group.closed && $scope.activeGroups[group.id]===undefined) {
							console.log('new active group '+group.id);
							$scope.activeGroups[group.id] = group;
						}
						if (group.id==gid)
							checkGroup(group);
					}
				}
				checkClosedGroups(note.time);
			}
			$scope.activeNotes[note.note] = note;
		}
	};
	audionotes.onNote(onNote);
	midinotes.onNote(onNote);
	
	function loaded(experience) {
		socket.on('join.error', function(msg) {
			alert('Error starting master: '+msg);
		});
		socket.emit('master',{room:$scope.room, pin:pin, channel:$scope.channel, experience:experience});
		
		// prepapre marker actions
		for (var mi in experience.markers) {
			var marker = experience.markers[mi];
			if (marker.actions===undefined)
				marker.actions = [];
			else {
				for (var ai in marker.actions) {
					var action = marker.actions[ai];
					if (action.channel===undefined)
						action.channel = '';
				}
			}
			if (marker.action!==undefined) {
				marker.actions.push({url: marker.action, channel: ''});
				delete marker.action;
			}
		}
		$scope.markers = experience.markers;

		var parameters = experience.parameters;
		if ($scope.midiInputName===undefined)
			$scope.midiInputName = parameters.midiInput;
		if ($scope.midiOutputName===undefined)
			$scope.midiOutputName = parameters.midiOutput;
		if ($scope.midiInputName!==undefined && $scope.midiInputName!='') {
			console.log('using Midi input '+midiInputName);
			$scope.state = 'midiinput';
			midinotes.start($scope.midiInputName);
		} else {
			$scope.state = 'audioinput';
			console.log('using Audio input');
			audionotes.start(parameters.vampParameters);
		}
		$scope.noteGrouper = noteGrouperFactory.create(parameters);
		
		if (experience.parameters.initstate!==undefined)
			updateState(experience.parameters.initstate);

	};
	
	$http.get(experienceFile).then(function(res) {
		var data = res.data;
		$scope.state = 'loaded';
		loaded(data);
	}, function(error) {
		$scope.state = 'error';
		if (error.status==404) {
			alert('Sorry, that experience doesn\'t seem to exist ('+experienceFile+')');
		} else {
			alert('Sorry, could load that experience: '+error.statusText+' ('+experienceFile+')');
		}
	});

}]);

playerApp.directive('urlView', ['$http', '$sce', function($http, $sce) {
	return {
		restrict: 'E',
		scope: {
			actionUrl: '='
		},
		template: '<iframe ng-src="{{internalUrl}}"></iframe>',
		link: function(scope, element, attrs) {
			scope.internalUrl = '';
			console.log('link urlView');
			scope.$watch('actionUrl', function(newValue) {
				console.log('actionUrl = '+newValue);
				scope.internalUrl = $sce.trustAsResourceUrl(newValue);
			});
		}
	};
}]);

// messy function!!
playerApp.factory('safeEvaluate', function() {
	return function(state, expression) {
		window.scriptstate = {};
		for (var si in state)
			window.scriptstate[si] = state[si];
		window.scriptstate['false'] = false;
		window.scriptstate['true'] = true;
		window.scriptstate['null'] = null;
		var result = null;
		// is expression safe? escape all names as window.scriptstate. ...
		var vpat = /([A-Za-z_][A-Za-z_0-9]*)|([^A-Za-z_])/g;
		var match = null;
		var safeexpression = '';
		while((match=vpat.exec(expression))!==null) {
			if (match[1]!==undefined) 
				safeexpression = safeexpression+'(window.scriptstate.'+match[1]+')';
			else if (match[2]!==undefined)
				safeexpression = safeexpression+match[2];
		}
		try {
			result = eval(safeexpression);
			if (result===undefined) {
				var msg = 'error evaluating '+name+'='+safeexpression+' from '+expression+': undefined';
				console.log(msg);
				alert(msg);
			}
		} catch (ex) {
			var msg = 'error evaluating '+name+'='+safeexpression+' from '+expression+': '+ex.message;
			console.log(msg);
			alert(msg);
		}
		return result;
	};
});