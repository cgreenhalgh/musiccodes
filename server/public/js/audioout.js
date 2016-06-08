// Audio stuff - get audio, send to server, get notes back

var mod = angular.module('muzicodes.audioout', []);

// VERY simple polyphonic synth
mod.factory('audioout', [function() {
	var audioContext = null;
	
	// create audio context
	window.AudioContext = window.AudioContext ||
		window.webkitAudioContext;

	try {
		audioContext = new AudioContext();
	}
	catch (err) {
		console.log('Error creating AudioContext: '+err.message);
	}
	
	var notes = [];
	var NOT_MUCH = 0.001;
	function noteOff(note) {
		if (!note.freq)
			return;
		for (var ni in notes) {
			var nplay = notes[ni];
			if (Math.abs(nplay.freq-note.freq)<NOT_MUCH) {
				//nplay.vco.stop();
				console.log('noteOff '+nplay.freq);
				nplay.vca.gain.cancelScheduledValues(audioContext.currentTime);
				nplay.vca.gain.linearRampToValueAtTime(0,audioContext.currentTime+0.03);
			}
		}
	}
	function noteOn(note) {
		if (!note.freq)
			return;
		noteOff(note);
		var nplay = null;
		for (var ni in notes) {
			var np = notes[ni];
			if (Math.abs(np.freq-note.freq)<NOT_MUCH) {
				nplay = np;
				break;
			}
		}
		if (nplay===null) {
			nplay = {freq: note.freq};
			nplay.vco = audioContext.createOscillator();
			nplay.vco.type = 'sine';
			nplay.vco.frequency.value = note.freq;

			/* VCA */
			nplay.vca = audioContext.createGain();
			nplay.vca.gain.value = 0;
			/* connections */
			nplay.vco.connect(nplay.vca);
			notes.push(nplay);
			nplay.vco.start(audioContext.currentTime);
			nplay.vca.connect(audioContext.destination);
			console.log('noteOn new osc '+nplay.freq);
		}
		else {
			console.log('noteOn '+nplay.freq);			
		}
		var volume = 0.3;
		if (note.velocity!==undefined && note.velocity!==null)
			volume = 0.4*note.velocity/127;
		else
			volume = 0.4;
		nplay.vca.gain.cancelScheduledValues(audioContext.currentTime);
		nplay.vca.gain.linearRampToValueAtTime(volume,audioContext.currentTime+0.1);
		nplay.vca.gain.linearRampToValueAtTime(0,audioContext.currentTime+1);
	}
	function stop() {
		for (var ni in notes) {
			var nplay = notes[ni];
			nplay.vca.gain.cancelScheduledValues(audioContext.currentTime);
			nplay.vca.gain.linearRampToValueAtTime(0,audioContext.currentTime+0.1);
		}
	}
	
	return {
		noteOn: noteOn,
		noteOff: noteOff,
		stop: stop
	};
}]);