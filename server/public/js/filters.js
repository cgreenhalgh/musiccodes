//filters
var filters = angular.module('muzicodes.filters', []);

// frequency ratio as a musical interval - for editor feedback
filters.filter('ratio2interval', function() {
	return function(ratio) {
		if (ratio===undefined || ratio===null || ratio=='')
			return '';
		ratio = Number(ratio);
		if (!(ratio>=1))
			return "Error (ratio must be >=1)";
		var semitones = Math.floor(Math.log(ratio)*12/Math.log(2));
		var octaves = Math.floor(semitones/12);
		semitones = semitones % 12;
		var res = '';
		if (octaves>0)
			res = ''+octaves+' octave'+(octaves!=1 ? 's' : '');
		if (semitones>0 && res.length>0)
			res = res+' and ';
		if (semitones>0 || res.length==0)
			res = res+semitones+' semitone'+(semitones!=1 ? 's' : '');
		return res;
	};
});

// frequency as a note name and octave
filters.filter('freq2note', function() {
	var KEY_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

	return function(freq) {
		if (freq===undefined || freq===null || freq=='' || freq==0)
			return '';
		freq = Number(freq);
		if (!(freq>0))
			return "Error (frequency must be >0)";

		// freq to midi var freq = 261.6*Math.pow(2, (note-60)/12.0);
		var midi = Math.round(Math.log2(freq/261.6)*12+60);
		var name = KEY_NOTES[midi % 12]+String(Math.floor(midi / 12)-1);
		return name;
	};
});