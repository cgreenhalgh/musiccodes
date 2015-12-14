var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.get('/', function(req, res){
  console.log('get /');
  res.sendFile(__dirname + '/public/index.html');
});
app.get('/*.(js|json)', function(req, res){
  var url = require('url').parse(req.url);
  console.log('get ' + req.url + ' -> ' + url.pathname);
  res.sendFile(__dirname + '/public' + url.pathname);
});

var STATE_WAITING_FOR_PARAMETERS = 1;
var STATE_WAITING_FOR_HEADER = 2;
var STATE_RUNNING = 3;
var STATE_ERROR = 4;

function Client(socket) {
  this.socket = socket;
  console.log('New client');
  var self = this;
  // test write file spawn('dd', ['of=tmp.wav']
  // Note: this requires my modified version of the vamp plugin host,
  // https://github.com/cgreenhalgh/vamp-live
  // Here, i'm using the silvet note transcription plugin.
  // Parameter mode = 0 means fast and low quality
  // Output 2 means not on/offset
  // e.g.
/*
 0.720000000: 174.614 6 F3
 0.860000000: 174.614 0 F3 off
 0.780000000: 123.471 4 B2
 0.800000000: 293.665 5 D4
 0.860000000: 1174.66 3 D6
 0.980000000: 1174.66 0 D6 off
 1.200000000: 293.665 0 D4 off
*/
  this.state = STATE_WAITING_FOR_PARAMETERS;
  socket.on('disconnect', function(){
    self.disconnect();
  });
  socket.on('parameters', function(msg) {
    self.parameters(msg);
  });
  socket.on('audioHeader', function(msg) {
	    self.header(msg);
	  });
  socket.on('audioData', function(msg) {
  self.data(msg);
  });
}

Client.prototype.parameters = function(parameters) {
  var self = this;
  this.state = STATE_WAITING_FOR_HEADER;
  var args = ['silvet:silvet','-','2'];
  for (var pname in parameters) {
	  var pvalue = parameters[pname];
	  args.push('-p');
	  args.push(String(pname));
	  args.push(String(pvalue));
  }
  console.log('Got parameters, running with '+args);
  // instrument 0 various, 2 guitar, 7 flute, 13 wind ensemble
  this.process = require('child_process').spawn('vamp-live-host',
    args, {
  });
  this.process.on('close', function(code) {
    console.log( 'Client process exited with code '+code );
    self.process = null;
  });
  this.process.stdin.on('error', function() {});
  this.process.stdout.on('data', function(data) {
    //console.log( 'Client stdout: '+data);
    self.processSilvetOnoffset(data);    
  });
  this.process.stdout.on('end', function() {});
  this.process.stdout.on('error', function() {});
  this.process.stderr.on('data', function(data) {
    console.log( 'Client stderr: '+data);
  });
  this.process.stderr.on('end', function() {});
  this.process.stderr.on('error', function() {});
}
Client.prototype.disconnect = function() {
  console.log('Client disconnected');
  try {
    if (this.process!==null) 
      this.process.kill();
    this.process = null;
  } catch (err) {
    console.log('Error killing process: ', err);
  }
};
Client.prototype.header = function(msg) {
  console.log('Header: '+msg);
  if (this.state==STATE_WAITING_FOR_HEADER)
	  this.state = STATE_RUNNING;
  if (this.process!==null) {
    try {
      this.process.stdin.write(msg, 'base64');
    } catch (err) {
      console.log('Error writing data to plugin', err);
    }
  }
};
Client.prototype.data = function(msg) {
  if (this.state!=STATE_RUNNING) {
    console.log('Discard data - state '+this.state);
    return;
  }
  console.log('Data: '+msg.substring(0,50)+'...');
  if (this.process!==null) {
    try {
      this.process.stdin.write(msg, 'base64');
    //this.process.stdin.end();
    //this.process = null;
    } catch (err) {
      console.log('Error writing data to plugin', err);
    }
  }
};
Client.prototype.processSilvetOnoffset = function(data) {
  // e.g.  0.720000000: 174.614 6 F3
  var values = [];
  new String(data).replace(/\s*(\d+(\.\d+)?):\s*(\d+(\.\d+)?)\s+(\d+)\s(\S+)\s*(\S+)?/,
       function(m, time, t2, freq, f2, velocity, note, off) {
           values.push({time:Number(time),freq:Number(freq),velocity:Number(velocity),
                        note:note,off:(off=='off')});
       });
  for (var ix in values) {
    console.log('Get note '+JSON.stringify(values[ix]));
    this.socket.emit('onoffset', values[ix]);
  }     
};

io.on('connection', function(socket){
  var client = new Client(socket);
});

http.listen(3000, function(){
  console.log('listening on *:3000');
});
