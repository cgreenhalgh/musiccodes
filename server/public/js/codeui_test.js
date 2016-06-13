describe('muzicodes.codeui module', function() {
	beforeEach(module('muzicodes.codeui'));

	describe('CodeNode class', function() {
		// 1
		it('should be defined', function() {
			inject(function(CodeNode) {
				expect(CodeNode).toBeDefined();
			});
		});
	});
	describe('Jasmine object matcher', function() {
		// 2
		it('should match objects', function() {
			expect({a:1,b:'2'}).toEqual({a:1,b:'2'});
		});
	});
	describe('CodeParser class', function() {
		// 3
		it('should parse C as a note', function() {
			inject(function(CodeParser, CodeNode) {
				var parser = new CodeParser();
				// jasmine.objectContaining()
				expect(parser.parse('C')).toEqual({
					state: CodeParser.OK,
					node: {
						type: CodeNode.NOTE,
						name: 'C'
					}
				});
			});
		});
		// 4
		it('should parse C# as a note', function() {
			inject(function(CodeParser, CodeNode) {
				var parser = new CodeParser();
				// jasmine.objectContaining()
				expect(parser.parse('C#')).toEqual({
					state: CodeParser.OK,
					node: {
						type: CodeNode.NOTE,
						name: 'C',
						accidental: '#'
					}
				});
			});
		});
		// 5
		it('should parse Cb as a note', function() {
			inject(function(CodeParser, CodeNode) {
				var parser = new CodeParser();
				// jasmine.objectContaining()
				expect(parser.parse('Cb')).toEqual({
					state: CodeParser.OK,
					node: {
						type: CodeNode.NOTE,
						name: 'C',
						accidental: 'b'
					}
				});
			});
		});
		// 6
		it('should parse C#5 as a note', function() {
			inject(function(CodeParser, CodeNode) {
				var parser = new CodeParser();
				// jasmine.objectContaining()
				expect(parser.parse('C#5')).toEqual({
					state: CodeParser.OK,
					node: {
						type: CodeNode.NOTE,
						name: 'C',
						accidental: '#',
						octave: 5
					}
				});
			});
		});
		// 7
		it('should refuse C5# as a note', function() {
			inject(function(CodeParser, CodeNode) {
				var parser = new CodeParser();
				// jasmine.objectContaining()
				expect(parser.parse('C5#').state).toEqual(CodeParser.ERROR);
			});
		});
		// 8
		it('should parse C? as a repeat of a note', function() {
			inject(function(CodeParser, CodeNode) {
				var parser = new CodeParser();
				// jasmine.objectContaining()
				expect(parser.parse('C?')).toEqual({
					state: CodeParser.OK,
					node: {
						type: CodeNode.REPEAT_0_OR_1,
						children: 
							[
							 {
								 type: CodeNode.NOTE,
								 name: 'C'
							 }
							 ]
					}
				});
			});
		});
		// 9
		it('should parse C* as a repeat of a note', function() {
			inject(function(CodeParser, CodeNode) {
				var parser = new CodeParser();
				// jasmine.objectContaining()
				expect(parser.parse('C*')).toEqual({
					state: CodeParser.OK,
					node: {
						type: CodeNode.REPEAT_0_OR_MORE,
						children: 
							[
							 {
								 type: CodeNode.NOTE,
								 name: 'C'
							 }
							 ]
					}
				});
			});
		});
		// 10
		it('should parse C+ as a repeat of a note', function() {
			inject(function(CodeParser, CodeNode) {
				var parser = new CodeParser();
				// jasmine.objectContaining()
				expect(parser.parse('C+')).toEqual({
					state: CodeParser.OK,
					node: {
						type: CodeNode.REPEAT_1_OR_MORE,
						children: 
							[
							 {
								 type: CodeNode.NOTE,
								 name: 'C'
							 }
							 ]
					}
				});
			});
		});
		// 11
		it('should refuse ,', function() {
			inject(function(CodeParser, CodeNode) {
				var parser = new CodeParser();
				// jasmine.objectContaining()
				expect(parser.parse(',').state).toEqual(CodeParser.ERROR);
			});
		});
		// 12
		it('should parse C,C as a sequence of two notes', function() {
			inject(function(CodeParser, CodeNode) {
				var parser = new CodeParser();
				// jasmine.objectContaining()
				expect(parser.parse('C,C')).toEqual({
					state: CodeParser.OK,
					node: {
						type: CodeNode.SEQUENCE,
						children: 
							[
							 { type: CodeNode.NOTE, name: 'C' },
							 { type: CodeNode.NOTE, name: 'C' }
							 ]
					}
				});
			});
		});
		// 13
		it('should parse C#,C# as a sequence of two notes', function() {
			inject(function(CodeParser, CodeNode) {
				var parser = new CodeParser();
				// jasmine.objectContaining()
				expect(parser.parse('C#,C#')).toEqual({
					state: CodeParser.OK,
					node: {
						type: CodeNode.SEQUENCE,
						children: 
							[
							 { type: CodeNode.NOTE, name: 'C', accidental: '#' },
							 { type: CodeNode.NOTE, name: 'C', accidental: '#' }
							 ]
					}
				});
			});
		});
		// 14
		it('should parse C#,C#,C# as a sequence of three notes', function() {
			inject(function(CodeParser, CodeNode) {
				var parser = new CodeParser();
				// jasmine.objectContaining()
				expect(parser.parse('C#,C#,C#')).toEqual({
					state: CodeParser.OK,
					node: {
						// Left or right associative?!
						type: CodeNode.SEQUENCE,
						children: 
							[
							 {   type: CodeNode.NOTE, name: 'C', accidental: '#' },
							 {   type: CodeNode.SEQUENCE,
								 children: 
									 [
									  { type: CodeNode.NOTE, name: 'C', accidental: '#' },
									  { type: CodeNode.NOTE, name: 'C', accidental: '#' }
									  ]
							 }
							 ]
					}
				});
			});
		});
		// 15
		it('should parse and normalise C#,C#,C# as a sequence of three notes', function() {
			inject(function(CodeParser, CodeNode) {
				var parser = new CodeParser();
				// jasmine.objectContaining()
				expect(parser.normalise(parser.parse('C#,C#,C#').node)).toEqual({
					// Left or right associative?!
					type: CodeNode.SEQUENCE,
					children: 
						[
						 { type: CodeNode.NOTE, midinote: 61 },
						 { type: CodeNode.NOTE, midinote: 61 },
						 { type: CodeNode.NOTE, midinote: 61 }
						 ]
				});
			});
		});
		// 16
		it('should parse and normalise [C-D] as a note range', function() {
			inject(function(CodeParser, CodeNode) {
				var parser = new CodeParser();
				// jasmine.objectContaining()
				expect(parser.normalise(parser.parse('[C-D]').node)).toEqual({
					// Left or right associative?!
					type: CodeNode.NOTE_RANGE,
					minMidinote: 60,
					maxMidinote: 62
				});
			});
		});
		// 17
		it('should parse and normalise /1,/1 as a /2', function() {
			inject(function(CodeParser, CodeNode) {
				var parser = new CodeParser();
				// jasmine.objectContaining()
				expect(parser.normalise(parser.parse('/1,/1').node)).toEqual({
					// Left or right associative?!
					type: CodeNode.DELAY,
					beats: 2
				});
			});
		});
		it('should parse and print C as C4', function() {
			inject(function(CodeParser, CodeNode) {
				var parser = new CodeParser();
				// jasmine.objectContaining()
				expect(CodeNode.toString(parser.normalise(parser.parse('C').node))).toEqual('C4');
			});
		});
		it('should parse and print C3 as C3', function() {
			inject(function(CodeParser, CodeNode) {
				var parser = new CodeParser();
				// jasmine.objectContaining()
				expect(CodeNode.toString(parser.normalise(parser.parse('C3').node))).toEqual('C3');
			});
		});
		it('should parse and print C,D|E as C4,D4|E4', function() {
			inject(function(CodeParser, CodeNode) {
				var parser = new CodeParser();
				// jasmine.objectContaining()
				expect(CodeNode.toString(parser.normaliseNotes(parser.parse('C,D|E').node))).toEqual('C4,D4|E4');
			});
		});
		it('should parse and print (C,D) (C4,D4)', function() {
			inject(function(CodeParser, CodeNode) {
				var parser = new CodeParser();
				// jasmine.objectContaining()
				expect(CodeNode.toString(parser.normaliseNotes(parser.parse('(C,D)').node))).toEqual('(C4,D4)');
			});
		});
		it('should parse and print (C?,D*|E)+ as (C4?,D4*|E4)+', function() {
			inject(function(CodeParser, CodeNode) {
				var parser = new CodeParser();
				// jasmine.objectContaining()
				expect(CodeNode.toString(parser.normaliseNotes(parser.parse('(C?,D*|E)+').node))).toEqual('(C4?,D4*|E4)+');
			});
		});
	});
	describe('CodeMatcher class', function() {
		// 19
		it('should match 60 as C', function() {
			inject(function(CodeMatcher, CodeParser, CodeNode) {
				var parser = new CodeParser();
				var code = parser.parse("C");
				expect(code.state).toEqual(CodeParser.OK);
				code = parser.normalise(code.node);
				expect(code).toBeDefined();
				
				var matcher = new CodeMatcher();
				matcher.compile(code);
				
				var notes = [{ midinote: 60 }];
				// jasmine.objectContaining()
				expect(matcher.match(notes)).toEqual(true);
			});
		});

		it('should not match 61 as C', function() {
			inject(function(CodeMatcher, CodeParser, CodeNode) {
				var parser = new CodeParser();
				var code = parser.parse("C");
				expect(code.state).toEqual(CodeParser.OK);
				code = parser.normalise(code.node);
				expect(code).toBeDefined();
				
				var matcher = new CodeMatcher();
				matcher.compile(code);
				
				var notes = [{ midinote: 61 }];
				// jasmine.objectContaining()
				expect(matcher.match(notes)).toEqual(false);
			});
		});
		it('should match /1 as /1', function() {
			inject(function(CodeMatcher, CodeParser, CodeNode) {
				var parser = new CodeParser();
				var code = parser.parse("/1");
				expect(code.state).toEqual(CodeParser.OK);
				code = parser.normalise(code.node);
				expect(code).toBeDefined();
				
				var matcher = new CodeMatcher();
				matcher.compile(code);
				
				var notes = [{ beats: 1 }];
				// jasmine.objectContaining()
				expect(matcher.match(notes)).toEqual(true);
			});
		});
		it('should not match /2 as /1', function() {
			inject(function(CodeMatcher, CodeParser, CodeNode) {
				var parser = new CodeParser();
				var code = parser.parse("/1");
				expect(code.state).toEqual(CodeParser.OK);
				code = parser.normalise(code.node);
				expect(code).toBeDefined();
				
				var matcher = new CodeMatcher();
				matcher.compile(code);
				
				var notes = [{ beats: 2 }];
				// jasmine.objectContaining()
				expect(matcher.match(notes)).toEqual(false);
			});
		});
		it('should match 60,62 as C,D', function() {
			inject(function(CodeMatcher, CodeParser, CodeNode) {
				var parser = new CodeParser();
				var code = parser.parse("C,D");
				expect(code.state).toEqual(CodeParser.OK);
				code = parser.normalise(code.node);
				expect(code).toBeDefined();
				
				var matcher = new CodeMatcher();
				matcher.compile(code);
				
				var notes = [{ midinote: 60 }, {midinote: 62}];
				// jasmine.objectContaining()
				expect(matcher.match(notes)).toEqual(true);
			});
		});
		it('should match 62 as C|D', function() {
			inject(function(CodeMatcher, CodeParser, CodeNode) {
				var parser = new CodeParser();
				var code = parser.parse("C|D");
				expect(code.state).toEqual(CodeParser.OK);
				code = parser.normalise(code.node);
				expect(code).toBeDefined();
				
				var matcher = new CodeMatcher();
				matcher.compile(code);
				
				var notes = [{midinote: 62}];
				// jasmine.objectContaining()
				expect(matcher.match(notes)).toEqual(true);
			});
		});
		it('should match 62 as .', function() {
			inject(function(CodeMatcher, CodeParser, CodeNode) {
				var parser = new CodeParser();
				var code = parser.parse(".");
				expect(code.state).toEqual(CodeParser.OK);
				code = parser.normalise(code.node);
				expect(code).toBeDefined();
				
				var matcher = new CodeMatcher();
				matcher.compile(code);
				
				var notes = [{midinote: 62}];
				// jasmine.objectContaining()
				expect(matcher.match(notes)).toEqual(true);
			});
		});
		it('should match /1 as .', function() {
			inject(function(CodeMatcher, CodeParser, CodeNode) {
				var parser = new CodeParser();
				var code = parser.parse(".");
				expect(code.state).toEqual(CodeParser.OK);
				code = parser.normalise(code.node);
				expect(code).toBeDefined();
				
				var matcher = new CodeMatcher();
				matcher.compile(code);
				
				var notes = [{beats: 1}];
				// jasmine.objectContaining()
				expect(matcher.match(notes)).toEqual(true);
			});
		});
		it('should match 62 as C?,D', function() {
			inject(function(CodeMatcher, CodeParser, CodeNode) {
				var parser = new CodeParser();
				var code = parser.parse("C?,D");
				expect(code.state).toEqual(CodeParser.OK);
				code = parser.normalise(code.node);
				expect(code).toBeDefined();
				
				var matcher = new CodeMatcher();
				matcher.compile(code);
				
				var notes = [{midinote: 62}];
				// jasmine.objectContaining()
				expect(matcher.match(notes)).toEqual(true);
			});
		});
		it('should match 60,62 as C?,D', function() {
			inject(function(CodeMatcher, CodeParser, CodeNode) {
				var parser = new CodeParser();
				var code = parser.parse("C?,D");
				expect(code.state).toEqual(CodeParser.OK);
				code = parser.normalise(code.node);
				expect(code).toBeDefined();
				
				var matcher = new CodeMatcher();
				matcher.compile(code);
				
				var notes = [{midinote: 60},{midinote: 62}];
				// jasmine.objectContaining()
				expect(matcher.match(notes)).toEqual(true);
			});
		});
		it('should not match 60,60,62 as C?,D', function() {
			inject(function(CodeMatcher, CodeParser, CodeNode) {
				var parser = new CodeParser();
				var code = parser.parse("C?,D");
				expect(code.state).toEqual(CodeParser.OK);
				code = parser.normalise(code.node);
				expect(code).toBeDefined();
				
				var matcher = new CodeMatcher();
				matcher.compile(code);
				
				var notes = [{midinote: 60},{midinote: 60},{midinote: 62}];
				// jasmine.objectContaining()
				expect(matcher.match(notes)).toEqual(false);
			});
		});
		it('should match 60 as .*', function() {
			inject(function(CodeMatcher, CodeParser, CodeNode) {
				var parser = new CodeParser();
				var code = parser.parse(".*");
				expect(code.state).toEqual(CodeParser.OK);
				code = parser.normalise(code.node);
				expect(code).toBeDefined();
				
				var matcher = new CodeMatcher();
				matcher.compile(code);
				
				var notes = [{midinote: 60}];
				// jasmine.objectContaining()
				expect(matcher.match(notes)).toEqual(true);
			});
		});
		it('should match 60,60,62 as .*', function() {
			inject(function(CodeMatcher, CodeParser, CodeNode) {
				var parser = new CodeParser();
				var code = parser.parse(".*");
				expect(code.state).toEqual(CodeParser.OK);
				code = parser.normalise(code.node);
				expect(code).toBeDefined();
				
				var matcher = new CodeMatcher();
				matcher.compile(code);
				
				var notes = [{midinote: 60},{midinote: 60},{midinote: 62}];
				// jasmine.objectContaining()
				expect(matcher.match(notes)).toEqual(true);
			});
		});
		it('should match 60,62 as C,.*,D', function() {
			inject(function(CodeMatcher, CodeParser, CodeNode) {
				var parser = new CodeParser();
				var code = parser.parse("C,.*,D");
				expect(code.state).toEqual(CodeParser.OK);
				code = parser.normalise(code.node);
				expect(code).toBeDefined();
				
				var matcher = new CodeMatcher();
				matcher.compile(code);
				
				var notes = [{midinote: 60},{midinote: 62}];
				// jasmine.objectContaining()
				expect(matcher.match(notes)).toEqual(true);
			});
		});
		it('should match 60,60,62,62 as C,.*,D', function() {
			inject(function(CodeMatcher, CodeParser, CodeNode) {
				var parser = new CodeParser();
				var code = parser.parse("C,.*,D");
				expect(code.state).toEqual(CodeParser.OK);
				code = parser.normalise(code.node);
				expect(code).toBeDefined();
				
				var matcher = new CodeMatcher();
				matcher.compile(code);
				
				var notes = [{midinote: 60},{midinote: 60},{midinote: 62},{midinote: 62}];
				// jasmine.objectContaining()
				expect(matcher.match(notes)).toEqual(true);
			});
		});
		it('should part-match C,D with 60 as *C*,D', function() {
			inject(function(CodeMatcher, CodeParser, CodeNode) {
				var parser = new CodeParser();
				var code = parser.parse("C,D");
				expect(code.state).toEqual(CodeParser.OK);
				code = parser.normalise(code.node);
				expect(code).toBeDefined();
				
				var matcher = new CodeMatcher();
				matcher.compile(code);
				
				var notes = [{midinote: 60}];
				expect(matcher.match(notes)).toEqual(false);
				
				expect(matcher.getMatchedIds()).toEqual({2:{type:CodeNode.NOTE,midinote:60,id:2}});
			});
		});
	});
	describe('InexactMatcher class', function() {
		// 19
		it('should match 60 error:0 as C', function() {
			inject(function(InexactMatcher, CodeParser, CodeNode) {
				var parser = new CodeParser();
				var code = parser.parse("C");
				expect(code.state).toEqual(CodeParser.OK);
				code = parser.normalise(code.node);
				expect(code).toBeDefined();
				
				var matcher = new InexactMatcher();
				matcher.compile(code, 0, {});
				
				var notes = [{ midinote: 60 }];
				// jasmine.objectContaining()
				expect(matcher.match(notes)).toEqual(true);
			});
		});
		it('should give error 0 for 60 as C', function() {
			inject(function(InexactMatcher, CodeParser, CodeNode) {
				var parser = new CodeParser();
				var code = parser.parse("C");
				expect(code.state).toEqual(CodeParser.OK);
				code = parser.normalise(code.node);
				expect(code).toBeDefined();
				
				var matcher = new InexactMatcher();
				matcher.compile(code, 0, {});
				
				var notes = [{ midinote: 60 }];
				matcher.match(notes);
				// jasmine.objectContaining()
				expect(matcher.getError()).toEqual(0);
			});
		});
		it('should give error 1 for 60 as C,C', function() {
			inject(function(InexactMatcher, CodeParser, CodeNode) {
				var parser = new CodeParser();
				var code = parser.parse("C,C");
				expect(code.state).toEqual(CodeParser.OK);
				code = parser.normalise(code.node);
				expect(code).toBeDefined();
				
				var matcher = new InexactMatcher();
				matcher.compile(code, 1, {});
				
				var notes = [{ midinote: 60 }];
				matcher.match(notes);
				// jasmine.objectContaining()
				expect(matcher.getError()).toEqual(1);
			});
		});
		it('should give error 1 for 60,60 as C', function() {
			inject(function(InexactMatcher, CodeParser, CodeNode) {
				var parser = new CodeParser();
				var code = parser.parse("C");
				expect(code.state).toEqual(CodeParser.OK);
				code = parser.normalise(code.node);
				expect(code).toBeDefined();
				
				var matcher = new InexactMatcher();
				matcher.compile(code, 1, {});
				
				var notes = [{ midinote: 60 },{midinote: 60}];
				matcher.match(notes);
				// jasmine.objectContaining()
				expect(matcher.getError()).toEqual(1);
			});
		});
		it('should give error 2 for 62 as C', function() {
			inject(function(InexactMatcher, CodeParser, CodeNode) {
				var parser = new CodeParser();
				var code = parser.parse("C");
				expect(code.state).toEqual(CodeParser.OK);
				code = parser.normalise(code.node);
				expect(code).toBeDefined();
				
				var matcher = new InexactMatcher();
				matcher.compile(code,2, {});
				
				var notes = [{ midinote: 62}];
				matcher.match(notes);
				// jasmine.objectContaining()
				expect(matcher.getError()).toEqual(2);
			});
		});
		it('should give error 0 for 60 as [C4-D4]', function() {
			inject(function(InexactMatcher, CodeParser, CodeNode) {
				var parser = new CodeParser();
				var code = parser.parse("[C4-D4]");
				expect(code.state).toEqual(CodeParser.OK);
				code = parser.normalise(code.node);
				expect(code).toBeDefined();
				
				var matcher = new InexactMatcher();
				matcher.compile(code, 0, {});
				
				var notes = [{ midinote: 60 }];
				matcher.match(notes);
				// jasmine.objectContaining()
				expect(matcher.getError()).toEqual(0);
			});
		});
		it('should give error 2 for 60 as [D4-D5]', function() {
			inject(function(InexactMatcher, CodeParser, CodeNode) {
				var parser = new CodeParser();
				var code = parser.parse("[D4-D5]");
				expect(code.state).toEqual(CodeParser.OK);
				code = parser.normalise(code.node);
				expect(code).toBeDefined();
				
				var matcher = new InexactMatcher();
				matcher.compile(code, 2, {});
				
				var notes = [{ midinote: 60 }];
				expect(matcher.match(notes)).toEqual(true);
				// jasmine.objectContaining()
				expect(matcher.getError()).toEqual(2);
			});
		});
		it('canMatch C,(C|D),E', function() {
			inject(function(InexactMatcher, CodeParser, CodeNode) {
				var parser = new CodeParser();
				var code = parser.parse("C,(C|D),E");
				expect(code.state).toEqual(CodeParser.OK);
				code = parser.normalise(code.node);
				expect(code).toBeDefined();
				
				expect(InexactMatcher.canMatch(code)).toEqual(true);
			});
		});
		it('!canMatch C?,D,E', function() {
			inject(function(InexactMatcher, CodeParser, CodeNode) {
				var parser = new CodeParser();
				var code = parser.parse("C?,D,E");
				expect(code.state).toEqual(CodeParser.OK);
				code = parser.normalise(code.node);
				expect(code).toBeDefined();
				
				expect(InexactMatcher.canMatch(code)).toEqual(false);
			});
		});
		it('should part-match C,D with 60 as *C*,D', function() {
			inject(function(InexactMatcher, CodeParser, CodeNode) {
				var parser = new CodeParser();
				var code = parser.parse("C,D");
				expect(code.state).toEqual(CodeParser.OK);
				code = parser.normalise(code.node);
				expect(code).toBeDefined();
				
				var matcher = new InexactMatcher();
				matcher.compile(code, 0, {});
				
				var notes = [{midinote: 60}];
				expect(matcher.match(notes)).toEqual(false);
				
				expect(matcher.getMatchedIds()).toEqual({2:{type:CodeNode.NOTE,midinote:60,id:2}});
			});
		});
		it('should not match C with 62', function() {
			inject(function(InexactMatcher, CodeParser, CodeNode) {
				var parser = new CodeParser();
				var code = parser.parse("C");
				expect(code.state).toEqual(CodeParser.OK);
				code = parser.normalise(code.node);
				expect(code).toBeDefined();
				
				var matcher = new InexactMatcher();
				matcher.compile(code, 0, {});
				
				var notes = [{midinote: 62}];
				expect(matcher.match(notes)).toEqual(false);
			});
		});
		it('should give match error 0.5 for 62 vs 60 with noteAllowRange=1 and noteErrorRange=3 and noteReplaceError=1', function() {
			inject(function(InexactMatcher, CodeParser, CodeNode) {
				var node = {type: CodeNode.NOTE, midinote: 62};
				var note = {midinote: 60};
				var parameters = {noteAllowRange: 1, noteErrorRange:3, noteReplaceError:1};
				expect(InexactMatcher.errorAtomic(node, note, parameters)).toBeCloseTo(0.5);
			});
		});
		it('should give match error 0.5 for beats 1.2 vs 1 with delayAllowRange=0.1 and delayErrorRange=0.3', function() {
			inject(function(InexactMatcher, CodeParser, CodeNode) {
				var node = {type: CodeNode.DELAY, beats: 1};
				var note = {beats: 1.2};
				var parameters = {delayAllowRange: 0.1, delayErrorRange:0.3};
				expect(InexactMatcher.errorAtomic(node, note, parameters)).toBeCloseTo(0.5);
			});
		});
		it('should give error 0.5 for 62 as C4 with noteAllowRange 1 and noteErrorRange 5', function() {
			inject(function(InexactMatcher, CodeParser, CodeNode) {
				var parser = new CodeParser();
				var code = parser.parse("C4");
				expect(code.state).toEqual(CodeParser.OK);
				code = parser.normalise(code.node);
				expect(code).toBeDefined();
				
				var matcher = new InexactMatcher();
				matcher.compile(code, 2, {noteAllowRange: 1, noteErrorRange:5});
				
				var notes = [{ midinote: 62 }];
				expect(matcher.match(notes)).toEqual(true);
				// jasmine.objectContaining()
				expect(matcher.getError()).toBeCloseTo(0.5);
			});
		});
	});
});