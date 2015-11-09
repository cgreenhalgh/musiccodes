/* see webaudioapi.com/samples/microphone/microphone-sample.js
 */

navigator.getUserMedia = (navigator.getUserMedia ||
                          navigator.webkitGetUserMedia ||
                          navigator.mozGetUserMedia ||
                          navigator.msGetUserMedia);

function MusicCodeClient() {
  this.getMicrophoneInput();
}

MusicCodeClient.prototype.getMicrophoneInput = function() {
  navigator.getUserMedia({audio:true},
                         this.onStream.bind(this),
                         this.onStreamError.bind(this));
};

MusicCodeClient.prototype.onStream = function(stream) {
  var input = context.createMediaStreamSource(stream);
  // ...
};

MusicCodeClient.prototype.onStreamError = function(e) {
  console.error('Error getting microphone input', e);
};


