var app = angular.module('keyboardApp', ['muzicodes.midi','muzicodes.viz']);
// main player app
app.controller('keyboardCtrl', ['$scope',
                                function ($scope) {
	$scope.midiInput = '';
	$scope.midiOutput = '';
}]);

app.directive('keyboardView', ['midinotes', 'd3Service', '$window', 'midiout',
                               function(midinotes, d3Service, $window, midiout) {
	// C,C#,D,D#,E,F,F#,G,G#,A,A#,B
	var NOTEX = [0,0.5,1,1.5,2,3,3.5,4,4.5,5,5.5,6,7];
	var MIN_NOTE = 21;
	var MAX_NOTE = 108
	var NOTES_X = [];
	// need to draw black after
	var WHITE_NOTES_X = [], BLACK_NOTES_X = [];
	var WHITE_NOTES = [], BLACK_NOTES = [];
	for (var ni=0; ni<=MAX_NOTE; ni++) {
		var octave = Math.floor(ni/12);
		var note = ni-12*octave;
		var x = 7*octave+NOTEX[note];
		NOTES_X.push(x);
		if (ni<MIN_NOTE)
			continue;
		if (x-Math.floor(x)>0.1) {
			BLACK_NOTES.push(ni);
			BLACK_NOTES_X.push(x);
		}
		else {
			WHITE_NOTES.push(ni);
			WHITE_NOTES_X.push(x);
		}
	}
	var ALL_NOTES_X = WHITE_NOTES_X.concat(BLACK_NOTES_X);
	var ALL_NOTES = WHITE_NOTES.concat(BLACK_NOTES);

	return {
		restrict: 'E',
		scope: {
			midiInput: '=',
			midiOutput: '='
		},
		link: function(scope, element, attrs) {
			
			midinotes.onNote(function(note) {
				console.log('Note: '+JSON.stringify(note));
				// e.g. Note: {"time":84.142,"note":"D3","freq":146.818035918866,"velocity":90,"off":false}
				if (scope.svg && note.midinote && note.midinote>=0 && note.midinote<NOTES_X.length) {
					scope.svg.selectAll('rect.key').data([NOTES_X[note.midinote]],function(d) { return d; })
						.classed('pressed', !note.off);
				}
			});
			
			if (!!scope.midiInput) {
				midinotes.start(midiInput);
			}
			scope.$watch('midiInput', function(midiInput,oldValue) {
				console.log('midi input: '+midiInput);
				if (!!midiInput) {
					midinotes.start(midiInput);
				}
			});
			if (!!scope.midiOutput) {
				midiout.start(midiOutput);				
			}
			scope.$watch('midiOutput', function(midiOutput,oldValue) {
				console.log('midi output: '+midiOutput);
				if (!!midiOutput) {
					midiout.start(midiOutput);
				}
			});
			
			var margin = parseInt(attrs.margin) || 10;
			var height = parseInt(attrs.height) || 100+2*margin;
			
			d3Service.d3().then(function(d3) {
				var svg = scope.svg = d3.select(element[0])
				.append('svg')
				.style('width', '100%')
				.style('height', height)
				.classed('keyboard', true);

				// Browser onresize event
				window.onresize = function() {
					scope.$apply();
				};

				// Watch for resize event
				scope.$watch(function() {
					//console.log('resize window');
					return angular.element($window)[0].innerWidth;
				}, function() {
					scope.render();
				});
				scope.$watch(function() {
					//console.log('resize element');
					return d3.select(element[0]).node().offsetWidth;
				}, function() {
					scope.render();
				});

				var X_TO_NOTE = [0,2,4,5,7,9,11];
				var note = null;
				function endNote() {
					if (note!==null) {
						midiout.sendRaw([0x80,note & 0x7f,0x7f]);
						note = null;
					}
				};
				function checkNote(ev) {
					if (!scope.midiOutput)
						return;
					var offsetX = ev.clientX-element[0].getBoundingClientRect().left;
					var offsetY = ev.clientY;//-element[0].getBoundingClientRect().top; ?? 107!!
					var width = d3.select(element[0]).node().offsetWidth - margin;
					var x = (offsetX - margin) / (width - margin) * (NOTES_X[NOTES_X.length-1]+1-NOTES_X[MIN_NOTE]);
					var y = (offsetY - margin) / (height - 2*margin)
					console.log('mousedown at '+offsetX+','+offsetY+' -> '+x+','+y);
					var octave = Math.floor((x+5+7)/7);
					var notex = x+5+7-7*octave;
					var wnote = X_TO_NOTE[Math.floor(notex)];
					if (y < 0.7 && notex>0.5 && notex<6.5 && (notex<2.5 || notex>3.5)) {
						// black
						wnote = X_TO_NOTE[Math.floor(notex-0.5)]+1;
					}
					var newnote = octave*12+wnote;
					if (newnote!==note) {
						endNote();
						if (y<0 || y>1) {
							console.log('ignore note off keyboard y='+y);
						} else {
							note = newnote;
							if (note>=MIN_NOTE && note<=MAX_NOTE) {
								console.log('play note '+note);
							} else {
								console.log('ignore out-of-range note '+note);
							}
							midiout.sendRaw([0x90,note & 0x7f,0x7f]);
						}
					}
				}
				element.on('mousedown', function(ev) {
					//console.log('note-roll mousedown '+ev.button+' at '+ev.offsetX+','+ev.offsetY);
					if (ev.button==0) {
						checkNote(ev);
					}
					ev.preventDefault();
				});
				element.on('mouseup', function(ev) {
					//console.log('note-roll mouseup '+ev.button+' at '+ev.clientX+','+ev.clientY);
					if (ev.button==0) {
						endNote();
					}
					ev.preventDefault();
				});
				element.on('mousemove', function(ev) {
					//console.log('note-roll mousemove '+ev.buttons+' at '+ev.offsetX+','+ev.offsetY);
					if ((ev.buttons & 1)!=0) {
						checkNote(ev);
					}
					ev.preventDefault();
				});

				scope.render = function() {
					// setup variables
					var width = d3.select(element[0]).node().offsetWidth - margin;
					if (width<=0)
						return;					
					// set the height based on the calculations above
					//var height = svg.attr('height');//, height);

					console.log('keyboard.render width='+width+', height='+height);
					// Piano Notes 21 (G0) - 108 (C8) = 7 octaves (49 white) + 3 white = 52
					xscale = d3.scale.linear().domain([NOTES_X[MIN_NOTE],NOTES_X[NOTES_X.length-1]+1]).range([margin, width]);
					yscale = d3.scale.linear().domain([0,1]).range([margin, height-margin]);
										
					var selected = svg.selectAll('rect.key').data(ALL_NOTES_X, function(n) { return n; });
					selected
						.attr('x', function(d) { return xscale(d+(d-Math.floor(d) > 0.1 ? 0.1 : 0)); })
						.attr('width', function(d) { return xscale(d+1-(d-Math.floor(d) > 0.1 ? 0.1 : 0))-xscale(d+(d-Math.floor(d) > 0.1 ? 0.1 : 0))-1; });
					selected.enter().append('rect')
						.classed('key', true)
						//.classed('pressed', true)
						.classed('black-key', function(d) { return d-Math.floor(d)>0.1; })
						.classed('white-key', function(d) { return !(d-Math.floor(d)>0.1); })
						.attr('y',margin).attr('height',function(d) { return yscale(d-Math.floor(d)>0.1 ? 0.7 : 1)-1-yscale(0); })
						.attr('x', function(d) { return xscale(d+(d-Math.floor(d) > 0.1 ? 0.1 : 0)); })
						.attr('width', function(d) { return xscale(d+1-(d-Math.floor(d) > 0.1 ? 0.1 : 0))-xscale(d+(d-Math.floor(d) > 0.1 ? 0.1 : 0))-1; });
					//selected.exit().remove()

				};
			});
		}
	};
}]);
