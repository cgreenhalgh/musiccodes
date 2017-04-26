/* mpm browser agent */
var mod = angular.module('mpm-agent', []);

mod.value('DEFAULT_MPM_SERVER', 'http://localhost:3003');

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

mod.factory('mpmAgent', ['mpmAgentSocket','DEFAULT_MPM_SERVER','$timeout','$location','mpmGetIPAddresses',
					function(mpmAgentSocket,  DEFAULT_MPM_SERVER,  $timeout,  $location,  mpmGetIPAddresses) {
	var MPM_REPORT_INTERVAL = 10;
	var MPM_REPORT_JITTER = 4;
	var inited = false;
	var sockets = {};
	var info = {};
	var config = {};
	var iri = 'urn:uuid:'+uuid.v1();
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
		url = url || DEFAULT_MPM_SERVER;
		if (sockets[url]===undefined) {
			var socket = sockets[url] = mpmAgentSocket.connect(url);
			socket.on('connect', function(err) {
				console.log('agent socket connect');
				socket.mpmIsConnected = true;
				report(socket);
			});
			socket.on('disconnect', function(err) {
				console.log('agent socket disconnect');
				socket.mpmIsConnected = false;
			});		
		}
	}	
	connect(DEFAULT_MPM_SERVER);
	function getDelay() {
		return (MPM_REPORT_INTERVAL+(Math.random()-0.5)*MPM_REPORT_JITTER)*1000;
	}
	function makeReport() {
		var datetime =  (new Date()).toISOString();
		// introspect...
		info.url = $location.absUrl();
		return { '@id': iri, '@type':'Process', processType: 'BrowserView', title: document.title, 
			info: info, datetime: datetime, expire: 2*MPM_REPORT_INTERVAL,
			config: config };
	}
	var timeout = null;
	function report(socket) {
		console.log('mpmAgent report '+(socket!==undefined ? 'specific' : 'global'));
		
		var report = makeReport();

		if (socket===undefined) {
			for (var url in sockets) {
				var socket = sockets[url];
				if (socket.mpmIsConnected) {
					socket.emit('mpm-report', report);
				} else {
					console.log('warning: mpm-agent cannot send report - unconnected');
				}
			}
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
	return {
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
		}
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
