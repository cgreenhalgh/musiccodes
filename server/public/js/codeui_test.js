describe('muzicodes.codeui module', function() {
  beforeEach(module('muzicodes.codeui'));

  describe('CodeNode class', function() {
    it('should be defined', function() {
      inject(function(CodeNode) {
        expect(CodeNode).toBeDefined();
      });
    });
  });
});