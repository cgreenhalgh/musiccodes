var climbApp = angular.module('climbApp', ['ngAnimate']);
// main player app
climbApp.controller('climbCtrl', ['$scope', '$interval',
                                    function ($scope, $interval) {
	console.log('climbCtrl');
	$scope.muzicode = false;
	$scope.visible = false;
	$scope.sunny = false;
	$scope.rainy = false;
	$scope.raining = false;
	$scope.snowy = false;
	$scope.snowing = false;
	$scope.clouds = [
		{x: 100, y: 50},
		{x: 200, y: 70},
		{x: 50, y: 80}
	];
	$scope.raindrops = [
		{x: -50 },
		{x: 0},
		{x: 30}
	];
	$scope.$watch('rainy', function(newValue,oldValue) {
		if (newValue) {
			// delay raining
			$interval(function() { $scope.raining = $scope.rainy; }, 2000);
		} else {
			$scope.raining = false;
		}
	})
	$scope.$watch('snowy', function(newValue,oldValue) {
		if (newValue) {
			// delay snowing
			$interval(function() { $scope.snowing = $scope.snowy; }, 2000);
		} else {
			$scope.snowing = false;
		}
	})
	var delays = {};
	$scope.getDelay = function(x) {
		if (delays[x]===undefined) {
			delays[x] = Math.random();
		}
		return delays[x];	
	}
}]);

climbApp.animation('.moving-image', ['$animateCss', '$timeout', function($animateCss, $timeout) {
	console.log('animation moving-image');

	return {
		addClass: function(element, className, doneFn) {
			var moving = element.hasClass('moving-image');
			console.log('initially moving = '+moving);
			var info = element.data('moving');
			console.log('moving-image addClass '+className+' to element '+element.attr('id')+' with info '+JSON.stringify(info));
			console.log('l transform = '+element.prop('transform'));
			//var svgDoc = element[0].getSVGDocument();
			//console.log('svgDoc = '+svgDoc);
			var transform = element[0].getCTM();
			// scale x, scale y, offset x, offset y
			console.log('transform = '+transform.a+' '+transform.d+' '+transform.e+' '+transform.f);
			var maxmove = 0.04;
			var minsize = 0.6;
			var imagesize = 100;
			var maketarget = function(info) {
				info.x0 = info.x;
				info.y0 = info.y;
				info.sz0 = info.sz;
				info.tx = Math.random()*(1-minsize)*imagesize;
				info.ty = Math.random()*(1-minsize)*imagesize;
				var max = Math.max(info.tx, info.ty);
				info.tsz = minsize*imagesize+Math.random()*(max-minsize*imagesize);
				info.alpha = 0;
				var mpix = Math.max(Math.abs(info.tx-info.x0), Math.abs(info.ty-info.y0), 
						Math.abs(info.tx+info.tsz-(info.x0+info.sz0)), 
						Math.abs(info.ty+info.tsz-(info.y0+info.sz0)))
				if (mpix > maxmove)
					info.dalpha = maxmove/mpix;
				else
					info.dalpha = 1;
				console.log('mpix='+mpix+' -> dalpha='+info.dalpha);
			};
			
			if (info===undefined) {
				info = {xs:1, ys:1, x:0, y: 0, 
						sz:imagesize, 
						moving:true};
			} else {
				info.moving = true;
			}
			maketarget(info);
			element.data('moving', info);
			// can't seem to animate on the SVG element
			/*var anim = $animateCss(element, {
				from: { 'ng-attr-transform': "matrix(1 0 0 1 0 0)",
					opacity: 1 },
				to: { 'ng-attr-transform': "matrix(2 0 0 2 0 0)",
					opacity: 2},
				duration: 3
			});
			anim.start().then(function() { console.log('done'); doneFn(); });
			*/
			var DELAY = 100;
			var LONG_DELAY = 100;
			var update = function() {
				var delay = DELAY;
				var info = element.data('moving');
				if (!info.moving) {
					console.log('not moving -> done');
					doneFn();
					return;
				}
				info.alpha = info.alpha+info.dalpha;
				if (info.alpha>=1) {
					info.x = info.tx;
					info.y = info.ty;
					info.sz = info.tsz;
					maketarget(info);
					delay = LONG_DELAY;
				} else {
					info.x = info.x0+info.alpha*(info.tx-info.x0);
					info.y = info.y0+info.alpha*(info.ty-info.y0);
					info.sz = info.sz0+info.alpha*(info.tsz-info.sz0);
				}
				element.data('moving', info);
				element.attr('transform', 'matrix('+(100/info.sz)+' 0 0 '+(100/info.sz)+' '+(-info.x)+' '+(-info.y)+')');
				$timeout(update, delay);
			};
			$timeout(update, DELAY);
			// do some cool animation and call the doneFn
		},
		removeClass: function(element, className, doneFn) {
			console.log('moving-image removeClass '+className);
			var info = element.data('moving');
			info.moving = false;
			element.data('moving', info);
			doneFn();
			// do some cool animation and call the doneFn
		},
		setClass: function(element, addedClass, removedClass, doneFn) {
			console.log('moving-image setClass '+addedClass+' / '+removedClass);
			doneFn();
			// do some cool animation and call the doneFn
		}
	}
}]);