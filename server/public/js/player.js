var playerApp = angular.module('playerApp', ['ngAnimate','ui.bootstrap',
                                             'muzicodes.audio','muzicodes.viz','muzicodes.stream','muzicodes.midi','muzicodes.logging',
                                             'muzicodes.softkeyboard','muzicodes.codeui','muzicodes.noteprocessor',
                                             'muzicodes.context','muzicodes.osc']);
// main player app
playerApp.controller('PlayerCtrl', ['$scope', '$http', '$location', 'socket', 'audionotes', '$interval',
                                    'noteGrouperFactory', 'midinotes', 'noteCoder', 'safeEvaluate',
                                    'MIDI_HEX_PREFIX', 'midiout', 'logger', '$window', 'NoteProcessor',
                                    'CodeNode','CodeMatcher','CodeParser', 'InexactMatcher', 'oscout',
                                    'OSC_UDP_PREFIX', 'OSC_TCP_PREFIX', 'midicontrols', 'streamutils',
                                    function ($scope, $http, $location, socket, audionotes, $interval,
                                    		noteGrouperFactory, midinotes, noteCoder, safeEvaluate,
                                    		MIDI_HEX_PREFIX, midiout, logger, $window, NoteProcessor,
                                    		CodeNode, CodeMatcher, CodeParser, InexactMatcher, oscout,
                                    		OSC_UDP_PREFIX, OSC_TCP_PREFIX, midicontrols, streamutils) {
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
	// in order { url, params, time }
	$scope.delays = [];
	$scope.delayTimer = null;
	$scope.delayTimerTime = 0;
	$scope.delayTimeLabel = (new Date()).toISOString().substr(11, 8);
	setInterval(function() {
		$scope.delayTimeLabel =  (new Date()).toISOString().substr(11, 8);		
	}, 1000);

	$scope.markers = [];
	$scope.controls = [];
	$scope.buttons = [];
	
	$scope.recording = false;
	
	$scope.state = 'loading';
	$scope.noteGroupers = {}; // index by projection id
	$scope.reftime = null;
	$scope.reftimeLocal = null;
	$scope.nextNoteId = 1;
	$scope.actionRefresh = false;
	$scope.actionUrl = 'data:text/plain,Testing';
	var codeMatchers = {};
	$scope.codeMatchers = codeMatchers;
	
	$scope.experienceState = {};
	function updateState(state, extrastate) {
		var output = {};
		for (var name in state) {
			var expression = state[name];
			output[name] = safeEvaluate($scope.experienceState, expression, extrastate);
			console.log('State '+name+' = '+output[name]+' = '+expression);
		}
		for (var name in output) {
			if ($scope.experienceState [name]!==output[name]) {
				$scope.experienceState [name] = output[name];
			}
		}
		logger.log( 'state.update', $scope.experienceState );
		updateButtons();
	};
	
	$scope.lastGroups = {};
	$scope.checkLastGroups = null;

	function checkDelays() {
		var date = new Date();
		var now = date.getTime();
		for (var di=0; di<$scope.delays.length; di++) {
			var delay = $scope.delays[di];
			if (now >= delay.time) {
				console.log('Fire delay '+delay.url);
				checkControl(delay.url, {params:delay.params});

				$scope.delays.splice(di, 1);
				di--;
			}
		}
		if ($scope.delayTimer!==null && ($scope.delays.length==0 || $scope.delayTimerTime!=$scope.delays[0].time)) {
			clearTimeout($scope.delayTimer);
			$scope.delayTimer = null;
		}
		if ($scope.delays.length>0 && $scope.delayTimer===null) {
			$scope.delayTimerTime = $scope.delays[0].time;
			console.log('schedule timer in '+($scope.delays[0].time-now)+'ms');
			$scope.delayTimer = setTimeout(function() {
				$scope.delayTimer = null;
				checkDelays();
			}, $scope.delays[0].time-now);
		}
	}
	$scope.clearDelays= function() {
		console.log('clear delays ('+$scope.delays.length+')');
		if ($scope.delayTimer!==null) {
			clearTimeout($scope.delayTimer);
			$scope.delayTimer = null;
		}
		$scope.delays = [];
	}
	$scope.fireDelays = function() {
		var now = new Date().getTime();
		for (var di in $scope.delays) {
			var delay = $scope.delays[di];
			delay.time = now;
		}
		checkDelays();
	}
	
	function enact(actions) {
		for (var ai in actions) {
			var action = actions[ai];
			if (action.url.indexOf(MIDI_HEX_PREFIX)==0) {
				console.log('send midi '+action.url);
				// midi output
				midiout.send( action.url );
			} else 	if (action.url.indexOf(OSC_UDP_PREFIX)==0 || action.url.indexOf(OSC_TCP_PREFIX)==0) {
				console.log('send osc '+action.url);
				// osc output
				oscout.send( action.url );
			} else if (action.url && action.url.indexOf('http')==0 && !!action.post) {
				console.log('post to '+action.url+' '+action.contentType+' '+action.body);
				$http({method: 'POST', url: 
					action.url, 
					headers: {'Content-Type': (action.contentType ? action.contentType : 'text/plain') }, 
					data: (action.body ? action.body : '') 
				}).then(function(resp) {
					console.log('Post ok');
				}, function(resp) {
					console.log('Post error: '+resp.status+' - '+resp.statusText);
				});
			} else if (action.url.indexOf('delay:')==0) {
				var delaytime = action.delay && action.delay>0 ? action.delay : 0;
				console.log('delay '+action.url+' by '+delaytime+' with params='+JSON.stringify(action.params));
				var now = (new Date()).getTime();
				var time = now+Math.floor(delaytime*1000);
				var delay = { url: action.url, params: action.params, time: time, label: 'at '+(new Date(time).toISOString().substr(11, 8)) };
				var di=0;
				for (; di<$scope.delays.length; di++) {
					if($scope.delays[di].time > time)
						break;
				}
				$scope.delays.splice(di, 0, delay);
				checkDelays();
			} else if (action.url.indexOf('cancel:')==0) {
				var name = action.url.substring(7);
				console.log('cancel delays '+name);
				for (var di=0; di<$scope.delays.length; di++) {
					var delay = $scope.delays[di];
					if (name=='*' || name==delay.url.substring(6)) {
						console.log('Cancel delay '+delay.url);
						$scope.delays.splice(di, 1);
						di--;
					}
				}
				checkDelays();
			} else {
				if ($scope.channel==action.channel && action.url) {
					console.log('open '+action.url);
					if (action.url == $scope.actionUrl) 
						$scope.actionRefresh = true;
					else
						$scope.actionUrl = action.url;
				}
			}
		}
	}

	
	function templateString(actionurl, extrastate) {
		// template
		var newactionurl = '';
		var next = 0;
		var pos;
		while((pos=actionurl.indexOf('{{', next))>=0) {
			newactionurl += actionurl.substring(next, pos);
			var next = actionurl.indexOf('}}', pos);
			if (next<0)
				next = actionurl.length;
			var exp = actionurl.substring(pos+2, next);
			next = next+2;
			var value = safeEvaluate($scope.experienceState, exp, extrastate);
			newactionurl += value;
		}
		if (pos<0) {
			newactionurl += actionurl.substring(next);
		}
		return newactionurl;
	}
	function templateActions(marker, extrastate) {
		// may be control or marker
		var result = angular.extend({}, marker);
		result.actions = [];
		for (var ai in marker.actions) {
			var action = marker.actions[ai];
			if ((action.url && action.url.indexOf('{{')>=0) || (action.body && action.body.indexOf('{{')>=0)) {
				var newaction = angular.extend({}, action);
				if (action.url) {
					newaction.url = templateString(action.url, extrastate);
				}
				if (action.body) {
					newaction.body = templateString(action.body, extrastate);
				}
				console.log('template '+action.url+' -> '+newaction.url+' (body '+action.body+' -> '+newaction.body+')');
				result.actions.push(newaction);
			} else {
				result.actions.push(action);
			}
		}
		return result;
	}
	function fireMarker(marker, extrastate) {
		var result = templateActions(marker, extrastate);
		socket.emit('action',result);
		if (marker.poststate!==undefined)
			updateState(marker.poststate, extrastate);
		enact(result.actions);
	}
	function checkGroup(group, projectionid) {
		var notes = [];
		for (var i in $scope.notes) {
			var note = $scope.notes[i];
			if (note.groups[projectionid]==group.id)
				notes.push(note);
		}
		if (notes.length==0) {
			console.log('warning: checkGroup for project '+projectionid+' found no notes');
			return;
		}
		// publish to partcodes view
		console.log('update lastGroup for projection '+projectionid+' with ');
		$scope.checkLastGroups[projectionid] = { notes: notes, closed: group.closed };
		var code = null;
		
		for (var mi in $scope.markers) {
			var marker = $scope.markers[mi];
			if (marker.projection===undefined) {
				console.log('ignore marker without projection: '+JSON.stringify(marker));
				continue;
			}
			if (marker.projection.id!=projectionid)
				continue;
			if (codeMatchers[marker.code]!==undefined) {
				// for partMatching's benefit
				codeMatchers[marker.code].reset();
			}
			if (marker.precondition===undefined || marker.precondition===null || marker.precondition=='')
				marker.preconditionok = true;
			else
				marker.preconditionok = true==safeEvaluate($scope.experienceState, marker.precondition);
			if (!marker.preconditionok)
				continue;
			if (marker.projection!==undefined && marker.code!==undefined && marker.code!==null && marker.code.length>0) {
				if (code===null) {
					// generate...
					console.log('raw note: '+JSON.stringify(notes));
					var newNotes = proc.mapRawNotes($scope.context, notes, marker.projection);
					console.log('context mapped: '+JSON.stringify(newNotes));
					code = proc.projectNotes(marker.projection, newNotes);
					console.log('projected: '+proc.notesToString(code));
				}
				// always check code for partial feedback
				if (code!==undefined && codeMatchers[marker.code]!==undefined &&
					codeMatchers[marker.code].match( code ) ) {
					if ((!marker.atEnd && !group.closed) || (marker.atEnd && group.closed)) {
						console.log('Matched marker '+marker.title+' code '+proc.notesToString(code));
						fireMarker(marker);
					} 
					if (group.closed) {
						// no longer matchable
						// for partMatching's benefit
						codeMatchers[marker.code].reset();						
						//console.log('No match, '+marker.codeformat+':'+code+' vs '+marker.code);
					}
				}
			}
		}
	}
	$scope.fireMarker = function(marker) {
		console.log('Force fire marker '+marker.title);
		fireMarker(marker);
	}
	
	function checkControl(input, extrastate) {
		console.log('check control '+input);
		for (var mi in $scope.controls) {
			var control = $scope.controls[mi];
			if (control.inputUrl!==undefined && control.inputUrl.length>0 && control.inputUrl == input) {
				if (control.precondition===undefined || control.precondition===null || control.precondition=='')
					control.preconditionok = true;
				else
					control.preconditionok = true==safeEvaluate($scope.experienceState, control.precondition, extrastate);
				if (!control.preconditionok)
					continue;
				console.log('Matched control '+control.inputUrl+' '+control.description);
				fireMarker(control, extrastate);
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
			if (group.closed || (!group.closed && group.heldNotes.length==0 && group.lastTime<time-$scope.parameters.streamGap)) {
				group.closed = true;
				console.log('closed group '+group.projectionid+':'+group.id);
				delete $scope.activeGroups[id];
				checkGroup(group, group.projectionid);
				checkControl('event:end:'+group.projectionid);
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
			for (var projectionid in note.groups) {
				if ($scope.activeGroups[''+projectionid+':'+note.groups[projectionid]]!==undefined)
					$scope.activeGroups[''+projectionid+':'+note.groups[projectionid]].truncated = true;
			}
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
		if ($scope.reftimeLocal!==null) {
			var now = 0.001*((new Date().getTime())-$scope.reftimeLocal);
			if (Math.abs(now-$scope.time)>0.001*RECORDING_TIMESTEP*1.05)
				console.log('warning: now '+now+' vs '+$scope.time+' (at '+(new Date().getTime())+')');
			if (now > $scope.time) {
				$scope.time = now;
				for (var gi in $scope.noteGroupers) {
					var noteGrouper = $scope.noteGroupers[gi];
					noteGrouper.setTime($scope.time);
				}
				$scope.checkLastGroups = {};
				checkClosedGroups($scope.time);
				// update partmatch view
				$scope.lastGroups = $scope.checkLastGroups;
			}
		}
	}, RECORDING_TIMESTEP);

	// fiddle factor for ? end of note delayed
	var AUDIO_TIME_OFFSET = 100;
	function onNote(note) {
		console.log('Got note '+JSON.stringify(note)); //note.freq+','+note.velocity+' at '+note.time);

		// reftime is zero for time; reftimeLocal is zero for localTime
		// localTime set, time not set! (midi or keys)
		if (!!note.localTime && !note.time) {
			if ($scope.reftimeLocal===null) {
				$scope.reftimeLocal = note.localTime;
			}
			note.time = (note.localTime-$scope.reftimeLocal)*0.001;
		} else {
			if ($scope.reftime===null) {
				// audio
				if ($scope.reftimeLocal===null) {
					// first note
					$scope.reftime = note.time;
					$scope.reftimeLocal = new Date().getTime() - AUDIO_TIME_OFFSET;
				} else {
					$scope.reftime = note.time - ((new Date().getTime()) - $scope.reftimeLocal)*0.001 + AUDIO_TIME_OFFSET*0.001;
				}
			} 
			// cf reftime (first note time)
			note.time = note.time-$scope.reftime;
		}		
		var n = $scope.activeNotes[note.note];
		if (n!==undefined && !!n.velocity) {
			if (n.duration===undefined) {
				n.duration = note.time-n.time;
				// end heldNotes
				for (var gi in $scope.activeGroups) {
					var group = $scope.activeGroups[gi];
					for (var ni=0; ni<group.heldNotes.length; ni++) {
						var held = group.heldNotes[ni];
						if (held.id==n.id) {
							console.log('end held note '+held.id);
							held.duration = n.duration;
							group.heldNotes.splice(ni, 1);
							ni--;
							if (held.time+held.duration > group.lastTime)
								group.lastTime = held.time+held.duration;
						}
					}
				}
			}
			delete $scope.activeNotes[note.note];
		}
		if (note.time > $scope.time)
			$scope.time = note.time;
		$scope.checkLastGroups = {};
		if (!!note.velocity){
			note.id = $scope.nextNoteId++;
			$scope.notes.push(note);
			note.groups = {};
			// TODO merge active notes
			for (var projectionid in $scope.noteGroupers) {
				var noteGrouper = $scope.noteGroupers[projectionid];
				var gid = noteGrouper.addNote(streamutils.extend({},note));
				// TODO GC old notes
				if (gid!==undefined && gid!==null) {
					note.groups[projectionid] = gid;
					note.group = true;
					var groups = noteGrouper.getGroups();
					console.log('updated projection '+projectionid+' group '+gid);
					for (var i in groups) {
						var group = groups[i];
						if (!group.closed && $scope.activeGroups[''+projectionid+':'+group.id]===undefined) {
							console.log('new active group '+projectionid+':'+group.id);
							$scope.activeGroups[''+projectionid+':'+group.id] = group;
							group.projectionid = projectionid;
							$scope.groups.push(group);
							checkControl('event:start:'+projectionid);
						}
						if (group.id==gid)
							checkGroup(group, projectionid);
					}
				}
			}
			$scope.activeNotes[note.note] = note;
		}
		checkClosedGroups(note.time);
		// update partmatch view
		$scope.lastGroups = $scope.checkLastGroups;
	};
	$scope.onNote = onNote;
	audionotes.onNote(onNote);
	midinotes.onNote(onNote);
	
	function onMidiMessage(url) {
		checkControl(url);
	}
	midicontrols.onMessage(onMidiMessage);
	
	// control input from server
	function handleServerInput(msg) {
		console.log('server input: '+msg.inputUrl+' with params='+JSON.stringify(msg.params));
		if (msg.inputUrl) {
			checkControl(msg.inputUrl, {params:msg.params});
		}
	}
	
	function loaded(experience) {
		socket.on('join.error', function(msg) {
			alert('Error starting master: '+msg);
		});
		socket.emit('master',{room:$scope.room, pin:pin, channel:$scope.channel, experience:experience});
		socket.on('input', handleServerInput);
		
		// sort markers by priority
		experience.markers.sort(function(a,b) { return (!!b.priority ? b.priority : 0)-(!!a.priority ? a.priority : 0); } );
		
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
		if (experience.controls===undefined) {
			experience.controls = [];
		}
		for (var mi in experience.controls) {
			var control = experience.controls[mi];
			if (control.actions===undefined)
				control.actions = [];
			else {
				for (var ai in control.actions) {
					var action = control.actions[ai];
					if (action.channel===undefined)
						action.channel = '';
				}
			}
			if (control.inputUrl && control.inputUrl.indexOf('button:')>=0) {
				var button = control;
				button.title = control.inputUrl.substring('button:'.length);
				$scope.buttons.push(button);
				// TODO: precondition!
				button.disabled = false;
			}
		}
		for (var pi in experience.projections) {
			var projection = experience.projections[pi];
			if (projection.filterParameters===undefined)
				projection.filterParameters = {};
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
		$scope.controls = experience.controls;
		
		var parameters = experience.parameters;
		$scope.parameters = parameters;
		if (!$scope.parameters.streamGap)
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
			audionotes.setInput(parameters.audioInput, parameters.audioChannel);
			audionotes.start(parameters.vampParameters);
		}
		if (parameters.midiControl!==undefined && parameters.midiControl!='') {
			console.log('using Midi control input '+parameters.midiControl);
			midicontrols.start(parameters.midiControl);
		}
		if ($scope.midiOutputName!==undefined && $scope.midiOutputName!='') {
			console.log('Using midi output '+$scope.midiOutputName);
			midiout.start($scope.midiOutputName);
		}
		for (var pi in experience.projections) {
			var projection = experience.projections[pi];
			$scope.noteGroupers[projection.id] = noteGrouperFactory.create(streamutils.extend({}, parameters, projection.filterParameters));
		}
		
		if (experience.parameters.initstate!==undefined)
			updateState(experience.parameters.initstate);

		checkControl('event:load');
	};
	
	function updateButtons() {
		// update button preconditions
		for (var bi in $scope.buttons) {
			var button = $scope.buttons[bi];
			if (button.precondition===undefined || button.precondition===null || button.precondition=='')
				button.disabled = false;
			else 
				button.disabled = true!=safeEvaluate($scope.experienceState, button.precondition);					
		}
	}
	
	$scope.pressButton = function (button) {
		console.log('pressButton('+JSON.stringify(button)+')');
		checkControl(button.inputUrl);
	}

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
	
	$scope.keyup = function(event) {
		//console.log('keyup');
	}
	$scope.keydown = function(ev) {
		console.log('keydown, code='+ev.which);
		checkControl('key:'+ev.which);
	}
}]);

playerApp.directive('urlView', ['$http', '$sce', '$timeout',function($http, $sce, $timeout) {
	return {
		restrict: 'E',
		scope: {
			actionUrl: '=',
			refresh: '='
		},
		template: '<iframe ng-src="{{internalUrl}}"></iframe>',
		link: function(scope, element, attrs) {
			scope.internalUrl = '';
			console.log('link urlView');
			scope.$watch('actionUrl', function(newValue) {
				console.log('actionUrl = '+newValue);
				scope.refresh = false;
				scope.internalUrl = $sce.trustAsResourceUrl(newValue);
			});
			scope.$watch('refresh', function(refresh) {
				if (refresh) {
					console.log('refresh urlView');
					scope.refresh = false;
					scope.internalUrl = '';
					$timeout(function() {
						scope.internalUrl = $sce.trustAsResourceUrl(scope.actionUrl);
					}, 0);
				}
			});
		}
	};
}]);

// messy function!!
playerApp.factory('safeEvaluate', function() {
	return function(state, expression, morestate) {
		window.scriptstate = {};
		for (var si in state)
			window.scriptstate[si] = state[si];
		if (!!morestate) {
			for (var si in morestate)
				window.scriptstate[si] = morestate[si];			
		}
		window.scriptstate['false'] = false;
		window.scriptstate['true'] = true;
		window.scriptstate['null'] = null;
		window.scriptstate['encodeURIComponent'] = encodeURIComponent;
		window.scriptstate['Math'] = Math;
		window.scriptstate['String'] = String;
		window.scriptstate['Number'] = Number;
		window.scriptstate['JSON'] = JSON;
		var result = null;
		// is expression safe? escape all names as window.scriptstate. ...
		// allow . within expression, e.g. Math.random, params.name
		var vpat = /([A-Za-z_][A-Za-z_0-9.]*)|(\\['"\\brftv])|(\\[^'"\\brftv])|([^A-Za-z_\\])/g;
		var match = null;
		var safeexpression = '';
		var inquote = null;
		while((match=vpat.exec(expression))!==null) {
			if (match[1]!==undefined) {
				if (inquote===null) 
					safeexpression = safeexpression+'(window.scriptstate.'+match[1]+')';
				else
					safeexpression = safeexpression+match[1];
			}
			else if (match[2]!==undefined) {
				if (inquote===null) {
					var msg = 'error evaluating '+expression+': escape found outside string: '+match[3];
					console.log(msg);
					alert(msg);
					return null;					
				}
				safeexpression = safeexpression+match[2];
			} else if (match[3]!==undefined) {
				var msg = 'error evaluating '+expression+': invalid escape '+match[3];
				console.log(msg);
				alert(msg);
				return null;
			} else if (match[4]=='"' || match[4]=="'") {
				if (inquote===null)
					inquote = match[4];
				else if (inquote==match[4]) 
					inquote = null;
				safeexpression = safeexpression+match[4];
			} else if (match[4]!==undefined)
				safeexpression = safeexpression+match[4];
		}
		try {
			result = eval(safeexpression);
			//console.log('safeEvaluation '+expression+' -> '+safeexpression+' = '+result);
			if (result===undefined) {
				var msg = 'error evaluating '+safeexpression+' from '+expression+': undefined';
				console.log(msg);
				alert(msg);
			}
		} catch (ex) {
			var msg = 'error evaluating '+safeexpression+' from '+expression+': '+ex.message;
			console.log(msg);
			alert(msg);
		}
		return result;
	};
});

playerApp.directive('musPartcodes', ['noteCoder', 'safeEvaluate', 'CodeNode', function(noteCoder, safeEvaluate, CodeNode) {
	var debug = false;
	return {
		restrict: 'E',
		scope: {
			markers: '=',
			lastGroups: '=',
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
			
			function update(lastGroups, experienceState) {
				if (debug)
					console.log('update partcode preconditions...');
				for (var pi in scope.partcodes) {
					var partcode = scope.partcodes[pi];
					if (partcode.precondition===undefined || partcode.precondition===null || partcode.precondition=='')
						partcode.preconditionok = true;
					else {
						partcode.preconditionok = true==safeEvaluate(experienceState, partcode.precondition);
						if (debug)
							console.log('precondition '+partcode.precondition+'='+partcode.preconditionok+' in '+JSON.stringify(experienceState));
					}
				}
				if (debug)
					console.log('update partcodes...');
				for (var pi in scope.partcodes) {
					var partcode = scope.partcodes[pi];
					for (var i in partcode.prefixes) {
						//partcode.prefixes[i].matched = (partcode.prefixes[i].length <= longest);
						partcode.prefixes[i].preconditionok = partcode.preconditionok;
					}
					// partcodes always have a projection (or partcode isn't made)
					if (lastGroups===undefined || lastGroups[partcode.projection.id]===undefined) {
						if (debug)
							console.log('skip partcode '+pi+' without lastGroup');
						continue;
					}
					if (partcode.code!==undefined && scope.codeMatchers[partcode.code]!==undefined) {
						var matched = scope.codeMatchers[partcode.code].getMatchedIds();

						var longest = 0;
						for (var i in partcode.prefixes) {
							var prefix = partcode.prefixes[i];
							if (debug)
								console.log('partcode '+pi+' prefix '+i+' ')
							if ((prefix.atEnd && lastGroups[partcode.projection.id].closed && matched[scope.codeMatchers[partcode.code].node.id]!==undefined) || 
									(matched[prefix.id]!==undefined && !lastGroups[partcode.projection.id].closed)) {
								prefix.matched = true;
								if (prefix.length>length) {
									longest = prefix.length;
								}
							} else {
								prefix.matched = false;
							}
						}
						partcode.longestPrefix = longest;
					}
				};
			};
			// not fine-grained - just assign on load experience!
			scope.$watch('markers', function(newValue) {
				initMarkers(newValue);
				update(scope.notes);
			});
			// not fine-grained
			scope.$watch('lastGroups', function(newValue) {
				if (debug)
					console.log('lastGroups changed to '+JSON.stringify(newValue));
				update(newValue, scope.experienceState);
			});
			scope.$watch('experienceState', function(newValue) {
				update(scope.lastGroups, newValue);
			}, true);

			initMarkers(scope.markers);
			update(scope.lastGroups, scope.experienceState);
			
			scope.fireCode = function(partcode) {
				console.log('fire code '+partcode.marker.title);
				// HACK
				if (scope.$parent.fireMarker)
					scope.$parent.fireMarker(partcode.marker);
			} 
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