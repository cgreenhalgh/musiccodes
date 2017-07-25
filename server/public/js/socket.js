// Audio stuff - get audio, send to server, get notes back

var socket = angular.module('muzicodes.socket', []);

// from editor.js
//getIPAddress().then(...)
socket.factory('getIPAddress', ['$window', '$q', function($window, $q) {
	var deferred = $q.defer();
	var promise = deferred.promise;
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
			console.log('my IP: ', myIP[1]);
			pc.onicecandidate = noop;
			deferred.resolve(myIP[1]);
		}
	};
	return function() { return promise; }

}]);
socket.factory('getIPAddresses', ['$window', '$q', '$rootScope', function($window, $q, $rootScope) {
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

// socket.io wrapper, exposes on() and emit()
socket.factory('socket', ['$rootScope', '$location', function ($rootScope, $location) {
	var params = $location.search();
	var socketio = params['sio']===undefined ? $location.protocol()+'://'+$location.host()+':'+$location.port() : params['sio'];
	var path = params['siop']===undefined ? '/socket.io' : params['siop'];
	console.log('socket.io: url='+socketio+' and path='+path);
	var socket = io.connect(socketio, { path: path });
//	var socket = io.connect();
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
}]);
