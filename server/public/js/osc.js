// osc - via node server
var module = angular.module('muzicodes.osc', ['muzicodes.logging','muzicodes.socket']);

audio.value('OSC_UDP_PREFIX', 'osc.udp:');
audio.value('OSC_TCP_PREFIX', 'osc.tcp:');

//wrapper for audio capture/stream to note extraction
audio.factory('oscout', ['socket', function(socket) {
	return {
		send: function(url) {
			socket.emit('oscSend', url);
		}
	};
}]);
