var app = angular.module('loadgenApp', ['muzicodes.midi']);
// main player app
app.controller('loadgenCtrl', ['$scope', 'midinotes', 'midiout', '$timeout',
                                function ($scope, midinotes, midiout, $timeout) {
	$scope.midiInput = '';
	$scope.midiOutput = '';
	$scope.rate = 0;
	$scope.feedback = 'idle';
	midinotes.onNote(function(note) {
		console.log('Note: '+JSON.stringify(note));
	});
	if (!!$scope.midiInput) {
		midinotes.start($scope.midiInput);
	}
	$scope.$watch('midiInput', function(midiInput,oldValue) {
		console.log('midi input: '+midiInput);
		if (!!midiInput) {
			midinotes.start(midiInput);
		}
	});
	if (!!$scope.midiOutput) {
		midiout.start($scope.midiOutput);				
	}
	$scope.$watch('midiOutput', function(midiOutput,oldValue) {
		console.log('midi output: '+midiOutput);
		if (!!midiOutput) {
			midiout.start(midiOutput);
			var note = 60;
			midiout.sendRaw([0x90, note & 0x7f,0x7f]);
		}
	});
	var timeout = null;
	var noteOn = null;
	var rateChangeTime, noteCount;
	function endNote() {
		if (!noteOn)
			return;
		midiout.sendRaw([0x80, noteOn & 0x7f,0x7f]);
		noteOn = null;
	}
	function setTimeout(rate) {
		if (rate<=0) {
			$scope.feedback = 'stopped';
			return;
		}
		var now = new Date().getTime();
		var elapsed = now-rateChangeTime;
		var target = (noteCount+1)*1000/rate;
		var delay = target-elapsed;
		if (delay<0) {
			console.log('setTimeout already late for note '+(noteCount+1)+' after '+elapsed+' vs '+target+' ms');
			delay = 0;
		}
		timeout = $timeout(function() {
			endNote();
			noteCount++;
			noteOn = 60+(noteCount % 20);
			console.log('send note '+noteOn);
			midiout.sendRaw([0x90, noteOn & 0x7f,0x7f]);
			$scope.feedback = 'sent '+noteCount+' notes at '+rate+'/second, 20x'+Math.floor(noteCount/20);
			setTimeout(rate);
		}, delay);
	}
	$scope.$watch('rate', function(rate, oldValue) {
		console.log('rate changed to '+rate);
		endNote();
		rateChangeTime = new Date().getTime();
		noteCount = 0;
		if (timeout) {
			$timeout.cancel(timeout);
			timeout = null;
		}
		setTimeout(rate);
	});
}]);

