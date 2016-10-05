var mod = angular.module('muzicodes.noteprocessor', ['muzicodes.codeui']);

// Code node class
mod.factory('NoteProcessor', ['CodeNode', function(CodeNode) {
	function NoteProcessor() {
		
	};
	NoteProcessor.prototype.mapRawNote = function(context, note, prevNote) {
		var notes = [];
		if (prevNote!==undefined && prevNote.time!==undefined && note.time && context.tempo) {
			notes.push({beats: (note.time-prevNote.time)*context.tempo/60 });
		}
		if (note.freq) {
			// note 60 is middle C, C4, freq. is nominally 261.6Hz
			notes.push({ midinote: Math.log2( note.freq / 261.6 )*12 + 60 });
		}
		return notes;
	}
	NoteProcessor.prototype.mapRawNotes = function(context, rawNotes, projection) {
		var notes = [];
		var prevNote;
		var polyphonicGap = 0;
		if (projection!==undefined && !!projection.polyphonicGap) {
			polyphonicGap = projection.polyphonicGap;
			//console.log('using polyphonicGap '+polyphonicGap);
		}
		var syncNotes = [];
		var ni = 0;
		while(ni<rawNotes.length || syncNotes.length>0) {
			var rawNote = null;
			if (ni<rawNotes.length) {
				rawNote = rawNotes[ni++];
			}
			if (syncNotes.length>0 && (rawNote===null || rawNote.time > syncNotes[0].time+polyphonicGap)) {
				// flush
				for (sni in syncNotes) {
					syncNotes.sort(function(a,b) {
						return a.freq - b.freq;
					});
					var newNotes = this.mapRawNote(context, syncNotes[sni], prevNote);
					notes = notes.concat(newNotes);
					prevNote = syncNotes[sni];
				}				
				syncNotes = [];
			}
			if (rawNote!==null) {
				if (syncNotes.length>0) {
					syncNotes.push(angular.extend({}, rawNote, {time:syncNotes[0].time}));
				} else {
					syncNotes.push(rawNote);
				}
			}
		}
		return notes;
	}
	NoteProcessor.prototype.projectNotes = function(projection, notes) {
		var res = [];
		var lostBeats = 0.0;
		for (var ni in notes) {
			var note = notes[ni];
			var notep = null;
			if (note.beats!==undefined && projection.countsPerBeat) {
				var beats = Math.floor( (note.beats+lostBeats)*projection.countsPerBeat + 0.5 ) / projection.countsPerBeat;
				lostBeats += note.beats-beats;
				if (beats>0) {
					if (res.length>0 && res[res.length-1].beats!==undefined) {
						// merge
						res[res.length-1].beats += beats;
					} else {
						notep = {beats:beats};
					}
				}
			}
			else if (note.midinote!==undefined && projection.pitchesPerSemitone) { 				
				notep = {midinote: Math.floor( note.midinote*projection.pitchesPerSemitone + 0.5 ) / projection.pitchesPerSemitone};				
			} else {			
				// ??
			}
			if (notep) {
				res.push(notep);
			}
		}
		return res;
	}
	NoteProcessor.prototype.notesToString = function(notes) {
		var res = '';
		for (var ni=0; ni<notes.length; ni++) {
			if (ni>0) {
				res += ',';
			}
			var note = notes[ni];
			if (note.midinote!==undefined) {
				res += CodeNode.midinoteToString(note.midinote);
			} else if (note.beats!==undefined) {
				res += '/'+CodeNode.beatsToString(note.beats);
			}
		}
		return res;
	}
	return NoteProcessor;
}]);