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

	var geometry;
	var movingGeometry = new THREE.PlaneBufferGeometry( SIZE/2, SIZE/2 );
	movingGeometry.rotateZ(Math.PI);
	var material = new THREE.MeshBasicMaterial( { color: 0xffffff, transparent: false, side: THREE.DoubleSide, map: videoTexture /*, overdraw: 0.5 */} );
	
	var uv = movingGeometry.getAttribute('uv');
	console.log('uv = '+JSON.stringify(uv));
	// {"0":0,"1":1,"2":1,"3":1,"4":0,"5":0,"6":1,"7":0}
	//uv.array["0"] = 0.5;
	var uv0 = [0,1,1,1,0,0,1,0];
	uv.dynamic = true;
	
	//var material = new THREE.MeshBasicMaterial( {color: 0xffff00, side: THREE.DoubleSide} );
	var plane = new THREE.Mesh( movingGeometry, material );
	//plane.translateX(50);
	//plane.translateY(-50);
	plane.translateZ(0);
	backgrounds.add( plane );
	
	var loader = new THREE.TextureLoader();
	/*
	 loader.load( '/content/baseCamp.jpg', function ( texture ) {
		console.log('loaded texture');
		// presumes 4:3
		var geometry = new THREE.PlaneGeometry( SIZE*4/3/2, SIZE/2 );
		geometry.rotateZ(Math.PI);
		var material = new THREE.MeshBasicMaterial( { color: 0xffffff, side: THREE.DoubleSide, map: texture } ); //, overdraw: 0.5
		var mesh = new THREE.Mesh( geometry, material );
		//mesh.position.z = 2;//higher is closer to camera/near clip
		//backgrounds.remove(plane);
		backgrounds.add( mesh );
	} );
	*/
	loader.load( '/assets/marker-icon.png', function ( texture ) {
		console.log('loaded texture 2');
		// presumes 4:3
		var geometry = new THREE.PlaneGeometry( SIZE/4, SIZE/4 );
		geometry.rotateZ(Math.PI);
		var material = new THREE.MeshBasicMaterial( { color: 0xffffff, transparent: true, side: THREE.DoubleSide, map: texture /*, overdraw: 0.5 */} );
		var mesh = new THREE.Mesh( geometry, material );
		mesh.position.z = 2;//higher is closer to camera/near clip
		mesh.position.x = SIZE/3;
		//backgrounds.remove(plane);
		backgrounds.add( mesh );
	} );

	// video?!
	// create the video element
	//var video;
	video = document.createElement('video');
	video.width	= 320;
	video.height	= 240;
	video.autoplay	= true;
	video.loop	= true;
	video.preload = 'auto';
	//video.src	= '/content/Stones_Rain.mp4';
	video.src	= '/content/Stones_Snow.mp4';

	// create the texture
	var videoTexture	= new THREE.VideoTexture( video );
	videoTexture.minFilter = THREE.LinearFilter;
	videoTexture.magFilter = THREE.LinearFilter;
	videoTexture.format = THREE.RGBFormat;

	geometry = new THREE.PlaneGeometry( SIZE/2, SIZE/2 );
	geometry.rotateZ(Math.PI);
	videoMaterial = new THREE.MeshBasicMaterial( { color: 0xffffff, transparent: true, side: THREE.DoubleSide, alphaMap: videoTexture /*, overdraw: 0.5 */} );
	plane = new THREE.Mesh( geometry, videoMaterial );
	//plane.translateX(50);
	//plane.translateY(-50);
	plane.position.z = 14;
	backgrounds.add( plane );

	
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
	
	var theta = 0;
	function animate() {
		window.requestAnimationFrame(animate);
		//console.log('animate');
		//backgrounds.position.x = Math.sin(theta);
		theta += Math.PI/100;

		/*if( video.readyState === video.HAVE_ENOUGH_DATA ) {	
			//console.log('update video');
			videoTexture.needsUpdate	= true;	
		}*/
		if ($scope.snowy) {
			videoMaterial.opacity = 1-Math.cos(theta);
			videoMaterial.needsUpdate = true;
		}
		
		// animate texture coordinates on background image
		if ($scope.rainy) {
			var x = Math.sin(theta)*0.25+0.25;
			for (var i=0; i<8; i+=2) {
				uv.array[i] = x+0.5*uv0[i];
			}
			uv.needsUpdate = true;
		}		
		// render
		renderer.render(scene, camera);
	}
	animate();
}]);
