// osc - via node server
var module = angular.module('muzicodes.osc', ['muzicodes.logging','muzicodes.socket']);

audio.value('OSC_UDP_PREFIX', 'osc.udp:');
audio.value('OSC_TCP_PREFIX', 'osc.tcp:');

//wrapper for audio capture/stream to note extraction
audio.factory('oscout', ['socket', 'getIPAddress', function(socket, getIPAddress) {
	var ip = getIPAddress();
	socket.on('osc.error', function(msg) {
		console.log('osc.error: '+msg);
		alert('OSC send error: '+msg);
	});
	return {
		send: function(url) {
			var ix = url.indexOf('//localhost');
			if (ix<0)
				ix = url.indexOf('//127.0.0.1');
			if (ix<0) {
				console.log('osc.send '+url);
				socket.emit('osc.send', url);
			}
			else {
				// rewrite IP due to NAT / VM
				ip.then(function(ip) {
					var nurl = url.substring(0,ix)+'//'+ip+url.substring(ix+'//localhost'.length);
					console.log('rewrite osc url -> '+nurl);
					socket.emit('osc.send', nurl);					
				}, function() {
					console.log('error getting IP to rewrite osc url; using unchanged: '+url);
					alert('error getting IP to rewrite osc url; using unchanged: '+url);
					socket.emit('osc.send', url);					
				});
			}
		}
	};
}]);
