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