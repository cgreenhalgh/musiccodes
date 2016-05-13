//visualisation stuff
var viz = angular.module('muzicodes.viz', [])

//d3 injector - see http://www.ng-newsletter.com/posts/d3-on-angular.html
viz.factory('d3Service', ['$document', '$q', '$rootScope',
	function($document, $q, $rootScope) {
		console.log('d3Service...');
		var d = $q.defer();
		function onScriptLoad() {
			// Load client in the browser
			$rootScope.$apply(function() { d.resolve(window.d3); });
		}
		// Create a script tag with d3 as the source
		// and call our onScriptLoad callback when it
		// has been loaded
		var scriptTag = $document[0].createElement('script');
		scriptTag.type = 'text/javascript'; 
		scriptTag.async = true;
		scriptTag.src = '/vendor/d3.v3.min.js'; // http://d3js.org/d3.v3.min.js
		scriptTag.onreadystatechange = function () {
			if (this.readyState == 'complete') onScriptLoad();
		}
		scriptTag.onload = onScriptLoad;

		var s = $document[0].getElementsByTagName('body')[0];
		s.appendChild(scriptTag);

		return {
			d3: function() { return d.promise; }
		};
	}
]);

viz.directive('noteRoll', ['d3Service', '$window', function(d3Service,$window) {
	console.log('note-roll...');
	return {
		restrict: 'EA',
		// directive code
		scope: {
	        notes: '=', // bi-directional data-binding
	        time: '='
		},
		link: function(scope, element, attrs) {
			console.log('link note-roll...');
			d3Service.d3().then(function(d3) {
				var margin = parseInt(attrs.margin) || 10;
				// our d3 code will go here
				var svg = d3.select(element[0])
				    .append('svg')
				    .style('width', '100%')
					.classed('note-roll', true);

				// Browser onresize event
				window.onresize = function() {
					scope.$apply();
				};

				// Watch for resize event
				scope.$watch(function() {
					//console.log('resize window');
					return angular.element($window)[0].innerWidth;
				}, function() {
					scope.render(scope.notes,scope.time);
				});
				scope.$watch(function() {
					//console.log('resize element');
					return d3.select(element[0]).node().offsetWidth;
				}, function() {
					scope.render(scope.notes,scope.time);
				});

				// watch for data changes and re-render
				scope.$watch('notes', function(newVals, oldVals) {
					return scope.render(newVals, scope.time);
				}, true);
				scope.$watch('time', function(newVal, oldVal) {
					return scope.render(scope.notes, newVal);
				}, true);

				scope.render = function(notes, time) {
					// our custom d3 code
					// remove all previous items before render
					if (!notes)
						notes = [];

					var timeref = notes.length>0 ? notes[0].time : 0;
					var DEFAULT_TIME = 10;
					var ysize = 100;
					// setup variables
					var width = d3.select(element[0]).node().offsetWidth - margin,
						// calculate the height
						height = ysize+2*margin,
						// our xScale
						xscale = d3.scale.linear()
						  .domain([timeref, Math.max(timeref+DEFAULT_TIME, time,
								  d3.max(notes,function(d) { return d.time+(d.duration!==undefined ? d.duration : 0); }))])
						  .range([margin, width]);
					var yscale = d3.scale.log().domain([25,2500]).range([margin+ysize,margin]);
					var vscale = d3.scale.linear().domain([0,127]).range([1,5]);
					
					console.log('width='+width);
					if (width<=0)
						return;
					
					// set the height based on the calculations above
					svg.attr('height', height);
					var DEFAULT_WIDTH = 10;

					var cursor = svg.selectAll('line.time-cursor').data([time]);
					cursor
						.attr('x1', function(d) { return xscale(d); })
						.attr('x2', function(d) { return xscale(d); });
					cursor.enter().append('line')
						.classed('time-cursor', true)
						.attr('y1',margin).attr('y2',margin+ysize)
						.attr('x1', function(d) { return xscale(d); })
						.attr('x2', function(d) { return xscale(d); });
					
					var sel = svg.selectAll('rect.note').data(notes, function(d) { return d.id; });
					sel.attr('width', function(d) { return d.duration!==undefined ? xscale(d.time+d.duration)-xscale(d.time) : (time>d.time ? xscale(time)-xscale(d.time) : DEFAULT_WIDTH); })
					  	.attr('x', function(d) { return xscale(d.time); });
					sel.enter().append('rect')
					    .classed('note', true)
					    .classed('note-included', function(d) { return d.discarded===undefined || !d.discarded ; })
					    .classed('note-discarded', function(d) { return d.discarded!==undefined ? d.discarded : false; })
					    .attr('height', function(d) { return 2*vscale(d.velocity); })
					    .attr('width', function(d) { return d.duration!==undefined ? xscale(d.time+d.duration)-xscale(d.time) : DEFAULT_WIDTH; })
					    .attr('x', function(d) { return xscale(d.time); })
					    .attr('y', function(d) { return yscale(d.freq)-vscale(d.velocity); });
					sel.exit().remove();
					  
					var notenames = svg.selectAll('text.code').data(notes, function(d) { return d.id; });
					notenames.attr('x', function(d) { return xscale(d.time); });
					notenames.enter().append('text')
					    .classed('code', true)
					    .text(function(d) { return d.note; })
					    .attr('x', function(d) { return xscale(d.time); })
					    .attr('y', function(d) { return yscale(d.freq); });
					notenames.exit().remove();

				}			
			});
		}
	};
}]);