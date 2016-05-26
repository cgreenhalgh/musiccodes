describe('muzicodes.codeui module', function() {
	beforeEach(module('muzicodes.codeui'));

	describe('CodeNode class', function() {
		it('should be defined', function() {
			inject(function(CodeNode) {
				expect(CodeNode).toBeDefined();
			});
		});
	});
	describe('Jasmine object matcher', function() {
		it('should match objects', function() {
			expect({a:1,b:'2'}).toEqual({a:1,b:'2'});
		});
	});
	describe('CodeParser class', function() {
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
		it('should refuse C5# as a note', function() {
			inject(function(CodeParser, CodeNode) {
				var parser = new CodeParser();
				// jasmine.objectContaining()
				expect(parser.parse('C5#')).toEqual({
					state: CodeParser.ERROR
				});
			});
		});
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
		it('should parse , as a sequence of two null notes', function() {
			inject(function(CodeParser, CodeNode) {
				var parser = new CodeParser();
				// jasmine.objectContaining()
				expect(parser.parse(',')).toEqual({
					state: CodeParser.OK,
					node: {
						type: CodeNode.SEQUENCE,
						children: 
							[ null, null ]
					}
				});
			});
		});
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
	});
});