//virtual midi keyboard stuff
var m = angular.module('muzicodes.softkeyboard', ['muzicodes.logging']);

m.directive('softkeyboard', ['logger', function(logger) {
	return {
		restrict: 'E',
		scope: {
			onNote: '&onNote'
		},
		templateUrl: '/partials/softkeyboard.html',
		link: function(scope, element, attrs) {
			scope.visible = false;
			scope.showKeys = function() {
				scope.visible = true;
			};
			scope.hideKeys = function() {
				scope.visible = false;
			};
			var KEYS = "AWSEDFTGYHUJK"; 
			var KEY0_MIDI = 60;
			var KEY_TIME0 = Date.now();
			var KEY_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
			var handleKey = function(ev, down) {
			  ev.preventDefault();
			  ev.stopPropagation();
			  console.log('Key '+(down ? 'down':'up')+', code='+ev.which);
			  var midi = -1;
			  for (var i=0; i<KEYS.length; i++) {
			    if (KEYS.charCodeAt(i)==ev.which) {
			      midi = KEY0_MIDI+i+(ev.shiftKey ? 12 : 0);
			      break;
			    }
			  }
			  if (midi<0)
			    return;
			  var name = KEY_NOTES[midi % 12]+String(Math.floor(midi / 12)-1);
			  var freq = 261.6*Math.pow(2, (midi-60)/12.0);
			  //var time = (Date.now()-KEY_TIME0)*0.001;
			  var vel = down ? 127 : 0;
			  var note = { localTime: Date.now(), note: name, freq: freq, velocity: vel, off: (vel==0) };
			  logger.log('key.note', note);
			  console.log(note);
			  if (scope.onNote)
				  scope.onNote({note: note});
			};

			scope.keydown = function($event) {
				handleKey($event, true);
			};
			scope.keyup = function($event) {
				handleKey($event, false);
			};
		}
	};
}]);