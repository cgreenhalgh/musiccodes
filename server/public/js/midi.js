// midi stuff
var midi = angular.module('muzicodes.midi', ['muzicodes.logging']);

midi.factory('midiAccess', function() {
	var midiAccess = navigator.requestMIDIAccess({ sysex: true });
	midiAccess.then(function() { 
		console.log('Granted midi access');
	}, function() {
		alert('Error getting Midi access');
	});
	return midiAccess;
});

midi.directive('midiInputSelector', ['midiAccess', function(midiAccess) {
	//console.log('midi-input-selector...');
	return {
		//restrict: 'E',
		scope: {
			ngModel: '=',
			name: '@'
		},
		template: '<input ng-model="ngModel" list="midi-inputs"><datalist id="midi-inputs"><option ng-repeat="input in midiInputOptions" value="{{input}}"></datalist> <span>{{ status }}</span>',
		link: function(scope, element, attrs) {
			function updateStatus(name) {
				scope.status = '';
				if (!name) {
					scope.status = 'Not used';
					return;
				}					
				midiAccess.then(function(midiAccess) {
					var names = [];
					midiAccess.inputs.forEach(function(input) {
						names.push(input.name);
					});
					if (names.indexOf(name) >= 0)
						scope.status = 'OK';
					else
						scope.status = 'Not found';
					scope.$digest();
				}, function() {
					scope.status = 'No Midi Access';
				})
			}
			scope.$watch('ngModel', function(newValue) {
				console.log('watch ngModel = '+newValue);
				updateStatus(newValue);
			});
			//console.log('midi-input-selector link...');
			scope.midiInputOptions = [ "" ];
			scope.status = '';
			midiAccess.then(function(midiAccess) {
				midiAccess.inputs.forEach(function(input) {
					console.log('added midi input '+input.name);
					scope.midiInputOptions.push(input.name);					
				});
				scope.$digest();
			});
			updateStatus(scope.ngModel);
		}
	};
}]);

midi.directive('midiOutputSelector', ['midiAccess', function(midiAccess) {
	//console.log('midi-input-selector...');
	return {
		//restrict: 'E',
		scope: {
			ngModel: '=',
			name: '@'
		},
		template: '<input ng-model="ngModel" list="midi-outputs"><datalist id="midi-outputs"><option ng-repeat="output in midiOutputOptions" value="{{output}}"></datalist> <span>{{ status }}</span>',
		link: function(scope, element, attrs) {
			function updateStatus(name) {
				scope.status = '';
				if (!name) {
					scope.status = 'Not used';
					return;
				}					
				midiAccess.then(function(midiAccess) {
					var names = [];
					midiAccess.outputs.forEach(function(input) {
						names.push(input.name);
					});
					if (names.indexOf(name) >= 0)
						scope.status = 'OK';
					else
						scope.status = 'Not found';
					scope.$digest();
				}, function() {
					scope.status = 'No Midi Access';
				})
			}
			scope.$watch('ngModel', function(newValue) {
				console.log('watch ngModel = '+newValue);
				updateStatus(newValue);
			});
			//console.log('midi-input-selector link...');
			scope.midiOutputOptions = [ "" ];
			scope.status = '';
			midiAccess.then(function(midiAccess) {
				midiAccess.outputs.forEach(function(input) {
					console.log('added midi output '+input.name);
					scope.midiOutputOptions.push(input.name);					
				});
				scope.$digest();
			});
			updateStatus(scope.ngModel);
		}
	};
}]);

midi.directive('helloMidi', [function() {
	console.log('helloMidi...');
	return {
		restrict: 'E',
		scope: {
		},
		template: '<span>Hello Midi</span>'
	};
}]);

// wrapper for midi note input. cf audio audionote
midi.factory('midinotes', ['midiAccess','$rootScope', 'logger', function(midiAccess,$rootScope, logger) {

	// state
	var onNote = null;
	var midiInputPort = null;
	function stop() {
		if (midiInputPort!==null) {
			midiInputPort.close();
			midiInputPort = null;
		}
	}
	var time0 = Date.now();
	var notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
	function processMidiNote(cmd, note, vel) {
		// note 60 is middle C, which I think plugin calls C4, freq. is nominally 261.6Hz
		var name = notes[note % 12]+String(Math.floor(note / 12)-1);
		var freq = 261.6*Math.pow(2, (note-60)/12.0);
		var time = (Date.now()-time0)*0.001;
		var event = { time: time, note: name, midinote: note, freq: freq, velocity: vel, off: (vel==0) };
		console.log('note: ', event);
		logger.log('midi.note', note);
		if (onNote!==null)
			$rootScope.$apply(onNote(event));
	}
	function processMidiMessage( data ) {
		if (data.length<3)
			return;
		var cmd = data[0];
		if (cmd>=0x90 && cmd<=0x9f) {
			// note on
			var note = data[1];
			var vel = Number(data[2]);
			processMidiNote(cmd, note, vel);
		}
		else if (cmd>=0x80 && cmd<=0x8f) {
			// note off - cf note on vel = 0
			var note = data[1];
			processMidiNote(cmd, note, 0);	  
		}
	}

	function setInput(inputName) {
		stop();
		midiAccess.then(function(midiAccess) {
			var found = false;
			midiAccess.inputs.forEach(function(input) { 
				console.log('check input '+input.name+' ('+input+')');
				if (input.name==inputName && midiInputPort==null) {
					console.log('connecting to midi input '+inputName);
					midiInputPort = input;
					logger.log('midi.config.in',{id:midiInputPort.id, name:midiInputPort.name});
					// monitor input...
					midiInputPort.onmidimessage = function(event) {
						var str = "MIDI message received at timestamp " + event.timestamp + "[" + event.data.length + " bytes]: ";
						for (var i=0; i<event.data.length; i++) {
							str += "0x" + event.data[i].toString(16) + " ";
						};
						console.log( str );
						processMidiMessage( event.data );
					}
				}				
			});
			if(midiInputPort==null) {
				console.log('Cannot find midi input '+inputName);
				alert('Could not find Midi input '+inputName);
			}
		});
	}
	return {
		onNote: function (callback) {
			onNote = callback;
		},
		setInput: setInput,
		stop: stop,
		start: function(inputName) {
			console.log('midi start');
			setInput(inputName);
		}
	};
}]);

midi.value('MIDI_HEX_PREFIX', 'data:text/x-midi-hex,');

//wrapper for midi note input. cf audio audionote
midi.factory('midiout', ['midiAccess','MIDI_HEX_PREFIX','logger',function(midiAccess,MIDI_HEX_PREFIX,logger) {
	var midiOutputPort = null;
	function setOutput(outputName, callback) {
		midiOutputPort = null;
		midiAccess.then(function(midiAccess) {
			midiAccess.outputs.forEach( function( output ) {
				if (output.name==outputName) {
					midiOutputPort = output;
					console.log('found midi output '+outputName);
					logger.log('midi.config.out',{id:midiOutputPort.id, name:midiOutputPort.name});
					if (callback)
						callback();
				}
			});
			if (midiOutputPort==null) {
				console.log('Cannot find midi output '+outputName);
				alert('Could not find Midi output '+outputName);				  
			}
		});
	};
	function sendRaw(message) {
		try {
			midiOutputPort.send( message );
		}
		catch (err) {
			console.log('Error sending midi message: '+err.message);
			alert('Error sending midi message: '+err.message);
		}
	}
	function send(url) {
		var hex = url;
		if (hex.indexOf(MIDI_HEX_PREFIX)==0)
			hex = hex.substring(MIDI_HEX_PREFIX.length);
		if (midiOutputPort===null) {
			console.log('discard midi send '+hex+' (no output)');
			return;
		}
		var message = [];
		for (var i=0; i+1<hex.length; i+=2) {
			var b = hex.substring(i,i+2);
			message.push(parseInt(b, 16));
		}
		console.log('midiSend: '+hex);
		sendRaw(message);
	};
	
	return {
		start: function(outputName, callback) {
			console.log('midiout start');
			setOutput(outputName, callback);
		},
		send: send,
		sendRaw: sendRaw
	};
}]);
