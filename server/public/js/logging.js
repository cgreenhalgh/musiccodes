var logging = angular.module('muzicodes.logging', ['muzicodes.socket']);

// socket.io wrapper, exposes on() and emit()
logging.factory('logger', ['socket', function (socket) {
	return {
		log: function (event, info) {
			socket.emit('log', {event: event, info: info});
		}
	};
}]);
