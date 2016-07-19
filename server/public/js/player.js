var playerApp = angular.module('playerApp', ['ngAnimate','ui.bootstrap',
                                             'muzicodes.audio','muzicodes.viz','muzicodes.stream','muzicodes.midi','muzicodes.logging',
                                             'muzicodes.softkeyboard','muzicodes.codeui','muzicodes.noteprocessor',
                                             'muzicodes.context','muzicodes.osc']);
// main player app
playerApp.controller('PlayerCtrl', ['$scope', '$http', '$location', 'socket', 'audionotes', '$interval',
                                    'noteGrouperFactory', 'midinotes', 'noteCoder', 'safeEvaluate',
                                    'MIDI_HEX_PREFIX', 'midiout', 'logger', '$window', 'NoteProcessor',
                                    'CodeNode','CodeMatcher','CodeParser', 'InexactMatcher', 'oscout',
                                    'OSC_UDP_PREFIX', 'OSC_TCP_PREFIX',
                                    function ($scope, $http, $location, socket, audionotes, $interval,
                                    		noteGrouperFactory, midinotes, noteCoder, safeEvaluate,
                                    		MIDI_HEX_PREFIX, midiout, logger, $window, NoteProcessor,
                                    		CodeNode, CodeMatcher, CodeParser, InexactMatcher, oscout,
                                    		OSC_UDP_PREFIX, OSC_TCP_PREFIX) {
	console.log('url: '+$location.absUrl());
	var proc = new NoteProcessor();
	var params = $location.search();
	console.log('params', params);
	var experienceFile = $scope.experienceFile = params['f'];
	$scope.room = params['r']===undefined ? 'default' : params['r'];
	var pin = params['p']===undefined ? '' : params['p'];
	$scope.channel = params['c']===undefined ? '' : params['c'];
	$scope.midiInputName = params['i'];
	$scope.midiOutputName = params['o'];
	
	console.log('experience='+experienceFile+', room='+$scope.room+', pin='+pin+', channel='+$scope.channel+', midiin='+$scope.midiInputName+', midiout='+$scope.midiOutputName);
	
	$scope.context = {};
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
	$scope.codeMatchers = codeMatchers;
	
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
			if (codeMatchers[marker.code]!==undefined) {
				// for partMatching's benefit
				codeMatchers[marker.code].reset();
			}
			if (marker.precondition===undefined)
				marker.preconditionok = true;
			else
				marker.preconditionok = true==safeEvaluate($scope.experienceState, marker.precondition);
			if (!marker.preconditionok)
				continue;
			if (marker.projection!==undefined && marker.code!==undefined && marker.code!==null && marker.code.length>0) {
				var code = codes[marker.projection.id];
				if (code===undefined) {
					// generate...
					console.log('raw note: '+JSON.stringify(notes));
					var newNotes = proc.mapRawNotes($scope.context, notes);
					console.log('context mapped: '+JSON.stringify(newNotes));
					code = proc.projectNotes(marker.projection, newNotes);
					console.log('projected: '+proc.notesToString(code));

					codes[marker.projection.id] = code;
				}
				// always check code for partial feedback
				if (code!==undefined && codeMatchers[marker.code]!==undefined &&
					codeMatchers[marker.code].match( code ) ) {
					if (!marker.atEnd || group.closed) {
						console.log('Matched marker '+marker.title+' code '+proc.notesToString(code));
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
								} else 	if (action.url.indexOf(OSC_UDP_PREFIX)==0 || action.url.indexOf(OSC_TCP_PREFIX)==0) {
									// osc output
									oscout.send( action.url );
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

	$scope.maxTimeWindow = 30;
	
	function checkClosedGroups(time) {
		// check max duration
		for (var i in $scope.notes) {
			var note = $scope.notes[i];
			if (note.duration===undefined && !!$scope.parameters.maxDuration && time-note.time > $scope.parameters.maxDuration) {
				note.duration = time-note.time;
			}
		}
		for (var id in $scope.activeGroups) {
			var group = $scope.activeGroups[id];
			if (group.closed || (!group.closed && group.lastTime<time-$scope.parameters.streamGap)) {
				group.closed = true;
				console.log('closed group '+group.id);
				delete $scope.activeGroups[group.id];
				checkGroup(group);
			}
		}
		// GC old notes
		for (var i=0; i<$scope.notes.length; i++) {
			var note = $scope.notes[i];
			if (time-note.time > $scope.maxTimeWindow) {
				$scope.notes.splice(i,1);
				i--;				
			}
			// TODO suppress start of group matching if group shrunk?
			if ($scope.activeGroups[note.group]!==undefined)
				$scope.activeGroups[note.group].truncated = true;
		}
		// GC old groups
		for (var i=0; i<$scope.groups.length; i++) {
			var group = $scope.groups[i];
			if (time-group.lastTime > $scope.maxTimeWindow) {
				$scope.groups.splice(i,1);
				i--;				
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

		if (!!note.localTime && !note.time) {
			if ($scope.reftime===null) {
				// fudge
				$scope.reftime = 0;
				$scope.reftimeLocal = note.localTime;
			}
			note.time = (note.localTime-$scope.reftimeLocal)*0.001+$scope.reftime;
		}
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
			if (n.duration===undefined) 
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
	$scope.onNote = onNote;
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
		$scope.context = experience.defaultContext;
		var parser = new CodeParser();
		for (var mi in experience.markers) {
			var marker = experience.markers[mi];
			if (marker.projection) {
				var id = marker.projection;
				delete marker.projection;
				for (var pi in experience.projections) {
					var projection = experience.projections[pi];
					if (projection.id==id)
						marker.projection = projection;
				}
			}
			if (marker.code && marker.code.length>0) {
				var code = marker.code;
				if (!marker.atStart) {
					// anything at start...
					code = '.*,('+code+')';
				}
				var res = parser.parse(code);
				if (res.state==CodeParser.OK) {
					res = parser.normalise(res.node);
					if (!!marker.inexact) {
						if (InexactMatcher.canMatch(res)) {
							var parameters = !!marker.projection ? marker.projection.inexactParameters : {};
							codeMatchers[marker.code] = new InexactMatcher(res, marker.inexactError, parameters);							
						} else {
							console.log('cannot match inexact code '+code);
						}
					} else {
						codeMatchers[marker.code] = new CodeMatcher(res);
					}
				} else {
					console.log('error parsing code '+code+': '+res.message);
				}
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

	$scope.selectNotes = function(notes) {
		console.log("Player select notes: "+JSON.stringify(notes));
		socket.emit('selectNotes', notes);
	}
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

playerApp.directive('musPartcodes', ['noteCoder', 'safeEvaluate', 'CodeNode', function(noteCoder, safeEvaluate, CodeNode) {
	return {
		restrict: 'E',
		scope: {
			markers: '=',
			lastGroup: '=',
			experienceState: '=',
			codeMatchers: '='
		},
		templateUrl: 'partials/mus-partcodes.html',
		link: function(scope, element, attrs) {
			// state
			scope.partcodes = [];
			
			// methods
			function setupPartcode(partcode) {
				// split into prefix codes
				// has partcode.code, partcode.codeformat, partcode.marker
				var prefixes = [];
				console.log('find prefixes of '+partcode.code);
				function recurse(node, parent, text, pos) {
					console.log('prefix recurse '+text.substring(0,pos)+'<>'+text.substring(pos)+': '+JSON.stringify(node));
					if (node===undefined || node===null)
						return pos;
					var ntext = CodeNode.toString(node);
					var ix = text.indexOf(ntext, pos);
					if (ix<0) {
						console.log('Error, partcode: did not find '+ntext+' in '+text);
						return text.length;
					} else {
						var rpos = pos;
						if (ix>pos) {
							rpos = ix;
							var prefix = { id: parent.id, text: text.substring(pos,ix), matched: false, length: rpos };
							console.log('add parent prefix '+JSON.stringify(prefix));
							prefixes.push(prefix);
						}
						if (node.children!==undefined && node.children!==null) {
							for (var ci in node.children) {
								var child = node.children[ci];
								rpos = recurse(child, node, text, rpos);
							}
						}
						if (ix+ntext.length > rpos) {
							var prefix = { id: node.id, text: text.substring(rpos,ix+ntext.length), matched: false, length: ix+ntext.length };
							console.log('add prefix '+JSON.stringify(prefix));
							rpos = ix+ntext.length;
							prefixes.push(prefix);
						}
						return rpos;
					}
				}
				if (partcode.code!==undefined && scope.codeMatchers[partcode.code]!==undefined) {
					var node = scope.codeMatchers[partcode.code].node;
					var text = CodeNode.toString(node);
					recurse(node, undefined, text, 0);
					if (partcode.atEnd) {
						var prefix = { atEnd:true, text: '<END>', matched: false, length: text.length+1 };
						prefixes.push(prefix);
					}
				}
				partcode.prefixes = prefixes;
			};
			function initMarkers(markers) {
				console.log('partcodes init markers');
				scope.partcodes = [];

				for (var mi in markers) {
					var marker = markers[mi];
					if (marker.code && marker.code.length>0) {
						if (marker.projection!==undefined) {
							var partcode = { code: marker.code, atStart: marker.atStart, atEnd: marker.atEnd, projection: marker.projection, marker: marker, precondition: marker.precondition, preconditionok: true };
							partcode.id = scope.partcodes.length;
							scope.partcodes.push(partcode);
							setupPartcode(partcode);
						}
					}
				}
			};
			
			function update(lastGroup, experienceState) {
				console.log('update partcode preconditions...');
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
				for (var pi in scope.partcodes) {
					var partcode = scope.partcodes[pi];
					if (partcode.code!==undefined && scope.codeMatchers[partcode.code]!==undefined) {
						var matched = scope.codeMatchers[partcode.code].getMatchedIds();

						var longest = 0;
						for (var i in partcode.prefixes) {
							var prefix = partcode.prefixes[i];
							if ((prefix.atEnd && lastGroup.closed && matched[scope.codeMatchers[partcode.code].node.id]!==undefined) || matched[prefix.id]!==undefined) {
								prefix.matched = true;
								if (prefix.length>length) {
									longest = prefix.length;
								}
							} else {
								prefix.matched = false;
							}
						}
						partcode.longestPrefix = longest;
						for (var i in partcode.prefixes) {
							//partcode.prefixes[i].matched = (partcode.prefixes[i].length <= longest);
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