// note stream stuff...

var stream = angular.module('muzicodes.stream', []);

stream.factory('noteGrouperFactory', function() {
	console.log('noteGrouperFactory...');
	var MAX_FREQUENCY = 20000, MIN_FREQUENCY = 1;
	var nextGroupId = 1;
	// parameters: streamGap, frequencyRatio, monophonic, monophonicGap, minFrequency, maxFrequency, minVelocity, maxVelocity
	var Grouper = function(parameters) {
		console.log('New Grouper');
		this.parameters = parameters;
		this.groups = {};
	};
	// return group (else undefined)
	Grouper.prototype.addNote = function(note) {
		console.log('group add note '+JSON.stringify(note));
		this.setTime(note.time);
		delete note.group;
		if (this.parameters.minVelocity && note.velocity<this.parameters.minVelocity)
			return null;
		if (this.parameters.maxVelocity && note.velocity>this.parameters.maxVelocity)
			return null;
		if (this.parameters.minFrequency && note.freq<this.parameters.minFrequency)
			return null;
		if (this.parameters.maxFrequency && note.freq>this.parameters.maxFrequency)
			return null;
		var handled = false;
		var rval = null;
		for (var id in this.groups) {
			var group = this.groups[id];
			// close
			if (!group.closed && !handled) {
				// add to group?!
				if (note.freq >= group.lowFreq && note.freq <= group.highFreq) {
					// candidate for group - check monophonic
					if (this.parameters.monophonic && note.time - group.lastTime < this.parameters.monophonicGap) {
						// discard polyphonic note
						console.log("discard polyphonic note with gap "+(note.time-group.lastTime));
						handled = true;
					} else {
						group.lastTime = note.time;
						//group.notes.push(note);
						//group.count++;
						handled = true;
						rval = group.id;
						// limits to group...??
						/*var gccount = 0;
						for (var ni=group.notes.length-1; ni>0; ni--) {
							if (ni>=GROUP_MAX_NOTES || note.time-group.notes[ni].time > GROUP_MAX_DURATION) {
								group.notes.splice(ni,1);
								gccount++;
							}
						}*/
						console.log("add note to group "+group.id); //+' (GC '+gccount+' notes)');
					}
				}
			}
		}

		if (!handled) {
			var group = { id: nextGroupId++, closed: false, time: note.time, lastTime: note.time };
			group.lowFreq = Math.max(this.parameters.frequencyRatio!==undefined ? note.freq/this.parameters.frequencyRatio : MIN_FREQUENCY,
				this.parameters.minFrequency!==undefined ? this.parameters.minFrequency : MIN_FREQUENCY);
			group.highFreq = Math.min(this.parameters.frequencyRatio!==undefined ? note.freq*this.parameters.frequencyRatio : MAX_FREQUENCY,
				this.parameters.maxFrequency!==undefined ? this.parameters.maxFrequency : MAX_FREQUENCY);
			this.groups[group.id] = group;
			console.log("add group "+group.id);
			rval = group.id;
		}
		if (rval!==null)
			note.group = rval;
		return rval;
	};
	// return group for value returned from addNote.
	// Group is object with id, time, lastTime, highFreq, lowFreq, closed
	Grouper.prototype.getGroup = function(id) {
		if (id!==undefined && id!==null)
			return groups(id);
	};
	Grouper.prototype.getGroups = function() {
		var rval = [];
		for (var i in this.groups)
			rval.push(this.groups[i]);
		return rval;
	};
	// time without note
	Grouper.prototype.setTime = function(time) {
		for (var id in this.groups) {
			var group = this.groups[id];
			// close
			if (group.lastTime<time-this.parameters.streamGap) {
				group.closed = true;
				console.log("close group "+group.id);
			} 
		}
	};
	return {
		create: function(parameters) { return new Grouper(parameters); }
	};
});

// convert notes to code string
stream.factory('noteCoder', [function() {
	function code(codeformat, notes) {
		var cf = /^(([mn])(o)?(r[lf](e([0-9A-Za-z]+))?)?)?([^A-Za-z0-9]*)(([tc])(r[lf](e([0-9]+(\.[0-9]+)?))?)?)?([^A-Za-z0-9]*)$/.exec(codeformat);
		if (cf==null) {
			return ('*ERROR* Invalid codeformat '+codeformat);
		}
		var notetype = cf[2];
		var noteoctave = cf[3];
		var noterelative = cf[4];
		var noteequals = cf[6];
		var noteseparator = cf[7];
		var timetype = cf[9];
		var timerelative = cf[10];
		var timeequals = cf[12];
		var timeseparator = cf[14];
		//console.log('codeformat '+codeformat+' -> note type='+notetype+', octave='+noteoctave+', relative='+noterelative+', equals='+noteequals+', sep='+noteseparator+'; time type='+timetype+', rel='+timerelative+', equals='+timeequals+', sep='+timeseparator);
		var durationReference = 1;
		if (timeequals!==undefined)
			durationReference = Number(timeequals);

		var code = '';
		var i;
		var maxLength = 100;
		var t0 = null;
		var f0 = null;
		if (timerelative!==undefined && timerelative.indexOf('rl')==0) {
			if (notes.length>=2) 
				t0 = notes[notes.length-1].time-notes[notes.length-2].time;
		} else if (timerelative!==undefined && timerelative.indexOf('rf')==0) {
			if (notes.length>=2)
				t0 = notes[1].time-notes[0].time;
		}
		if (noterelative!==undefined && noterelative.indexOf('rl')==0) {
			if (notes.length>=1)
				f0 = notes[notes.length-1].freq;
		} else if (noterelative!==undefined && noterelative.indexOf('rf')==0) {
			if (notes.length>=1)
				f0 = notes[0].freq;
		}
		for (var i=0; i<maxLength && i<notes.length; i++) {
			var note = notes[i];
			// note
			if (notetype!==undefined) {
				if (noterelative===undefined) {
					if (notetype=='m') {
						// freq to midi var freq = 261.6*Math.pow(2, (note-60)/12.0);
						var midi = Math.round(Math.log2(note.freq/261.6)*12+60);
						code = code+midi;
					}
					else if (notetype=='n') {
						if (noteoctave!==undefined)
							code = code+note.note;
						else {
							var np = /^([A-Ga-g]#?)/.exec(note.note);
							code = code+np[1];
						}
					} 
				}
				// TODO relative
			}
			if (noteseparator!==undefined && i+1<notes.length)
				code = code+noteseparator;
			// time
			if (timetype!==undefined) {
				if (t0!==null && i+1<notes.length) {
					var duration = Math.round( durationReference* (notes[i+1].time - note.time) / t0 );
					if (timetype=='c')
						code = code+String(duration);
					// TODO: m, non-relative
				}
			}
			// time sep
			if (timeseparator!==undefined && i+1<notes.length)
				code = code+timeseparator;
		}
		//if (group.closed)
		//	code = code+'$';

		// TODO: generalise...
		if (codeformat=='mrle0/crle4,') {
			// format 2
			if (notes.length<2)
				return null;
			var prevnote = notes[notes.length-1];
			var t0 = prevnote.time-notes[notes.length-2].time;
			var f0 = prevnote.freq;
			var maxLength = 10;
			var i;
			var code = '0';
			var length = 1;
			var durationReference = 4;
			for (i=2; length < maxLength && notes.length-i >= 0; i++) {
				var note = notes[notes.length-i];
				var duration = Math.round( durationReference* (prevnote.time - note.time) / t0 );
				// skip?!
				if (duration==0)
					continue;
				var interval = Math.round( Math.log( note.freq / f0 ) / Math.log( 2 ) * 12 );
				code = interval+'/'+duration+','+code;
				length++;
				prevnote = note;
			}
			//if (group.closed)
			//	code = code+'$';
			console.log('custom built '+codeformat+': '+code);
			return code;
		}
		console.log('generic built '+codeformat+': '+code);
		return code;
	}
	return {
		code: code
	};
}]);