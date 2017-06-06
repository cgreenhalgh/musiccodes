/* mpm browser agent */
var mod = angular.module('mpm-agent', []);

mod.value('DEFAULT_MPM_SERVER', 'http://localhost:3003');
mod.value('DEFAULT_MPM_SERVER_PORT', '3003');

//socket.io wrapper, exposes on() and emit()
mod.factory('mpmAgentSocket', ['$rootScope', function ($rootScope) {
	return {
		connect: function(url) {
			console.log('connect to MPM server on '+url);
			var socket = io.connect(url);
			// TODO: failure/disconnect?
			return {
				on: function (eventName, callback) {
					socket.on(eventName, function () {  
						var args = arguments;
						$rootScope.$apply(function () {
							callback.apply(socket, args);
						});
					});
				},
				emit: function (eventName, data, callback) {
					socket.emit(eventName, data, function () {
						var args = arguments;
						$rootScope.$apply(function () {
							if (callback) {
								callback.apply(socket, args);
							}
						});
					})
				}
			};
		}
	}
}]);

mod.factory('mpmAgent', ['mpmAgentSocket','DEFAULT_MPM_SERVER_PORT','$timeout','$location','mpmGetIPAddresses',
					function(mpmAgentSocket,  DEFAULT_MPM_SERVER_PORT,  $timeout,  $location,  mpmGetIPAddresses) {
	var MPM_REPORT_INTERVAL = 10;
	var MPM_REPORT_JITTER = 4;
	var inited = false;
	var sockets = {};
	var info = {};
	var config = {};
	var iri = 'urn:uuid:'+uuid.v1();
	var testPoints = {};
	var testPointSetters = {};
	var testPointValues = {};
	var testPointMonitors = {};
	var testPointMonitorCount = {};
	console.log('MPM Agent running: '+iri);
	var datetime =  (new Date()).toISOString();
	if (navigator!==undefined) {
		info.browserInfo = {
			appCodeName: navigator.appCodeName,
			appName: navigator.appName,
			appVersion: navigator.appVersion,
			language: navigator.language,
			product: navigator.product,
			platform: navigator.platform,
			userAgent: navigator.userAgent,
			datetime: datetime
		};
	}
	info.ips = [];
	mpmGetIPAddresses(function(ip) {
		if (info.ips.indexOf(ip)<0) {
			info.ips.push(ip);
			report();
		}
	});
	function connect(url) {
		url = url || 'http://'+$location.host()+':'+DEFAULT_MPM_SERVER_PORT;
		if (sockets[url]===undefined) {
			console.log('agent connect to mpm server '+url);
			var socket = sockets[url] = mpmAgentSocket.connect(url);
			socket.on('connect', function(err) {
				console.log('agent socket connect');
				socket.mpmIsConnected = true;
				report(socket);
				// monitor changes??
			});
			socket.on('disconnect', function(err) {
				console.log('agent socket disconnect');
				socket.mpmIsConnected = false;
			});
			// testPoints
			socket.on('readTestPoint', function(req) {
				if (iri==req.iri) {
					console.log('agent readTestPoint '+req.iri+' '+req.id+' ('+req.request+')');
					socket.emit('readTestPointValue', {iri:iri, id: req.id, value: testPointValues[req.id], request: req.request});
				}
			});
			socket.on('monitorTestPoint', function(req) {
				if (iri==req.iri) {
					console.log('agent monitorTestPoint '+req.iri+' '+req.id+' ('+req.request+'): '+req.monitor);
					var monitors = testPointMonitors[req.id];
					if (monitors===undefined) {
						testPointMonitors[req.id] = monitors = {};
					}
					monitors[req.request] = req.monitor;
					testPointMonitorCount[req.id] = 0;
					for (var m in monitors) {
						var monitor = monitors[m];
						if (monitor)
							testPointMonitorCount[req.id]++;
					}
					console.log('-> monitor count = '+testPointMonitorCount[req.id]++);
					if (req.monitor)
						socket.emit('monitorTestPointValue', {iri:iri, id:req.id, value:testPointValues[req.id]});
				}
			});
			socket.on('setTestPoint', function(req) {
				if (iri==req.iri) {
					console.log('agent setTestPoint '+req.iri+' '+req.id+' ('+req.request+') = '+req.value);
					if (testPointSetters[req.id]) {
						try {
							testPointSetters[req.id](req.id, req.value);
						} catch (err) {
							console.log('error setting test point '+req.id+' to '+JSON.stringify(req.value)+': '+err.message, err);
						}
					}
				}
			});
		}
	}	
	connect();
	function getDelay() {
		return (MPM_REPORT_INTERVAL+(Math.random()-0.5)*MPM_REPORT_JITTER)*1000;
	}
	function makeReport() {
		var datetime =  (new Date()).toISOString();
		// introspect...
		info.url = $location.absUrl();
		return { '@id': iri, '@type':'Process', processType: 'BrowserView', title: document.title, 
			info: info, datetime: datetime, expire: 2*MPM_REPORT_INTERVAL,
			config: config, testPoints: testPoints };
	}
	var timeout = null;
	function report(socket) {
		console.log('mpmAgent report '+(socket!==undefined ? 'specific' : 'global'));
		
		var report = makeReport();

		if (socket===undefined) {
			emitAll('mpm-report', report);
			if (timeout!==null)
				$timeout.cancel(timeout);
			timeout = $timeout(reportTimer, getDelay());
		} else {
			if (socket.mpmIsConnected) {
				socket.emit('mpm-report', report);
			} else {
				console.log('warning: mpm-agent cannot send report - unconnected');
			}
		}
	};
	function reportTimer() {
		timeout = null;
		report();
	}
	report();
	function emitAll(name, msg) {
		for (var url in sockets) {
			var socket = sockets[url];
			if (socket.mpmIsConnected) {
				socket.emit(name, msg);
			} else {
				console.log('warning: mpm-agent cannot send '+name+' to '+url+' - unconnected');
			}
		}
	}
	function setTestPointValues(values) {
		for (var pi in values) {
			var value = values[pi];
			testPointValues[pi] = value;
			if (testPointMonitorCount[pi] && testPointMonitorCount[pi]>0) {
				emitAll('monitorTestPointValue', {iri:iri, id:pi, value:testPointValues[pi]});
			}
		}
	};
	return {
		getIri: function() {
			return iri;
		},
		init: function(moreinfo) {
			console.log('mpmAgent init', moreinfo);
			for (var k in moreinfo) {
				info[k] = moreinfo[k];
			}
			report();
		},
		connect: connect,
		configure: function(values) {
			for (var k in values) {
				config[k] = values[k];
			}
			report();
		},
		addTestPoints: function(points) {
			var values = {};
			for (var pi in points) {
				var point = points[pi];
				testPointSetters[pi] = point.setter;
				testPoints[pi] = {name: point.name, write: point.write, read: point.read, monitor:point.monitor};
				console.log('added test point '+pi+': '+JSON.stringify(testPoints[pi]));
				values[pi] = point.value;
			}
			report();
			setTestPointValues(values);
		},
		setTestPointValues: setTestPointValues
	};
}]);

mod.factory('mpmGetIPAddresses', ['$window', '$q', '$rootScope', function($window, $q, $rootScope) {
	return function(callback) { 
		// get ip address
		// see http://stackoverflow.com/questions/20194722/can-you-get-a-users-local-lan-ip-address-via-javascript
		// Local only - no stun / public
		$window.RTCPeerConnection = $window.RTCPeerConnection || $window.mozRTCPeerConnection || $window.webkitRTCPeerConnection;   //compatibility for firefox and chrome
		var pc = new RTCPeerConnection({iceServers:[]}), noop = function(){};
		pc.createDataChannel("");    //create a bogus data channel
		pc.createOffer(pc.setLocalDescription.bind(pc), noop);    // create offer and set local description
		pc.onicecandidate = function(ice){  //listen for candidate events
			if(!ice || !ice.candidate || !ice.candidate.candidate)  return;
			console.log('got candidate '+ice.candidate.candidate);
			// IPv4 only for now; IPv6: |[a-f0-9]{1,4}(:[a-f0-9]{1,4}){7}
			var myIP = /([0-9]{1,3}(\.[0-9]{1,3}){3})/.exec(ice.candidate.candidate);
			if (myIP!==null) {
				console.log('getIPAddresses my IP: ', myIP[1]);
				//pc.onicecandidate = noop;
				try {
					$rootScope.$apply(function() {callback(myIP[1]);});
				}
				catch (err) {
					console.log('Error doing getIPAddresses callback', err);
				}
			}
		};
	};
}]);
