var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.get('/', function(req, res){
  console.log('get /');
  res.sendFile(__dirname + '/public/index.html');
});
app.get('/*.js', function(req, res){
  var url = require('url').parse(req.url);
  console.log('get ' + req.url + ' -> ' + url.pathname);
  res.sendFile(__dirname + '/public' + url.pathname);
});

function Client(socket) {
  this.socket = socket;
  console.log('New client');
  this.process = require('child_process').spawn('dd', ['of=tmp.wav'], {

  });
  this.process.on('close', function(code) {
    console.log( 'Client process exited with code '+code );
    this.process = null;
  });
  this.process.stdout.on('data', function(data) {
    console.log( 'Client stdout: '+data);
  });
  this.process.stderr.on('data', function(data) {
    console.log( 'Client stderr: '+data);
  });

  var self = this;
  socket.on('disconnect', function(){
    self.disconnect();
  });
  socket.on('audioHeader', function(msg) {
    self.header(msg);
  });
  socket.on('audioData', function(msg) {
    self.data(msg);
  });
}
Client.prototype.disconnect = function() {
  console.log('Client disconnected');
  try {
    if (this.process!==null) 
      this.process.kill();
  } catch (err) {
    console.log('Error killing process: ', err);
  }
};
Client.prototype.header = function(msg) {
  console.log('Header: '+msg);
  if (this.process!==null) {
    var data = new Buffer(msg, 'base64');
    this.process.stdin.write(data);
  }
};
Client.prototype.data = function(msg) {
  console.log('Data...');
  if (this.process!==null) {
    var data = new Buffer(msg, 'base64');
    this.process.stdin.write(data);
  }
};

io.on('connection', function(socket){
  var client = new Client(socket);
});

http.listen(3000, function(){
  console.log('listening on *:3000');
});
