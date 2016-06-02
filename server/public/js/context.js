var mod = angular.module('muzicodes.context', []);

mod.directive('musContext', ['$interval', function($interval) {
	return {
		restrict: 'E',
		scope: {
			context: '='
		},
		templateUrl: '/partials/mus-context.html',
		link: function(scope, element, attrs) {
			scope.tempoShowActive = false;
			scope.tempoShowHighlight = false;
			scope.timer = null;
			scope.$on('$destroy', function() {
				console.log('destroy context view');
				if (scope.timer) {
					$interval.cancel(scope.timer);
				}
			});
			scope.$watch('context.tempo', function() {
				if (scope.tempoShowActive) {
					scope.tempoShow();
					scope.tempoShow();
				}
			});
			scope.tempoShow = function() {
				console.log('tempo show');
				if (scope.tempoShowActive) {
					$interval.cancel(scope.timer);
					scope.tempoShowActive = false;
					scope.tempoShowHighlight = false;
				} else {
					scope.tempoShowActive = true;
					scope.tempoShowHighlight = true;
					var tempo = scope.context.tempo;
					if (!tempo)
						tempo = 60;
					scope.timer = $interval(function() {
						scope.tempoShowHighlight = !scope.tempoShowHighlight;
					}, 1000*60/tempo/2);
				}
			}
			scope.lastInput = 0;
			scope.prevInput = 0;
			scope.tempoInput = function() {
				var now = (new Date()).getTime();
				if (scope.lastInput) {
					var elapsed = (now-scope.lastInput)*0.001;
					if (elapsed < 3) {
						var tempo = Math.floor(60/elapsed*10+0.5)/10;
						if (scope.prevInput && scope.context.tempo && Math.abs(tempo-scope.context.tempo)/tempo<0.2) {
							// tend towards
							scope.context.tempo = Math.floor(10*(0.8*scope.context.tempo+0.2*tempo)+0.5)/10;
						}
						else
							scope.context.tempo = tempo;
						console.log('tempo input :'+tempo+' -> '+scope.context.tempo);
					}
					else
						scope.lastInput = 0;
				}
				scope.prevInput = scope.lastInput;
				scope.lastInput = now;
			}
		}
	};
}]);
