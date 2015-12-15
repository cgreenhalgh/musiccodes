/* midi.js - midi test... */

var midi = null;  // global MIDIAccess object
var midiInputPort = null;
var midiOutputPort = null;

function onMIDISuccess( midiAccess ) {
  console.log( "MIDI ready!" );
  midi = midiAccess;  // store in the global (in real usage, would probably keep in an object instance)

  listInputsAndOutputs( midiAccess );
}

function onMIDIFailure(msg) {
  console.log( "Failed to get MIDI access - " + msg );
}

// request top-level midi access (non-exclusive)
navigator.requestMIDIAccess().then( onMIDISuccess, onMIDIFailure );

function listInputsAndOutputs( midiAccess ) {
  midiAccess.inputs.forEach( function( input ) {
    console.log( "Input port [type:'" + input.type + "'] id:'" + input.id +
      "' manufacturer:'" + input.manufacturer + "' name:'" + input.name +
      "' version:'" + input.version + "'" );
    $('#midiinput').append('<option value="'+input.id+'">'+input.name+'</option>')
  });
  midiAccess.outputs.forEach( function( output ) {
    console.log( "Output port [type:'" + output.type + "'] id:'" + output.id +
      "' manufacturer:'" + output.manufacturer + "' name:'" + output.name +
      "' version:'" + output.version + "'" );
    $('#midioutput').append('<option value="'+output.id+'">'+output.name+'</option>')
  });
}

$('#midiinput').change( function( ev ) {
  var id = $(this).val();
  console.log('Select input '+id);	
  if (midiInputPort!==null) {
	  midiInputPort.close();
	  midiInputPort = null;
  }
  midiInputPort = midi.inputs.get(id);
  // monitor input...
  midiInputPort.onmidimessage = function(msg) {
	  var str = "MIDI message received at timestamp " + event.timestamp + "[" + event.data.length + " bytes]: ";
	  for (var i=0; i<event.data.length; i++) {
	    str += "0x" + event.data[i].toString(16) + " ";
	  }
	  console.log( str );
  };
});
$('#midioutput').change( function( ev ) {
	  var id = $(this).val();
	  console.log('Select output '+id);	
	  // send a test note on / off
	  var noteOnMessage = [0x90, 60, 0x7f];    // note on, middle C, full velocity
	  var output = midi.outputs.get(id);
	  output.send( noteOnMessage );  //omitting the timestamp means send immediately.
	  output.send( [0x80, 60, 0x40], window.performance.now() + 1000.0 ); // Inlined array creation- note off, middle C,  
	                                                                      // release velocity = 64, timestamp = now + 1000ms.

});
