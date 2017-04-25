var climbApp = angular.module('climbApp', ['ngAnimate']);
// main player app
climbApp.controller('climbCtrl', ['$scope', '$interval', '$document', '$window',
                                    function ($scope, $interval, $document, $window) {
	console.log('climbCtrl');
	
	// bad?
	var canvas = $('#canvas');
	console.log('canvas: '+canvas);
	
	$scope.muzicode = false;
	$scope.visible = false;
	$scope.sunny = false;
	$scope.rainy = false;
	$scope.raining = false;
	$scope.snowy = false;
	$scope.snowing = false;
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
	
	var scene = new THREE.Scene();
	var SIZE = 100;
	var camera = new THREE.OrthographicCamera( -SIZE*2/3, SIZE*2/3, -SIZE/2, SIZE/2, -SIZE/2, SIZE/2 );
	camera.position.z = 0;

	var renderer = new THREE.WebGLRenderer( { 
		canvas: canvas[0], 
		alpha: true, 
		premultipliedAlpha: false,
		antialias: true, //default
		preserveDrawingBuffer: false //default
	});

	var backgrounds = new THREE.Group();
	scene.add( backgrounds );
	
	// BACKGROUND
	// - as video
	// create the video element
	var video	= document.createElement('video');
	video.width	= 320;
	video.height	= 240;
	video.autoplay	= true;
	video.loop	= true;
	video.preload = 'auto';
	video.src	= '/content/Stones_Background2.mp4';


	// create the texture
	var videoTexture	= new THREE.VideoTexture( video );
	videoTexture.minFilter = THREE.LinearFilter;
	videoTexture.magFilter = THREE.LinearFilter;
	videoTexture.format = THREE.RGBFormat;

	var geometry = new THREE.PlaneBufferGeometry( SIZE, SIZE );
	geometry.rotateZ(Math.PI);
	var material = new THREE.MeshBasicMaterial( { color: 0xffffff, transparent: false, side: THREE.DoubleSide, map: videoTexture /*, overdraw: 0.5 */} );

	var videoBackground = new THREE.Mesh( geometry, material );
	backgrounds.add( videoBackground );
	
	// IMAGE background
	var movingGeometry = new THREE.PlaneBufferGeometry( SIZE, SIZE );
	movingGeometry.rotateZ(Math.PI);
	// ready to animate offset by uv mapping
	var uv = movingGeometry.getAttribute('uv');
	console.log('uv = '+JSON.stringify(uv));
	// {"0":0,"1":1,"2":1,"3":1,"4":0,"5":0,"6":1,"7":0}
	//uv.array["0"] = 0.5;
	var uv0 = [0,1,1,1,0,0,1,0];
	uv.dynamic = true;
	
	var imageBackground;
	
	var loader = new THREE.TextureLoader();

	loader.load( '/content/baseCamp.jpg', function ( texture ) {
		console.log('loaded texture');
		// presumes 4:3
		var material = new THREE.MeshBasicMaterial( { color: 0xffffff, side: THREE.DoubleSide, map: texture } ); //, overdraw: 0.5
		imageBackground = new THREE.Mesh( movingGeometry, material );
		//mesh.position.z = 2;//higher is closer to camera/near clip
		//backgrounds.remove(plane);
		if ($scope.visible)
			backgrounds.add( imageBackground );
	} );

	$scope.$watch('visible', function(visible) {
		console.log('visible = '+visible);
		if (visible) {
			backgrounds.remove( videoBackground );
			if (imageBackground)
				backgrounds.add( imageBackground );
		}
		else {
			backgrounds.add( videoBackground );
			if (imageBackground)
				backgrounds.remove( imageBackground );			
		}
	});
	/*	loader.load( '/assets/marker-icon.png', function ( texture ) {
		console.log('loaded texture 2');
		var geometry = new THREE.PlaneGeometry( SIZE/4, SIZE/4 );
		geometry.rotateZ(Math.PI);
		var material = new THREE.MeshBasicMaterial( { color: 0xffffff, transparent: true, side: THREE.DoubleSide, map: texture } ); //, overdraw: 0.5 
		var mesh = new THREE.Mesh( geometry, material );
		mesh.position.z = 2;//higher is closer to camera/near clip
		mesh.position.x = SIZE/3;
		//backgrounds.remove(plane);
		backgrounds.add( mesh );
	} );
*/
	// NOTES
	var notegroup = new THREE.Group();
	scene.add( notegroup );
	var geometry;	
	
	var notes = [];
	var t0 = (new Date()).getTime();
	var NOTE_T1 = 1500;
	loader.load( '/assets/marker-icon.png', function(texture) {
		console.log('adding notes');
		var geometry = new THREE.PlaneGeometry( 4, 6 );
		geometry.rotateZ(Math.PI);
		for (var o=0; o<8; o++) {
			for (var n=0; n<12; n++) {
				var material = new THREE.MeshBasicMaterial( { color: 0xffffff, transparent: true, side: THREE.DoubleSide, map: texture /*, overdraw: 0.5 */} );
				var mesh = new THREE.Mesh( geometry, material );
				mesh.position.z = 2;//higher is closer to camera/near clip
				mesh.position.y = o*10-40;
				mesh.position.x = n*8-40;
				notes.push({mesh: mesh, material: material, t0: t0, visible: false});
				//backgrounds.remove(plane);
				//notegroup.add( mesh );
			}
		}
	} );
	
	function makeWeather(url, color, z) {
		// VIDEO - Snow overlay
		// create the video element
		//var video;
		video = document.createElement('video');
		video.width	= 320;
		video.height	= 240;
		video.autoplay	= true;
		video.loop	= true;
		video.preload = 'auto';
		video.src	= url;
		
		// create the texture
		var videoTexture	= new THREE.VideoTexture( video );
		videoTexture.minFilter = THREE.LinearFilter;
		videoTexture.magFilter = THREE.LinearFilter;
		videoTexture.format = THREE.RGBFormat;
	
		geometry = new THREE.PlaneGeometry( SIZE, SIZE );
		geometry.rotateZ(Math.PI);
		material = new THREE.MeshBasicMaterial( { color: color, opacity: 0, transparent: true, side: THREE.DoubleSide, alphaMap: videoTexture /*, overdraw: 0.5 */} );
		plane = new THREE.Mesh( geometry, material );
		plane.position.z = z;
		return {mesh:plane, material: material, visible:false};
	}
	var snow = makeWeather('/content/Stones_Snow.mp4', 0xffffff, 14);
	var rain = makeWeather('/content/Stones_Rain.mp4', 0x808080, 15);
	
	function onResize() {
		var width = window.innerWidth;
		// fixed 4:3
		//var height = window.innerHeight;
		var height = width*3/4;
		canvas.height(height);
		
		console.log('resize width='+width+', height='+height);
		renderer.setSize(width, height);
	}
	
	$($window).on('resize' ,function() {
		console.log('resize');
		onResize();
	});
	onResize();
	
	// animate background image movement
	var maxmove = 0.04;
	var minsize = 0.6;
	var imagesize = 100;
	var info = {};
	var maketarget = function(info) {
		info.x0 = info.x;
		info.y0 = info.y;
		info.sz0 = info.sz;
		info.tx = Math.random()*(1-minsize)*imagesize;
		info.ty = Math.random()*(1-minsize)*imagesize;
		var max = Math.max(info.tx, info.ty);
		info.tsz = minsize*imagesize+Math.random()*(imagesize-max-minsize*imagesize);
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
				sz:imagesize};
	}
	maketarget(info);
		
	// ANIMATE
	var theta = 0;
	var last = (new Date()).getTime();
	function animate() {
		window.requestAnimationFrame(animate);
		//console.log('animate');
		//backgrounds.position.x = Math.sin(theta);
		theta += Math.PI/100;

		/*if( video.readyState === video.HAVE_ENOUGH_DATA ) {	
			//console.log('update video');
			videoTexture.needsUpdate	= true;	
		}*/
		function checkWeather(weather, show) {
			if (show) {
				if (!weather.visible) {
					weather.material.opacity = 0;
					backgrounds.add(weather.mesh);
					weather.visible = true;
				}
				if (weather.material.opacity<1) {
					weather.material.opacity += 0.02;
					weather.material.needsUpdate = true;
				}
			}
			else {
				if (weather.visible) {
					weather.material.opacity -= 0.02;
					weather.material.needsUpdate = true;
					if (weather.material.opacity <= 0 ) {
						weather.material.opacity = 0;
						weather.visible = false;
						backgrounds.remove(weather.mesh);
					}
				}
			}
		}		
		checkWeather(snow, $scope.snowy);
		checkWeather(rain, $scope.rainy);
		// animate texture coordinates on background image
		if ($scope.visible) {
			info.alpha = info.alpha+info.dalpha;
			if (info.alpha>=1) {
				info.x = info.tx;
				info.y = info.ty;
				info.sz = info.tsz;
				maketarget(info);
			} else {
				info.x = info.x0+info.alpha*(info.tx-info.x0);
				info.y = info.y0+info.alpha*(info.ty-info.y0);
				info.sz = info.sz0+info.alpha*(info.tsz-info.sz0);
			}

			//var x = Math.sin(theta)*0.25+0.25;
			for (var i=0; i<8; i+=2) {
				uv.array[i] = ((info.x/imagesize)+(info.sz/imagesize)*uv0[i])*3/4+1/8;
				uv.array[i+1] = (info.y/imagesize)+(info.sz/imagesize)*uv0[i+1];
			}
			uv.needsUpdate = true;
		}		
		// animate notes
		var now = (new Date()).getTime();
		var elapsed = (now-last)*0.001;
		for (var i=0; i<notes.length; i++) {
			var note = notes[i];
			if (!note.visible && $scope.muzicode) {
				if (Math.random() < elapsed / (NOTE_T1 / 1000) * (10 / notes.length) ) {
					note.visible = true;
					note.t0 = last;
					notegroup.add(note.mesh);
					//console.log('add note '+i);
				}
			}
			if (note.visible) {
				var dt = (now-note.t0)/NOTE_T1;
				if (dt>=1) {
					//console.log('remove note '+i);
					note.visible = false;
					notegroup.remove(note.mesh);
				} else {
					note.material.opacity = 1-dt;
					note.mesh.scale.x = note.mesh.scale.y = note.mesh.scale.z = 3 * dt ;
				}
			}
		}
		last = now;
		// render
		renderer.render(scene, camera);
	}
	animate();
}]);
