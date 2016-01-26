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

// Gap marking ending of active stream (seconds)
var streamGap = 2;
// Frequency range of active stream (ratio of first note frequency)
var frequencyRatio = 2.05;
// defaults to polyphonic
var DEFAULT_MONOPHONIC = false;
// defaults to 0.1s gap for monophonic
var DEFAULT_MONOPHONIC_GAP = 0.1;

// http://stackoverflow.com/questions/979975/how-to-get-the-value-from-the-url-parameter
function getQueryParams(qs) {
    qs = qs.split('+').join(' ');
    var params = {},
        tokens,
        re = /[?&]?([^=]+)=([^&]*)/g;
    while (tokens = re.exec(qs)) {
        params[decodeURIComponent(tokens[1])] = decodeURIComponent(tokens[2]);
    }
    return params;
}

function MusicCodeClient( experiencejson ) {
  this.buffers = [];
  this.getMicrophoneInput();
  this.sentHeader = false;
  var self = this;
  var params = getQueryParams(document.location.search);
  this.room = params['r']===undefined ? 'default' : params['r'];
  this.pin = params['p']===undefined ? '' : params['p'];
  console.log('Room = '+this.room+', pin = '+this.pin);
  socket.on('join.error', function(msg) {
    alert('Error starting master: '+msg);
  });
  socket.emit('master',{room:this.room, pin:this.pin});
  if (false)
    // scroll note view even with no new notes - harder to debug 
    setInterval( function() {
      if (self.lastNoteTime!==undefined) {
        var time = (new Date()).getTime();
        self.redraw(self.lastNoteTime+(time-self.lastNoteLocalTime)/1000);
      }
    },1000);
  this.allNotes = [];
  this.notesOn = {};
  this.allGroups = [];
  this.openGroups = [];
  this.markers = [];
  // default code formats - 1 and 2 
  // TODO: prime from experience code prefixes
  this.codeformats = ['no','mrle0/crle4,'];
  socket.on('onoffset', function(note) {
    self.onoffset(note);
  });
  this.experience = experiencejson;
  this.codes = {};
  // prepare marker regexes
  for (var mi in this.experience.markers) {
    var marker = this.experience.markers[mi];
    if (marker.code && marker.code.length>0) {
      var code = marker.code;
      if (marker.codeformat!==undefined) {
        if (this.codeformats.indexOf(marker.codeformat)<0)
          this.codeformats.push(marker.codeformat);
      }
      if (code[code.length-1]=='$') 
        // escape to match exact
        code = code.substring(0, code.length-1)+'\\$$';
      else
        // to end
        code = code+'$';
      this.codes[marker.code] = { regex: new RegExp(code) };
    }
  }
  this.parameters = this.experience.parameters===undefined ? {} : this.experience.parameters;
  this.parameters.streamGap = this.parameters.streamGap===undefined ? streamGap : Number(this.parameters.streamGap);
  this.parameters.frequencyRatio = this.parameters.frequencyRatio===undefined ? frequencyRatio : Number(this.parameters.frequencyRatio);
  this.parameters.monophonic = this.parameters.monophonic===undefined ? DEFAULT_MONOPHONIC : Boolean(this.parameters.monophonic);
  this.parameters.monophonicGap = this.parameters.monophonicGap===undefined ? DEFAULT_MONOPHONIC_GAP : Number(this.parameters.monophonicGap);
  var vampParameters = this.parameters.vampParameters===undefined ? {} : this.parameters.vampParameters;
  // default silvet plugin parameters: live mode, unknown instrument
  vampParameters.mode = vampParameters.mode===undefined ? 0 : vampParameters.mode;
  vampParameters.instrument = vampParameters.instrument===undefined ? 0 : vampParameters.instrument;
  console.log('Send parameters '+JSON.stringify(vampParameters));
  socket.emit( 'parameters', vampParameters );
  //$.ajax({
  //  url:experienceurl,
  //  dataType:"json",
  //  success:function(data) {
  //    self.experience = data;
  //    console.log('loaded experience: '+JSON.stringify(data));
  //  },
  //  error:function(err) {
  //    alert('Error loading experience from '+experienceurl);
  //  }
  //});
  // midi?!
  setupMidi(function(note) { self.onoffset(note); });
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
  var bufs = this.buffers.splice(0, this.buffers.length);

  if ( !this.sentHeader ) {
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
    this.sentHeader = true;

    // discard first buffer?!
    return;
  }
 
  var total = 0;
  for( var i=0; i<bufs.length; i++)
    total += bufs[i].length * 2;

  if (total>0) {
    console.log( 'send '+bufs.length+' buffers = '+total+' bytes' );

//    var dbuffer = new ArrayBuffer(8 + 8 + total);
    var dbuffer = new ArrayBuffer(total);
    var dview = new DataView(dbuffer);

//    /* data chunk identifier */
//    writeString(dview, 0, 'wavl');
//    /* data chunk length */
//    dview.setUint32(4, total + 8, true);
//
//    /* data chunk identifier */
//    writeString(dview, 8 + 0, 'data');
//    /* data chunk length */
//    dview.setUint32(8 + 4, total, true);

//    var offset = 8 + 8;
    var offset = 0;
    for( var i=0; i<bufs.length; i++) {
      floatTo16BitPCM(dview, offset, bufs[i]);
      offset += bufs[i].length * 2;
    }

    var db64 = base64ArrayBuffer( dbuffer );
    socket.emit( 'audioData', db64 );
    //console.log( 'data: '+db64.substring(0,50)+'...' );
  }
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
    self.sendAudio();
  };
  console.log( 'make and connect worker' );
  // connect inputs and outputs here
  input.connect( this.captureNode );
  this.captureNode.connect(audioContext.destination);
};

MusicCodeClient.prototype.onStreamError = function(e) {
  console.error('Error getting microphone input', e);
};

MusicCodeClient.prototype.onoffset = function(note) {
  {
    //var note = notes[ni];
    note.id = ''+note.time+':'+note.note;
    console.log('add note '+note.id);
    if (note.off) {
      if (this.notesOn[note.note]!==undefined) {
        this.notesOn[note.note].endTime = note.time;
        console.log('end note '+note.note+' from '+this.notesOn[note.note].time+' at '+this.notesOn[note.note].endTime);
      }
      delete this.notesOn[note.note];
    } else {
      this.notesOn[note.note] = note;
      this.allNotes.push(note);
    }
  }
  var ni=0;
  for (; ni<this.allNotes.length && this.allNotes[ni].time<note.time-30; ni++)
    ;
  if (ni>0)
    this.allNotes.splice(0,ni);
  ni=0;
  for (; ni<this.markers.length && this.markers[ni].lastTime<note.time-10; ni++)
    ;
  if (ni>0)
    this.markers.splice(0,ni);
  for (var i=0; i<this.allGroups.length; i++) {
    var group = this.allGroups[i];
    // off screen
    if (group.endTime<note.time-30) {
      this.allGroups.splice(i,1);
      i--;
    }
  }

  if (!note.off) {
    if (this.closeGroupsTimeout)
      clearTimeout(this.closeGroupsTimeout);
    this.closeGroupsTimeout = setTimeout(function(){ self.closeGroups(); }, 3000);

    $('#notelist').prepend('<li>'+note.note+' ('+note.freq+'Hz vel='+note.velocity+' t='+note.time+')</li>');
  }

  var handled = false;
  for (var i=0; i<this.openGroups.length; i++) {
    var group = this.openGroups[i];
    // close
    // 2 seconds
    if (group.lastTime<note.time-this.parameters.streamGap) {
      group.closed = true;
      console.log("close group "+group.id);
      this.handleGroup(group);
      this.openGroups.splice(i,1);
      i--;
    } else if (!handled && !note.off) {
      // add to group?!
      if (note.freq >= group.lowFreq && note.freq <= group.highFreq) {
        // candidate for group - check monophonic
        if (this.parameters.monophonic && note.time - group.lastTime < this.parameters.monophonicGap) {
          // discard polyphonic note
          console.log("discard polyphonic note with gap "+(note.time-group.lastTime));
          handled = true;
          note.discarded = true;
        } else {
          group.lastTime = note.time;
          group.notes.push(note);
          group.count++;
          handled = true;
          console.log("add note to group "+group.id);
          this.handleGroup(group);
        }
      }
    }
  }

  if (!note.off && !handled) {
    var group = { id: note.id, notes: [note], closed: false, time: note.time,
        lastTime: note.time, lowFreq: note.freq/this.parameters.frequencyRatio, highFreq: note.freq*this.parameters.frequencyRatio, count: 0 };
    this.openGroups.push(group);
    this.allGroups.push(group);
    console.log("add group "+group.id);
    this.handleGroup(group);
  }
  this.lastNoteTime = note.time;
  this.lastNoteLocalTime = (new Date()).getTime();
  this.redraw(note.time);
}

MusicCodeClient.prototype.groupToCode = function(group, codeformat) {
  var cf = /^(([mn])(o)?(rl(e([0-9A-Za-z]+))?)?)?([^A-Za-z0-9]*)(([tc])(rl(e([0-9]+(\.[0-9]+)?))?)?)?([^A-Za-z0-9]*)$/.exec(codeformat);
  if (cf==null) {
    alert('Invalid codeformat '+codeformat);
    return null;
  }
  var notetype = cf[2];
  var noteoctave = cf[3];
  var noterelative = cf[4];
  var noteequals = cf[6];
  var noteseparator = cf[7];
  var timetype = cf[9];
  var timerelative = cf[10];
  var timeequals = cf[12];
  var timeseparator = cf[14];
  console.log('codeformat '+codeformat+' -> note type='+notetype+', octave='+noteoctave+', relative='+noterelative+', equals='+noteequals+', sep='+noteseparator+'; time type='+timetype+', rel='+timerelative+', equals='+timeequals+', sep='+timeseparator);
  var durationReference = 1;
  if (timeequals!==undefined)
    durationReference = Number(timeequals);

  var prevnote = null;
  var code = '';
  var i;
  var maxLength = 100;
  var t0 = null;
  var f0 = null;
  for (i=1; i<maxLength && group.notes.length-i >= 0; i++) {
    var note = group.notes[group.notes.length-i];
    // time sep
    if (timeseparator!==undefined && code.length>0)
      code = timeseparator+code;
    // time
    if (timetype!==undefined) {
      if (prevnote!=null) {
        if (t0==null) 
          t0 = prevnote.time-note.time;
         
        var duration = Math.round( durationReference* (prevnote.time - note.time) / t0 );
        if (timetype=='c')
          code = String(duration)+code;
       // TODO: m, non-relative
      }
    }
    // note
    if (noteseparator!==undefined && code.length>0)
      code = noteseparator+code;
    if (notetype!==undefined) {
      if (f0==null)
        f0 = note.freq;
      if (noterelative===undefined) {
        if (notetype=='m') {
          // freq to midi var freq = 261.6*Math.pow(2, (note-60)/12.0);
          var midi = Math.round(Math.log2(note.freq/261.6)*12+60);
          code = midi+code;
        }
        else if (notetype=='n') {
          if (noteoctave!==undefined)
            code = note.note+code;
          else {
            var np = /^([A-Ga-g]#?)/.exec(note.note);
            code = np[1]+code;
          }
        } 
      }
      // TODO relative
    }
    prevnote = note;
  }
  if (group.closed)
    code = code+'$';
  console.log('built '+codeformat+': '+code);

  // TODO: generalise...
  if (codeformat=='mrle0/crle4,') {
    // format 2
    if (group.notes.length<2)
	return null;
    var prevnote = group.notes[group.notes.length-1];
    var t0 = prevnote.time-group.notes[group.notes.length-2].time;
    var f0 = prevnote.freq;
    var maxLength = 10;
    var i;
    var code = '0';
    var length = 1;
    var durationReference = 4;
    for (i=2; length < maxLength && group.notes.length-i >= 0; i++) {
      var note = group.notes[group.notes.length-i];
      var duration = Math.round( durationReference* (prevnote.time - note.time) / t0 );
      // skip?!
      if (duration==0)
        continue;
      var interval = Math.round( Math.log( note.freq / f0 ) / Math.log( 2 ) * 12 );
      code = interval+'/'+duration+','+code;
      length++;
      prevnote = note;
    }
    if (group.closed)
      code = code+'$';
    return code;
  } else if (codeformat=='no') {
    // format 1
    var code = '';
    for (var ni in group.notes)
      code += group.notes[ni].note;
    if (group.closed)
      code = code+'$';
    return code;
  } else {
    console.log('Unknown codeformat '+codeformat);
    return code;
  }
}
MusicCodeClient.prototype.redraw = function(time) {
  if (time)
    this.lastRedrawTime = time;
  else
    time = this.lastRedrawTime;

  var width = 300;

  var xscale = d3.scale.log().domain([25,2500]).range([0,300]);
  var vscale = d3.scale.linear().domain([0,127]).range([1,5]);
  var yscale = d3.scale.linear().domain([time-20,time]).range([600,20]);
  var svg = d3.select('svg');
  var DEFAULT_HEIGHT = 10;
  var sel = svg.selectAll('rect.note').data(this.allNotes, function(d) { return d.id; });
  sel.attr('height', function(d) { return d.endTime!==undefined ? yscale(d.time)-yscale(d.endTime) : DEFAULT_HEIGHT; })
      .attr('y', function(d) { return d.endTime!==undefined ? yscale(d.endTime) : yscale(d.time)-DEFAULT_HEIGHT; });
  sel.enter().append('rect')
      .classed('note', true)
      .classed('note-included', function(d) { return d.discarded===undefined || !d.discarded ; })
      .classed('note-discarded', function(d) { return d.discarded!==undefined ? d.discarded : false; })
      .attr('width', function(d) { return 2*vscale(d.velocity); })
      .attr('height', DEFAULT_HEIGHT)
      .attr('y', function(d) { return yscale(d.time)-DEFAULT_HEIGHT; })
      .attr('x', function(d) { return xscale(d.freq)-vscale(d.velocity); });
  sel.exit().remove();

  var groups = svg.selectAll('rect.group').data(this.allGroups, function(d) { return d.id; });
  groups.attr('height', function(d) { return yscale(d.time)-yscale(d.lastTime)+2; })
      .attr('y', function(d) { return yscale(d.lastTime)-1; });
  groups.enter().append('rect')
      .classed('group', true)
      .attr('width', function(d) { return xscale(d.highFreq)-xscale(d.lowFreq); })
      .attr('height', 2)
      .attr('y', function(d) { return yscale(d.lastTime)-1; })
      .attr('x', function(d) { return xscale(d.lowFreq); });
  groups.exit().remove();

  var notenames = svg.selectAll('text.code').data(this.allNotes, function(d) { return d.id; });
  notenames.attr('y', function(d) { return yscale(d.time); });
  notenames.enter().append('text')
      .classed('code', true)
      .text(function(d) { return d.note; })
      .attr('y', function(d) { return yscale(d.time); })
      .attr('x', function(d) { return xscale(d.freq)+10; });
  notenames.exit().remove();

};

MusicCodeClient.prototype.closeGroups = function() {
  for (var i=0; i<this.openGroups.length; i++) {
    var group = this.openGroups[i];
    // close
    group.closed = true;
    console.log("close group "+group.id+' on timeout');
    this.handleGroup(group);
  }
  this.openGroups.splice(0, this.openGroups.length);
  this.redraw();
};

MusicCodeClient.prototype.handleGroup = function(group) {
  for (var ci in this.codeformats) {
    var codeformat = this.codeformats[ci];
    var code = this.groupToCode(group, codeformat);
    console.log("Code "+codeformat+':'+code);
    $('#notelist').prepend('<li>-&gt; '+codeformat+':'+code+'</li>');
    this.handleCode( code, group.lastTime, codeformat );
  }
};

var markerId = 1;
MusicCodeClient.prototype.handleCode = function(code, time, codeformat) {
  if (this.experience && this.experience.markers) {
    for (var i in this.experience.markers) {
      var marker = this.experience.markers[i];
      // test as regexp
      if (marker.code !== undefined && 
          (marker.codeformat===undefined || marker.codeformat==codeformat) &&
          this.codes[marker.code].regex.test( code ) ) {
        //group.marker = marker;
        console.log('Matched '+marker.codeformat+':'+marker.code);
        socket.emit('action',marker);
        if (!marker.showDetail) {
          if (marker.action) {
            console.log('open '+marker.action);
            $('#viewframe').attr('src',marker.action);
          }
        } else {
          this.markers.push({ marker: marker, lastTime: time, id: markerId++ });
        }
      }
    }
  }

  var list = d3.select('#links');
  var markers = list.selectAll('li').data(this.markers, function(d) { return d.id; });
  var lis = markers.enter().append('li')
      .classed('codelink', true);
  lis.append('img')
      .classed('codeimage', true)
      .attr('src',function(d) { return d.marker.image; });
  lis.append('p')      
      .classed('codetitle', true)
      .text(function(d) { return d.marker.title; });
  markers.exit().remove();
};

$(document).on('click', '.codelink', function(ev) {
  var group = d3.select(ev.target).datum();
  if (group.marker && group.marker.action) {
    console.log('open '+group.marker.action);
    $('#viewframe').attr('src',group.marker.action);
  }
});

