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
				expect(parser.parse('C5#')).toEqual({
					state: CodeParser.ERROR
				});
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
				expect(parser.parse(',')).toEqual({
					state: CodeParser.ERROR
				});
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
	});
});