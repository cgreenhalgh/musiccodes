// Audio stuff - get audio, send to server, get notes back

var audio = angular.module('muzicodes.audio', ['muzicodes.socket']);

// wrapper for audio capture/stream to note extraction
audio.factory('audionotes', ['socket', '$rootScope', function(socket, $rootScope) {
	var STATE_SEND_PARAMETERS = 0;
	var STATE_SEND_HEADER = 1;
	var STATE_SEND_DATA = 2;

	// internal state
	var buffers = [];
	var mute = true;
	var audioWorking = false;
	var captureNode = null;
	var audioContext = null;
	var onNote = null;
	var onLevel = null;
	var state = STATE_SEND_PARAMETERS;
	
	// create audio context
	window.AudioContext = window.AudioContext ||
		window.webkitAudioContext;

	try {
		audioContext = new AudioContext();
	}
	catch (err) {
		console.log('Error creating AudioContext: '+err.message);
	}

	// audio handling support function 
	function floatTo16BitPCM(output, offset, input){
		for (var i = 0; i < input.length; i++, offset+=2){
			var s = Math.max(-1, Math.min(1, input[i]));
			output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
		}
	}
	function floatMax(input) {
		var v = 0;
		for (var i = 0; i < input.length; i++){
			var val = input[i];
			if (val<0)
				val = -val;
			if (val>v)
				v = val;
		}
		return val;
	}
	function writeString(view, offset, string){
		for (var i = 0; i < string.length; i++){
			view.setUint8(offset + i, string.charCodeAt(i));
		}
	}
	/* see https://gist.github.com/jonleighton/958841 */
	// Converts an ArrayBuffer directly to base64, without any intermediate 'convert to string then
	// use window.btoa' step. According to my tests, this appears to be a faster approach:
	// http://jsperf.com/encoding-xhr-image-data/5

	function base64ArrayBuffer(arrayBuffer) {
		var base64    = ''
			var encodings = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

				var bytes         = new Uint8Array(arrayBuffer)
		var byteLength    = bytes.byteLength
		var byteRemainder = byteLength % 3
		var mainLength    = byteLength - byteRemainder

		var a, b, c, d
		var chunk

		// Main loop deals with bytes in chunks of 3
		for (var i = 0; i < mainLength; i = i + 3) {
			// Combine the three bytes into a single integer
			chunk = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2]

			// Use bitmasks to extract 6-bit segments from the triplet
			a = (chunk & 16515072) >> 18 // 16515072 = (2^6 - 1) << 18
			b = (chunk & 258048)   >> 12 // 258048   = (2^6 - 1) << 12
			c = (chunk & 4032)     >>  6 // 4032     = (2^6 - 1) << 6
			d = chunk & 63               // 63       = 2^6 - 1

			// Convert the raw binary segments to the appropriate ASCII encoding
			base64 += encodings[a] + encodings[b] + encodings[c] + encodings[d]
		}

		// Deal with the remaining bytes and padding
		if (byteRemainder == 1) {
			chunk = bytes[mainLength]

			a = (chunk & 252) >> 2 // 252 = (2^6 - 1) << 2

			// Set the 4 least significant bits to zero
			b = (chunk & 3)   << 4 // 3   = 2^2 - 1

			base64 += encodings[a] + encodings[b] + '=='
		} else if (byteRemainder == 2) {
			chunk = (bytes[mainLength] << 8) | bytes[mainLength + 1]

			a = (chunk & 64512) >> 10 // 64512 = (2^6 - 1) << 10
			b = (chunk & 1008)  >>  4 // 1008  = (2^6 - 1) << 4

			// Set the 2 least significant bits to zero
			c = (chunk & 15)    <<  2 // 15    = 2^4 - 1

			base64 += encodings[a] + encodings[b] + encodings[c] + '='
		}

		return base64
	}

	// actually send audio (unless muted)
	var sendAudio = function() {
		var bufs = buffers.splice(0, buffers.length);
		if (mute)
			return;

		if ( state==STATE_SEND_HEADER ) {
			console.log( 'send header, sample rate='+audioContext.sampleRate+'Hz' );
			var buffer = new ArrayBuffer(36 + 8);
			var view = new DataView(buffer);

			/* RIFF identifier */
			writeString(view, 0, 'RIFF');
			/* RIFF chunk length - vv long, or perhaps zero (at least for audacity) */
			/*view.setUint32(4, 0x7ffffffe, true);*/
			view.setUint32(4, 0, true);
			/* RIFF type */
			writeString(view, 8, 'WAVE');
			/* format chunk identifier */
			writeString(view, 12, 'fmt ');
			/* format chunk length */
			view.setUint32(16, 16, true);
			/* sample format (raw) */
			view.setUint16(20, 1, true);
			/* channel count */
			view.setUint16(22, /*numChannels*/1, true);
			/* sample rate */
			view.setUint32(24, audioContext.sampleRate, true);
			/* byte rate (sample rate * block align) */
			view.setUint32(28, audioContext.sampleRate * 2, true);
			/* block align (channel count * bytes per sample) */
			view.setUint16(32, /*numChannels*/1 * 2, true);
			/* bits per sample */
			view.setUint16(34, 16, true);

			/* data... */
			writeString(view, 36+0, 'data');
			/* data chunk length - vv long (not zero, at least for audacity) */
			/*view.setUint32(4, 0x7ffffffe, true);*/
			view.setUint32(36+4, 0x7ffffffe, true);

			var b64 = base64ArrayBuffer( buffer );
			console.log( 'header: '+b64 );
			socket.emit( 'audioHeader', b64 );
			state = STATE_SEND_DATA;

			// discard first buffer?!
			return;
		} else if (state!==STATE_SEND_DATA) {
			// discard?!
			return;
		}

		var total = 0;
		for( var i=0; i<bufs.length; i++)
			total += bufs[i].length * 2;

		if (total>0) {
			console.log( 'send '+bufs.length+' buffers = '+total+' bytes' );

			var dbuffer = new ArrayBuffer(total);
			var dview = new DataView(dbuffer);

			// just sending one long stream of audio data
			var offset = 0;
			for( var i=0; i<bufs.length; i++) {
				floatTo16BitPCM(dview, offset, bufs[i]);
				offset += bufs[i].length * 2;
			}

			var db64 = base64ArrayBuffer( dbuffer );
			socket.emit( 'audioData', db64 );
		}
	};

	// audio input handling callbacks
	var onStream = function(stream) {
		var input = audioContext.createMediaStreamSource(stream);
		// createAudioWorker not yet available!
		// doesn't work with 0 outputs, even if we don't need it
		captureNode = (audioContext.createScriptProcessor ||
				audioContext.createJavaScriptNode).call(audioContext,
						/*bufferLen*/4096, /*numChannelsIn*/1, 
						/*numChannelsOut*/1);
		captureNode.onaudioprocess = function(e){
			//console.log( 'onaudioprocess '+e.inputBuffer.numberOfChannels+' channels, '+
			//            e.inputBuffer.length+' samples @'+e.inputBuffer.sampleRate+'Hz' );
			var buf = e.inputBuffer.getChannelData(0);
			buffers.push( buf );
			var maxval = floatMax(buf);
			sendAudio();
			if (onLevel) {
				$rootScope.$apply(function() {
					try {
						onLevel(maxval);
					} catch (err) {
						console.log('Error calling onLevel('+maxval+'): '+err.message, err);
					}
				});
			}
		};
		console.log( 'make and connect audio worker' );
		// connect inputs and outputs here
		input.connect( captureNode );
		captureNode.connect(audioContext.destination);
		audioWorking = true;
	};

	var onStreamError = function(e) {
		console.error('Error getting microphone input', e);
		alert('Sorry, could not get audio input');
	};

	navigator.getUserMedia = (navigator.getUserMedia ||
            navigator.webkitGetUserMedia ||
            navigator.mozGetUserMedia ||
            navigator.msGetUserMedia);
	
	// get audio input
	if (typeof navigator.getUserMedia == 'function') {
		navigator.getUserMedia({audio:true}, onStream, onStreamError);
	} else if (navigator.mediaDevices!==undefined && typeof navigator.mediaDevices.getUserMedia == 'function') {
		var p = navigator.mediaDevices.getUserMedia({audio:true});
		p.then(onStream);
		p.catch(onStreamError);
	} else {
		alert('Sorry, could not find audio input support on this browser');
	}

	var sendStop = function() {
		console.log('audio stop');
		mute = true;
		socket.emit('stopAudio', {});
		state = STATE_SEND_PARAMETERS;
	};
	var setParameters = function (parameters) {
		console.log('audio setParameters '+JSON.stringify(parameters));
		if (state!==STATE_SEND_PARAMETERS)
			sendStop();
		if (parameters.mode===undefined || parameters.mode===null)
			// live mode
			parameters.mode = 0;
		socket.emit('parameters', parameters);
		state = STATE_SEND_HEADER;
	};
	
	// success callback
	socket.on('onoffset', function(note) {
		// data: {time:Number(time),freq:Number(freq),velocity:Number(velocity),note:note,off:(off=='off')}
		if (onNote && !mute && state==STATE_SEND_DATA)
			onNote(note);
		else
			console.log('ignore note; mute='+mute+', state='+state);
	});
	
	return {
		onNote: function (callback) {
			onNote = callback;
		},
		setParameters: setParameters,
		stop: sendStop,
		start: function (parameters) {
			setParameters(parameters);
			mute = false;
			console.log('audio start');
		},
		onLevel: function (callback) {
			onLevel = callback;
		}
	};
}]);

audio.directive('inputmeter', ['audionotes',
                                   function(audionotes) {
	return {
		restrict: 'E',
		scope: {
		},
		template: '<div class="inputmeter"><div class="inputmeter-needle" ng-style="{width: level+\'%\', \'background-color\': color}"></div></div>',
		link: function($scope, $element, $attrs) {
			$scope.level = 0;
			audionotes.onLevel(function(level) {
				$scope.level = Math.max(0, 100+100/3*Math.log(level)/Math.LN10);
				if (level>0.5)
					$scope.color = 'orange';
				else if (level>0.25)
					$scope.color = 'orange';
				else
					$scope.color = 'green';
				//console.log('audio level '+level+' -> '+$scope.level);
			});
		}
	};
}]);