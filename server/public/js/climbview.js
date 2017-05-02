var climbApp = angular.module('climbApp', ['ngAnimate', 'muzicodes.socket', 'muzicodes.logging', 'mpm-agent']);
// main player app
climbApp.controller('climbCtrl', ['$scope', '$interval', '$document', '$window', '$http', 'mpmAgent', 
								'$location', '$timeout', 'socket',
                                    function ($scope, $interval, $document, $window, $http, mpmAgent,
                                    		$location, $timeout, socket) {
	console.log('url: '+$location.absUrl());

	var params = $location.search();
	console.log('params', params);
	$scope.test = params['test']!==undefined;
	$scope.room = params['r']===undefined ? 'default' : params['r'];
	var configfile = params['config']===undefined ? '/assets/climbview-config.json' : params['config'];

	console.log('climbCtrl, room='+$scope.room+', configfile='+configfile);
	
	// bad?
	var canvas = $('#canvas');
	console.log('canvas: '+canvas);

	var ASPECT_RATIO = 16/9;
	
	var scene = new THREE.Scene();
	var WIDTH = 1280;
	var HEIGHT = WIDTH/ASPECT_RATIO;
	var camera = new THREE.OrthographicCamera( -WIDTH/2, WIDTH/2, -HEIGHT/2, HEIGHT/2, -20, 20);
	camera.position.z = 0;

	var renderer = new THREE.WebGLRenderer( { 
		canvas: canvas[0], 
		alpha: true, 
		premultipliedAlpha: false,
		antialias: true, //default
		preserveDrawingBuffer: false //default
	});
	
	function onEnded(url) {
		console.log('video ended: '+url);
		for (var i in $scope.layers) {
			var layer = $scope.layers[i];
			var layer_info = layer_infos[i];
			if (layer_info.urls[1]==url && !layer.loop) {
				console.log('end of layer '+i+' video '+url+' -> default');
				layer.url = layer.defaultUrl || null;
				$scope.$apply();
			}
		}
	}
	
	var videos = {};
	var usecount = {};
	var textures = {};
	function load(url) {
		var texture = textures[url];
		if (texture!==undefined)
			return texture;

		usecount[url] = 0;
		
		if (url.indexOf('.mp4')>=0 || url.indexOf('.webm')>=0) {
			var video	= document.createElement('video');
			video.width	= 1280;
			video.height	= 720;
			video.autoplay	= false;
			video.loop	= false;
			video.preload = 'auto';
			video.src = url;
			videos[url] = video;
			$(video).on('ended', function() {
				onEnded(url);
			});
			$(video).on('ended', function() {
				onEnded(url);
			});
			$(video).on('canplay', function() {
				if (usecount[url]>0) {
					console.log('play on canplay '+url);
					video.play();
				}
				else {
					console.log('ignore canplay for currently unused video '+url);
				}
			});
			// create the texture
			var texture	= new THREE.VideoTexture( video );
			texture.minFilter = THREE.LinearFilter;
			texture.magFilter = THREE.LinearFilter;
			texture.format = THREE.RGBAFormat;
			textures[url] = texture;
			console.log('loaded video '+url);
		}
		else {
			// create the texture
			var loader =  new THREE.TextureLoader();
			loader.crossOrigin = '';
			var texture = loader.load( url ) ;
			textures[url] = texture;
			console.log('loaded image '+url);
		}
		return texture;
	}
	function preload(urls) {
		for (var i in urls) {
			var url = urls[i];
			load(url);
		}
	}
	
	var layer_infos = [];
	//var layer_urls = [];
	//var layer_materials = [];
	function buildLayers(layers) {
		for (var i in layers) {
			var layer = layers[i];
			
			if (layer.defaultUrl===undefined)
				layer.defaultUrl = null;
			layer.fadeIn = layer.fadeIn || 0;
			layer.fadeOut = layer.fadeOut || 0;
			
			var layer_info = {};
			console.log('build layer '+i+': '+layer.title);
			var group = new THREE.Group();
			group.position.z = i;
			scene.add(group);

			layer_info.group = group;
			layer_info.materials = [];
			layer_info.urls = [null,null];
			layer_info.meshes = [];
			layer_info.visible = [false,false];
			for (var to=0; to<=1; to++) {
				
				var geometry = new THREE.PlaneBufferGeometry( WIDTH, HEIGHT );
				geometry.rotateZ(Math.PI);
				
				var color = 0xffffff;//[0xff0000,0x00ff00,0xffff00,0x0000ff,0xff00ff,0xffff00,0xffffff][i];
				var material = new THREE.MeshBasicMaterial( { color: color/*0xffffff*/, transparent: true, opacity: 0, side: THREE.DoubleSide } ); //, map: videoTexture } ); //, overdraw: 0.5 
				layer_info.materials[to] = material;
				
				var mesh = new THREE.Mesh( geometry, material );
				mesh.position.z = to/2;

				layer_info.meshes[to] = mesh;
				/*var material = new THREE.MeshBasicMaterial( { color: 0xffffff, transparent: false, opacity: 1, side: THREE.DoubleSide } ); //, map: videoTexture } ); //, overdraw: 0.5 
				var mesh = new THREE.Mesh( geometry, material );
				mesh.position.z = 0.75;
				*/
				//group.add( mesh );
			}
			layer_infos[i] = layer_info;
		}
	}
	
	function swap(layer_info) {
		var tmp;
		tmp = layer_info.materials[0];
		layer_info.materials[0] = layer_info.materials[1];
		layer_info.materials[1] = tmp;
		tmp = layer_info.urls[0];
		layer_info.urls[0] = layer_info.urls[1];
		layer_info.urls[1] = tmp;
		tmp = layer_info.visible[0];
		layer_info.visible[0] =  layer_info.visible[1];
		layer_info.visible[1] = tmp;
		tmp = layer_info.meshes[0];
		layer_info.meshes[0] =  layer_info.meshes[1];
		layer_info.meshes[1] = tmp;
	}
	function stop(url) {
		if (url!==null) {
			var oldvideo = videos[url];
			if (oldvideo!==undefined) {
				usecount[url]--;
				if (usecount[url]<=0) {
					console.log('stop '+url);
					try {
						oldvideo.pause();
					}
					catch(err) {
						console.log('Error pausing video '+url, err);
					}
				}
			}
		}
	};
	$scope.$watch('layers', function(layers) {
		for (var i in layers) {
			var layer = layers[i];
			var layer_info = layer_infos[i];
			
			var url = layer.url || layer.defaultUrl;
			if (layer_info.urls[1] != url) {
				// 1 -> 0
				swap(layer_info);
				// initial state of to
				console.log('start layer '+i+' transition to '+url);
				stop(layer_info.urls[1]);
				layer_info.urls[1] = url;
				if (layer_info.visible[1]) {
					layer_info.group.remove(layer_info.meshes[1]);
					layer_info.visible[1] = false;
				}
				if (layer_info.holdtimer) {
					$timeout.cancel(layer_info.holdtimer);
					layer_info.holdtimer = null;
				}
				if (layer.holdTime || layer.holdTime===0) {
					var delay = 1000*(layer.fadeIn+layer.holdTime);
					console.log('set holdtime fade out in '+delay);
					layer_info.holdtimer = $timeout(function() {
						console.log('clearing layer '+i+' after holdtime');
						layer.url = null;
					}, delay);
				}
				if (url==null) {
					layer_info.materials[1].opacity = 0;
					
				} else {
					if (!layer_info.visible[1]) {
						layer_info.group.add(layer_info.meshes[1]);
						layer_info.visible[1] = true;
					}

					layer_info.materials[1].map = load(url);
					layer_info.materials[1].needsUpdate = true;
					if (layer.fadeIn>0 || layer.fadeOut>0) 
						layer_info.materials[1].opacity = 0;
					else
						layer_info.materials[1].opacity = 1;
					
					var video = videos[url];
					if (video!==undefined) {
						if (usecount[url]==0) {
							console.log('play '+url+' loop='+layer.loop+' (readyState='+video.readyState+')');
							if (!layer.loop)
								video.currentTime = 0;
							video.autoplay = true;
							if (video.readyState==4)
								video.play();
							else
								console.log('cannot play immediate: state = '+video.readyState);
						}
						video.loop = !!layer.loop;
						usecount[url]++;
					}
				}
			}
		}
	}, true);

	socket.on('join.warning', function(msg) {
		  alert('Warning joining session: '+msg);
		});

	function handleAction(action) {
		if (action.post)
			return;
		for (var i in $scope.layers) {
			var layer = $scope.layers[i];
			if (layer.channel==action.channel ) {
				url = action.url;
				if (!url)
					url = null;
				console.log('action: set layer '+i+' url to '+url);
				layer.url = url;
			}
		}
	}
	
	$scope.layers = [];
	$scope.preload = [];
	$http.get(configfile).then(function(res) {
		var data = res.data;
		console.log('read config', data);
		mpmAgent.configure({viewconfig:{url:configfile,ok:true,loaded:(new Date().toISOString()),
			etag:res.headers('etag'),lastModified:res.headers('last-modified'),contentLength:res.headers('content-length')}});
		// TOODO
		$scope.preload = data.preload;
		//loaded(data);
		preload($scope.preload);
		buildLayers(data.layers);
		$scope.layers = data.layers;
		
		socket.on('action', function(marker) {
			console.log('new marker: '+marker);
			//var time = (new Date()).getTime();
			for (var ai in marker.actions) {
				var action = marker.actions[ai];
				handleAction(action);
			}
		});
		
		var channels = [];
		for (var i in $scope.layers) {
			var layer = $scope.layers[i];
			channels.push(layer.channel);
		}
		console.log('Slave: Room = '+$scope.room+', channels='+channels);
		socket.emit('slave',{room:$scope.room,channel:channels});

	}, function(error) {
		if (error.status==404) {
			mpmAgent.configure({viewconfig:{url:configfile,ok:false,error:'File not found'}});
			alert('Sorry, that config file doesn\'t seem to exist ('+configfile+')');
		} else {
			mpmAgent.configure({viewconfig:{url:configfile,ok:false,error:'Error loading config file '+$error.status}});
			alert('Sorry, could load that config file: '+error.statusText+' ('+configfile+')');
		}
	});

	function onResize() {
		var width = window.innerWidth;
		//var height = window.innerHeight;
		var height = width / ASPECT_RATIO;
		canvas.height(height);
		
		console.log('resize width='+width+', height='+height);
		renderer.setSize(width, height);
	}
	
	$($window).on('resize' ,function() {
		console.log('resize');
		onResize();
	});
	onResize();
	

	// ANIMATE
	var last = (new Date()).getTime();
	function animate() {
		window.requestAnimationFrame(animate);
		//console.log('animate');
		var now = (new Date()).getTime();
		for (var i in $scope.layers) {
			var layer = $scope.layers[i];
			var layer_info = layer_infos[i];
			var elapsed = (now-last)*0.001;
			if (elapsed<0)
				elapsed = 0;
			var fadingOut = false;
			//console.log('layer '+i+': from '+layer_info.urls[0]+' ('+layer_info.materials[0].opacity+' - '+layer.fadeOut+'/s) to '+layer_info.urls[1]+' ('+layer_info.materials[1].opacity+' + '+layer.fadeIn+'/s)');
			if (layer_info.urls[0]!==null) {
				var opacity = layer_info.materials[0].opacity;
				if (opacity>0) {
					if (layer.fadeOut>0) {
						opacity = opacity-elapsed/layer.fadeOut;
						if (opacity<0)
							opacity = 0;
						layer_info.materials[0].opacity = opacity;						
						fadingOut = true;
					} else {
						layer_info.materials[0].opacity = opacity = 0;					
					}
				}
				if (opacity<=0) {
					// gone
					stop(layer_info.urls[0]);
					layer_info.urls[0] = null;
					if (layer_info.visible[0]) {
						layer_info.group.remove(layer_info.meshes[0]);
						layer_info.visible[0] = false;
					}
				}
			}
			if (layer_info.urls[1]!==null) {
				var opacity = layer_info.materials[1].opacity;
				if (opacity<1 && (!fadingOut || layer.crossfade)) {
					if (layer.fadeIn>0) {
						opacity += elapsed/layer.fadeIn;
						if (opacity>1)
							opacity = 1;
						layer_info.materials[1].opacity = opacity;						
					} else {
						layer_info.materials[1].opacity = opacity = 1;					
					}
				}
			}			
		}
		last = now;
		// render
		renderer.render(scene, camera);
	}
	animate();
}]);
