//visualisation stuff
var viz = angular.module('muzicodes.viz', ['muzicodes.stream']);

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

viz.directive('noteRoll', ['d3Service', '$window', 'noteGrouperFactory', 'streamutils',
                           function(d3Service, $window, noteGrouperFactory, streamutils) {
	console.log('note-roll...');
	return {
		restrict: 'EA',
		// directive code
		scope: {
	        notes: '=', // bi-directional data-binding
	        time: '=',
	        groups: '=',
	        parameters: '=',
	        height: '@',
	        period: '=',
	        context: '=',
	        onselect: '&',
	        projection: '=',
	        projections: '='
		},
		link: function(scope, element, attrs) {
			scope.times = [[0,0],[0,0]];
			scope.selection = null;
			console.log('link note-roll, period='+scope.period+'...');
			function mapTime(ev) {
				var time = 0;
				var offsetX = ev.clientX-element[0].getBoundingClientRect().left;
				//console.log('mouse position '+ev.clientX+', offset '+element[0].getBoundingClientRect().left);
				if (offsetX<scope.times[0][0])
					time = scope.times[1][0];
				else if (offsetX>scope.times[0][1])
					time = scope.times[1][1];
				else {
					var a = (offsetX-scope.times[0][0])/(scope.times[0][1]-scope.times[0][0]);
					time = scope.times[1][0]+a*(scope.times[1][1]-scope.times[1][0]);
				}
				return time;
			}
			d3Service.d3().then(function(d3) {
				element.on('mousedown', function(ev) {
					//console.log('note-roll mousedown '+ev.button+' at '+ev.offsetX+','+ev.offsetY);
					if (ev.button==0) {
						var time = mapTime(ev);
						scope.selection = [time,time];
					}
					ev.preventDefault();
				});
				element.on('mouseup', function(ev) {
					//console.log('note-roll mouseup '+ev.button+' at '+ev.clientX+','+ev.clientY);
					if (ev.button==0 && scope.selection!=null) {
						var time = mapTime(ev);
						scope.selection = [Math.min(scope.selection[0], time), Math.max(scope.selection[0], time)];
						//console.log('select time '+scope.selection[0]+'-'+scope.selection[1]);
						var notes = [];
						if (scope.notes) {
							for (var ni in scope.notes) {
								var note = scope.notes[ni];
								if (note.time >= scope.selection[0] && note.time <= scope.selection[1])
									notes.push(note);
							}
						}
						//console.log('selected notes '+JSON.stringify(notes));
						//scope.selection = null;
						if (scope.onselect) {
							scope.onselect({notes: notes});
						}
					}					
					ev.preventDefault();
				});
				element.on('mousemove', function(ev) {
					//console.log('note-roll mousemove '+ev.buttons+' at '+ev.offsetX+','+ev.offsetY);
					if ((ev.buttons & 1)!=0 && scope.selection!=null) {
						var time = mapTime(ev);
						scope.selection = [scope.selection[0], time];
						//console.log('selecting time '+scope.selection[0]+'-'+scope.selection[1]);
					}
					ev.preventDefault();
				});
				
				var margin = parseInt(attrs.margin) || 10;
				var period = parseInt(scope.period) || 0;
				var height = parseInt(attrs.height) || 100+2*margin;
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
					scope.render(scope.notes,scope.time, scope.groups);
				});
				scope.$watch(function() {
					//console.log('resize element');
					return d3.select(element[0]).node().offsetWidth;
				}, function() {
					scope.render(scope.notes,scope.time, scope.groups);
				});

				// watch for data changes and re-render
				// danger: gross change, i.e. new array only - causes re-grouping of notes
				scope.$watch('notes', function(newVals, oldVals) {
					return scope.regroup(newVals, scope.parameters, scope.projection, scope.projections);
				});
				// fine-grained change, e.g. allocation to new group causes re-render, not regroup!
				scope.$watch('notes', function(newVals, oldVals) {
					return scope.render(newVals, scope.time, scope.groups);
				}, true);
				scope.$watch('time', function(newVal, oldVal) {
					return scope.render(scope.notes, newVal, scope.groups);
				}, true);
				scope.$watch('groups', function(newVal, oldVal) {
					return scope.render(scope.notes, scope.time, newVal);
				}, true);
				scope.$watch('selection', function(newVal, oldVal) {
					console.log('selection changed: '+JSON.stringify(newVal));
					return scope.render(scope.notes, scope.time, scope.groups, newVal);
				});
				// parameters affect grouping, which changes notes, which trigger render
				scope.$watch('parameters', function(newVals, oldVals) {
					scope.regroup(scope.notes, newVals, scope.projection, scope.projections);
					return scope.render(scope.notes, scope.time, scope.groups);
				}, true);
				scope.$watch('projection', function(newVals, oldVals) {
					scope.regroup(scope.notes, scope.parameters, newVals, scope.projections);
					return scope.render(scope.notes, scope.time, scope.groups);
				});
				scope.$watch('projections', function(newVals, oldVals) {
					scope.regroup(scope.notes, scope.parameters, scope.projection, newVals);
					return scope.render(scope.notes, scope.time, scope.groups);
				}, true);
				// context - wait for other updates??
				scope.$watch('context', function(newVals, oldVals) {
					//console.log('re-render on change of context');
					return scope.render(scope.notes, scope.time, scope.groups);
				}, true);

				var localGroups = [];
				scope.regroup = function(notes, parameters, projection, projections) {
					if (parameters===undefined)
						parameters = {};
					else
						parameters = streamutils.extend({}, parameters);
					if (!!projection && projections!==undefined && projections!==null) {
						var proj = null;
						for (var pi in projections) {
							if (projection==projections[pi].id) {
								proj = projections[pi];
								break;
							}
						}
						if (proj!==null && proj.filterParameters!==undefined) {
							parameters = streamutils.extend(parameters, proj.filterParameters);
						}
					}
					if (!!notes) {
						console.log('viz re-grouping notes');
						var noteGrouper = noteGrouperFactory.create(parameters);
						for (var i in notes) {
							var n = notes[i];
							noteGrouper.addNote(n);
							localGroups = noteGrouper.getGroups();
						}
					}
				}
				var beats = [];
				
				scope.render = function(notes, time, extgroups, selection) {
					if (selection===undefined)
						selection = scope.selection;
					// our custom d3 code
					// remove all previous items before render
					var groups = extgroups;
					if (!notes)
						notes = [];
					if (!time)
						time = 0;
					if (!groups) {
						// only use our own grouping if no explicit grouping provided
						groups = localGroups;
					}
					var timeref = notes.length>0 ? notes[0].time : 0;
					var DEFAULT_TIME = period || 10;
					var ysize = height-2*margin;
					// setup variables
					var width = d3.select(element[0]).node().offsetWidth - margin;
					var xscale;
					// our xScale#
					var maxTime = time;
					if (period>0) {
						xscale = d3.scale.linear().domain([time-period, time])
						  .range([margin, width]);
						scope.times = [[margin,width],[time-period, time]];
					} else {
						maxTime = Math.max(DEFAULT_TIME, time);
						if (notes && notes.length>0)
							maxTime = Math.max(maxTime, d3.max(notes,function(d) { return d.time+(d.duration!==undefined ? d.duration : 0); }));
						xscale = d3.scale.linear()
							.domain([0, maxTime])
					  .range([margin, width]);
						scope.times = [[margin,width],[0,maxTime]];
					}
					var yscale = d3.scale.log().domain([25,2500]).range([margin+ysize,margin]);
					var vscale = d3.scale.linear().domain([0,127]).range([1,5]);
					
					//console.log('width='+width);
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

					if (selection===null)
						selection = [];
					else
						selection = [selection];
					var selected = svg.selectAll('rect.selection').data(selection);
					selected
						.attr('x', function(d) { return xscale(Math.min(d[0],d[1])); })
						.attr('width', function(d) { return xscale(Math.max(d[0],d[1]))-xscale(Math.min(d[0],d[1])); });
					selected.enter().append('rect')
						.classed('selection', true)
						.attr('y',margin).attr('height',ysize)
						.attr('x', function(d) { return xscale(Math.min(d[0],d[1])); })
						.attr('width', function(d) { return xscale(Math.max(d[0],d[1]))-xscale(Math.min(d[0],d[1])); });
					selected.exit().remove()
					
					var tempo = scope.context!==undefined ? scope.context.tempo : 60;
					if (!tempo)
						tempo = 60;
					if (period>0) {
						if (beats.length==0) {
							beats.push(time);
						} else {
							while (beats[beats.length-1]+60/tempo <= time) {
								beats.push(beats[beats.length-1]+60/tempo);
								if (period>0 && beats[0]<time-period) {
									beats.splice(0,1);
								}
							}
						}
					} else {
						beats.splice(0,beats.length);
						var t = 0;
						while (t<maxTime) {
							beats.push(t);
							t += 60/tempo;
						}
					}
					//console.log('Beats: '+JSON.stringify(beats));
					var beatlines = svg.selectAll('line.beat').data(beats);
					beatlines
						.attr('x1', function(d) { return xscale(d); })
						.attr('x2', function(d) { return xscale(d); });
					beatlines.enter().append('line')
						.classed('beat', true)
						.attr('y1',margin).attr('y2',margin+ysize)
						.attr('x1', function(d) { return xscale(d); })
						.attr('x2', function(d) { return xscale(d); });
					beatlines.exit().remove();
			
					var sel = svg.selectAll('rect.note').data(notes, function(d) { return d.id; });
					sel.attr('width', function(d) { return d.duration!==undefined ? xscale(d.time+d.duration)-xscale(d.time) : (time>d.time ? xscale(time)-xscale(d.time) : DEFAULT_WIDTH); })
					  	.attr('x', function(d) { return xscale(d.time); })
					    .classed('note-included', function(d) { return d.group!==undefined; })
					    .classed('note-discarded', function(d) { return d.group===undefined; });

					sel.enter().append('rect')
					    .classed('note', true)
					    .classed('note-included', function(d) { return d.group!==undefined; })
					    .classed('note-discarded', function(d) { return d.group===undefined; })
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

					var groups = svg.selectAll('rect.group').data(groups, function(d) { return d.id; });
					groups.attr('width', function(d) { return Math.max(2, xscale(d.lastTime)-xscale(d.time)+2); })
					    .attr('x', function(d) { return xscale(d.time)-1; });
					groups.enter().append('rect')
					    .classed('group', true)
					    .attr('height', function(d) { return yscale(d.lowFreq)-yscale(d.highFreq); })
					    .attr('width', function(d) { return Math.max(2, xscale(d.lastTime)-xscale(d.time)+2); })
					    .attr('x', function(d) { return xscale(d.time)-1; })
					    .attr('y', function(d) { return yscale(d.highFreq); });
					groups.exit().remove();

				}			
			});
		}
	};
}]);