describe('muzicodes.codeui module', function() {
	beforeEach(module('muzicodes.noteprocessor'));
	beforeEach(function () {
	    jasmine.addMatchers({
	        toEqualApproximately: function(util, customEqualityTesters) { 
	        	return {
	        		compare: function (actual, expected) {
	      
	        			function recurse(actual, expected) {
	        				//console.log('comapre '+actual+' and '+expected);
	        				var result = {};
	        				var precision = 2;
	        				if (actual===undefined && expected!==undefined) {
	        					result.pass = false;
	        					result.message = "Expected undefined to be "+expected;
	        				}
	        				else if (typeof expected == 'number') {
	        					result.pass = Math.abs( expected - actual ) < Math.pow(10, -precision) / 2;
	        					if (!result.pass) {
	        						result.message = "Expected "+actual+' to be about '+expected;
	        					}
	        				} else if (typeof expected == 'object') {
	        					var failed;
	        					result.pass = true;
	        					for (var i in expected) {
	        						if (expected[i]!==undefined && actual[i]===undefined) {
	        							failed = [i, expected[i]];
	        							break;
	        						}
	        						var res = recurse(actual[i], expected[i]);
	        						if (!res.pass) {
	        							result.pass = res.pass;
	        							break;
	        						}
	        					}

	        					if (undefined !== failed) {
	        						result.pass = false;
	        						result.message = function() {
	        							return 'Failed asserting that array/object includes element "'
	        							+ failed[0] + ' => ' + failed[1] + '"';
	        						};
	        					}
	        				} else {
	        					result.pass = util.equals(actual, expected, customEqualityTesters);
	        				}
	        				return result;
	        			}
	        			return recurse(actual, expected);
	        		}
	        	}
	        }
	    });
	});
	describe('NoteProcessor class', function() {
		// 1
		it('should be defined', function() {
			inject(function(NoteProcessor) {
				expect(NoteProcessor).toBeDefined();
			});
		});
		it('should map a raw note to a note via context', function() {
			inject(function(NoteProcessor) {
				// A4 = 440 = 69
				var context = { tempo: 60 };
				expect((new NoteProcessor()).mapRawNote(context, {freq:440,time:100}))
				.toEqualApproximately([{midinote: 69}]);
			});
			
		});
		it('should map a raw second note to a delay and a note via context', function() {
			inject(function(NoteProcessor) {
				// A4 = 440 = 69
				var context = { tempo: 120 };
				expect((new NoteProcessor()).mapRawNote(context, {freq:440,time:101}, {time:100}))
				.toEqualApproximately([{beats:2},{midinote: 69}]);
			});
		});
		it('should map a two raw notes to a note, delay and a note via context', function() {
			inject(function(NoteProcessor) {
				// A4 = 440 = 69
				var context = { tempo: 120 };
				expect((new NoteProcessor()).mapRawNotes(context, [{freq:440,time:100}, {freq:440,time:101}]))
				.toEqualApproximately([{midinote:69},{beats:2},{midinote: 69}]);
			});
		});
		it('should map 2.2 beats at quant. 2 to 2 beats', function() {
			inject(function(NoteProcessor) {
				var projection = { countsPerBeat: 2 };
				var notes = [{beats:2.2}];
				expect((new NoteProcessor()).projectNotes(projection, notes))
				.toEqualApproximately([{beats:2}]);
			});
		});
		it('should map 2.4 beats at quant. 2 to 2.5 beats', function() {
			inject(function(NoteProcessor) {
				var projection = { countsPerBeat: 2 };
				var notes = [{beats:2.4}];
				expect((new NoteProcessor()).projectNotes(projection, notes))
				.toEqualApproximately([{beats:2.5}]);
			});
		});
		it('should map note 60.2 at quant. 2 to 60', function() {
			inject(function(NoteProcessor) {
				var projection = { pitchesPerSemitone: 2 };
				var notes = [{midinote:60.2}];
				expect((new NoteProcessor()).projectNotes(projection, notes))
				.toEqualApproximately([{midinote:60}]);
			});
		});
		it('should map note 60.4 beats at quant. 2 to 60.5', function() {
			inject(function(NoteProcessor) {
				var projection = { pitchesPerSemitone: 2 };
				var notes = [{midinote:60.4}];
				expect((new NoteProcessor()).projectNotes(projection, notes))
				.toEqualApproximately([{midinote:60.5}]);
			});
		});
		it('should map 1,1 beats at quant. 1 to 2 beats', function() {
			inject(function(NoteProcessor) {
				var projection = { countsPerBeat: 1 };
				var notes = [{beats:1},{beats:1}];
				expect((new NoteProcessor()).projectNotes(projection, notes))
				.toEqualApproximately([{beats:2}]);
			});
		});
		it('should map 0.1 beats at quant. 1 to nothing', function() {
			inject(function(NoteProcessor) {
				var projection = { countsPerBeat: 1 };
				var notes = [{beats:0.1}];
				expect((new NoteProcessor()).projectNotes(projection, notes))
				.toEqualApproximately([]);
			});
		});
		it('should print notes and delays', function() {
			inject(function(NoteProcessor) {
				var notes = [{midinote:60},{beats:1},{midinote:62}];
				expect((new NoteProcessor()).notesToString(notes))
				.toEqual("C4,/1,D4");
			});
		});
	});
});