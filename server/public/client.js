/* see webaudioapi.com/samples/microphone/microphone-sample.js
 * see also https://github.com/mattdiamond/Recorderjs/blob/master/recorder.js
 */

navigator.getUserMedia = (navigator.getUserMedia ||
                          navigator.webkitGetUserMedia ||
                          navigator.mozGetUserMedia ||
                          navigator.msGetUserMedia);

window.AudioContext = window.AudioContext ||
                      window.webkitAudioContext;

var audioContext = new AudioContext();

function MusicCodeClient() {
  this.buffers = [];
  this.getMicrophoneInput();
  this.sentHeader = false;
  var self = this;
  setInterval( function() {
      self.sendAudio();
    },200);
}

function floatTo16BitPCM(output, offset, input){
  for (var i = 0; i < input.length; i++, offset+=2){
    var s = Math.max(-1, Math.min(1, input[i]));
    output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
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

MusicCodeClient.prototype.sendAudio = function() {
  if ( !this.sentHeader ) {
    console.log( 'send header, sample rate='+audioContext.sampleRate+'Hz' );
    // TODO
    var buffer = new ArrayBuffer(36);
    var view = new DataView(buffer);

    /* RIFF identifier */
    writeString(view, 0, 'RIFF');
    /* RIFF chunk length - vv long */
    view.setUint32(4, 0x7ffffffe, true);
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

    var b64 = base64ArrayBuffer( buffer );
    console.log( 'header: '+b64 );
    socket.emit( 'audioHeader', b64 );
    this.sentHeader = true;
  }
  console.log( 'send '+self.buffers.length+' buffers' );
  self.buffers = [];
};

MusicCodeClient.prototype.getMicrophoneInput = function() {
  navigator.getUserMedia({audio:true},
                         this.onStream.bind(this),
                         this.onStreamError.bind(this));
};

var count = 0;
MusicCodeClient.prototype.onStream = function(stream) {
  var input = audioContext.createMediaStreamSource(stream);
  // createAudioWorker not yet available!
  // doesn't work with 0 outputs, even if we don't need it
  this.captureNode = (audioContext.createScriptProcessor ||
                      audioContext.createJavaScriptNode).call(audioContext,
                            /*bufferLen*/4096, /*numChannelsIn*/1, 
                            /*numChannelsOut*/1);
  self = this;
  this.captureNode.onaudioprocess = function(e){
    //console.log( 'onaudioprocess '+e.inputBuffer.numberOfChannels+' channels, '+
    //            e.inputBuffer.length+' samples @'+e.inputBuffer.sampleRate+'Hz' );
    self.buffers.push( e.inputBuffer.getChannelData(0) );
  };
  console.log( 'make and connect worker' );
  // connect inputs and outputs here
  input.connect( this.captureNode );
  this.captureNode.connect(audioContext.destination);
};

MusicCodeClient.prototype.onStreamError = function(e) {
  console.error('Error getting microphone input', e);
};


