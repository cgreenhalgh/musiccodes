var playerApp = angular.module('playerApp', ['ngAnimate','ui.bootstrap',
                                             'muzicodes.audio','muzicodes.viz','muzicodes.stream','muzicodes.midi','muzicodes.logging']);
// main player app
playerApp.controller('PlayerCtrl', ['$scope', '$http', '$location', 'socket', 'audionotes', '$interval',
                                    'noteGrouperFactory', 'midinotes', 'noteCoder', 'safeEvaluate',
                                    'MIDI_HEX_PREFIX', 'midiout', 'logger', '$window',
                                    function ($scope, $http, $location, socket, audionotes, $interval,
                                    		noteGrouperFactory, midinotes, noteCoder, safeEvaluate,
                                    		MIDI_HEX_PREFIX, midiout, logger, $window) {
	console.log('url: '+$location.absUrl());
	var params = $location.search();
	console.log('params', params);
	var experienceFile = $scope.experienceFile = params['f'];
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
	
	$scope.recording = false;
	
	$scope.state = 'loading';
	$scope.noteGrouper = null;
	$scope.reftime = null;
	$scope.reftimeLocal = null;
	$scope.nextNoteId = 1;
	$scope.actionUrl = 'data:text/plain,Testing';
	var codeMatchers = {};
	
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
		logger.log( 'state.update', $scope.experienceState );
	};
	
	$scope.lastGroup = null;
	
	function checkGroup(group) {
		var notes = [];
		for (var i in $scope.notes) {
			var note = $scope.notes[i];
			if (note.group==group.id)
				notes.push(note);
		}
		// publish to partcodes view
		console.log('update lastGroup');
		$scope.lastGroup = { notes: notes, closed: group.closed };
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
				if (code!==undefined && codeMatchers[marker.code]!==undefined) {
					if ( codeMatchers[marker.code].regex.test( code ) ) {
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
									midiout.send( action.url );
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
			if (!group.closed && group.lastTime<time-$scope.parameters.streamGap) {
				group.closed = true;
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
		if (n!==undefined && !!n.velocity) {
			n.duration = note.time-n.time;
			delete $scope.activeNotes[note.note];
		}
		if (note.time > $scope.time)
			$scope.time = note.time;
		if (!!note.velocity){
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
			}
			$scope.activeNotes[note.note] = note;
		}
		checkClosedGroups(note.time);
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
		for (var mi in experience.markers) {
			var marker = experience.markers[mi];
			if (marker.code && marker.code.length>0) {
				var code = marker.code;
				if (code[code.length-1]=='$') 
					// escape to match exact
					code = code.substring(0, code.length-1)+'\\$$';
				else
					// to end
					code = code+'$';
				codeMatchers[marker.code] = { regex: new RegExp(code) };
			}
		}
		$scope.markers = experience.markers;

		var parameters = experience.parameters;
		$scope.parameters = parameters;
		if ($scope.parameters.streamGap===undefined)
			$scope.parameters.streamGap = 2; // default 2s
		if ($scope.midiInputName===undefined)
			$scope.midiInputName = parameters.midiInput;
		if ($scope.midiOutputName===undefined)
			$scope.midiOutputName = parameters.midiOutput;
		if ($scope.midiInputName!==undefined && $scope.midiInputName!='') {
			console.log('using Midi input '+$scope.midiInputName);
			$scope.state = 'midiinput';
			midinotes.start($scope.midiInputName);
		} else {
			$scope.state = 'audioinput';
			console.log('using Audio input');
			if (!!experience.recordAudio) {
				socket.emit('recordAudio', true);
				$scope.recording = true;
				$scope.recordingStatus = "Recording";
				$scope.recordingStopped = false;
			} else {
				$scope.listening = true;
				$scope.recordingStatus = "Listening";
				$scope.recordingStopped = false;
			}
			audionotes.start(parameters.vampParameters);
		}
		if ($scope.midiOutputName!==undefined && $scope.midiOutputName!='') {
			console.log('Using midi output '+$scope.midiOutputName);
			midiout.start($scope.midiOutputName);
		}
		$scope.noteGrouper = noteGrouperFactory.create(parameters);
		
		if (experience.parameters.initstate!==undefined)
			updateState(experience.parameters.initstate);

	};
	
	$scope.stopRecording = function() {
		 console.log('stop recording');
		 audionotes.stop();
		 $scope.recordingStatus = "Stopped";
		 $scope.recordingStopped = true;
		 if ($scope.recordingTimer) {
			 $interval.cancel($scope.recordingTimer )
			 $scope.recordingTimer = null;
		 }
	}
	$scope.reload = function() {
		console.log('reload...');
		$window.location.reload();
	}
	
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

playerApp.directive('musPartcodes', ['noteCoder', 'safeEvaluate', function(noteCoder, safeEvaluate) {
	return {
		restrict: 'E',
		scope: {
			markers: '=',
			lastGroup: '=',
			experienceState: '='
		},
		templateUrl: 'partials/mus-partcodes.html',
		link: function(scope, element, attrs) {
			// state
			scope.partcodes = [];
			
			// methods
			function setupPartcode(partcode) {
				// split into prefix codes, build regexes and state
				// has partcode.code, partcode.codeformat, partcode.marker
				var prefixes = [];
				var ppat = /((\\[0-7]{1,3})|(\\x[a-fA-F0-9]{2})|(\\u[a-fA-F0-9]{4})|(\\[^0-7xu])|(\[[^\]]*\]))|([+*?]|[{][0-9]+(,[0-9]*)?[}])|([()])|([^()[\\*+?{])/g
				var match;
				var patt = '';

				console.log('find prefixes of '+partcode.code);
				while( (match=ppat.exec(partcode.code)) != null ) {
					var metachar = match[1];
					var quantifier = match[7];
					var bracket = match[9];
					var string = match[10];
					//console.log('  metachar='+metachar+', quant='+quantifier+', bracket='+bracket+', string='+string);
					if (quantifier!==undefined) {
						// no-op
					} else if (patt.length>0 && patt!='^') {
						console.log('Found prefix '+patt+' for '+partcode.code);
						var text = patt;
						if (prefixes.length>0)
							text = text.substring(prefixes[prefixes.length-1].length);
						var prefix = { patt: patt, text: text, matched: false, regex: new RegExp(patt+'$'), length: patt.length };
						prefixes.push(prefix);
						// bracket?
						if (bracket=='(') {
							var depth = 1;
							patt = patt+match[0];
							while( (match=ppat.exec(partcode.code)) != null) {
								var bracket = match[9];
								if (bracket=='(')
									depth++;
								else if (bracket==')') {
									depth--;
									if (depth==0)
										break;
								}
								patt = patt+match[0];
							}

						}
					}
					patt = patt+match[0];
				}
				partcode.prefixes = prefixes;
			};
			function initMarkers(markers) {
				console.log('partcodes init markers');
				scope.partcodes = [];

				for (var mi in markers) {
					var marker = markers[mi];
					if (marker.code && marker.code.length>0) {
						var code = marker.code;
						if (code[code.length-1]=='$') 
							// escape to match exact
							code = code.substring(0, code.length-1)+'\\$$';
						else
							// to end
							code = code+'$';
						if (marker.codeformat!==undefined) {
							var partcode = { code: code, codeformat: marker.codeformat, marker: marker, precondition: marker.precondition, preconditionok: true };
							partcode.id = scope.partcodes.length;
							scope.partcodes.push(partcode);
							setupPartcode(partcode);
						}
					}
				}
			};
			
			function update(lastGroup, experienceState) {
				for (var pi in scope.partcodes) {
					var partcode = scope.partcodes[pi];
					if (partcode.precondition===undefined)
						partcode.preconditionok = true;
					else {
						partcode.preconditionok = true==safeEvaluate(experienceState, partcode.precondition);
						console.log('precondition '+partcode.precondition+'='+partcode.preconditionok+' in '+JSON.stringify(experienceState));
					}
				}
				if (!lastGroup)
					return;
				console.log('update partcodes...');
				var codes = {};
				for (var pi in scope.partcodes) {
					var partcode = scope.partcodes[pi];
					if (partcode.codeformat!==undefined && partcode.codeformat!==null && partcode.codeformat.length>0) {
						var code = codes[partcode.codeformat];
						if (code===undefined) {
							codes[partcode.codeformat] = code = noteCoder.code(partcode.codeformat, lastGroup.notes, lastGroup.closed);
						}

						var longest = 0;
						for (var i=partcode.prefixes.length-1; partcode.preconditionok && i>=0; i--) {
							var prefix = partcode.prefixes[i];
							if (prefix.regex.test(code)) {
								longest = prefix.length;
								break;
							}
						}
						partcode.longestPrefix = longest;
						for (var i in partcode.prefixes) {
							partcode.prefixes[i].matched = (partcode.prefixes[i].length <= longest);
							partcode.prefixes[i].preconditionok = partcode.preconditionok;
						}
					}
				};
			};
			// not fine-grained - just assign on load experience!
			scope.$watch('markers', function(newValue) {
				initMarkers(newValue);
				update(scope.notes);
			});
			
			scope.$watch('lastGroup', function(newValue) {
				update(newValue, scope.experienceState);
			});
			scope.$watch('experienceState', function(newValue) {
				update(scope.lastGroup, newValue);
			}, true);

			initMarkers(scope.markers);
			update(scope.lastGroup, scope.experienceState);
		}
	};
}]);

//frequency ratio as a musical interval - for editor feedback
playerApp.filter('actionsToText', function() {
	return function(actions) {
		var text = '';
		for (var ai in actions) {
			var action = actions[ai];
			if (action.channel===undefined || action.channel=='')
				text = text+'(default) ';
			else
				text = text+'('+action.channel+') ';
			text = text+action.url+';';
		}
		return text;
	};
});