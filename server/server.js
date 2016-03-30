var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var fs = require('fs');

app.get('/', function(req, res){
  console.log('get /');
  res.sendFile(__dirname + '/public/index.html');
});
function returnPublicFile(req, res) {
  var url = require('url').parse(req.url);
  console.log('get ' + req.url + ' -> ' + url.pathname);
  res.sendFile(__dirname + '/public' + url.pathname);
};
app.get('/vendor/*', returnPublicFile);
app.get('/css/*.css', returnPublicFile);
app.get('/js/*', returnPublicFile);
app.get('/partials/*', returnPublicFile);
app.get('/edit/*', function(req, res) {
  console.log('get '+req.url+' -> editor.html');
  res.sendFile(__dirname+'/public/editor.html');
});
var EXPERIENCES_DIR = __dirname+'/experiences/';
app.get('/experiences/', function(req,res) {
	console.log('get experiences');
	fs.readdir(EXPERIENCES_DIR, function(err,fnames) {
		if (err) {
			res.status(500).send('Could not read experiences directory ('+err+')');
			return;
		}
		var resp = {};
		for (var ni in fnames) {
			var fname = fnames[ni];
			var m = /^(.*\.json)(.([0-9]+))?$/.exec(fname);
			if (m!==null) {
				var name = m[1];
				var time = m[3];
				var experience = resp[name];
				if (experience===undefined)
					resp[name] = experience = {versions:[]};
				if (time===undefined) {
					try {
						var info = fs.statSync(EXPERIENCES_DIR+name);
						experience.lastmodified = info.mtime.getTime();
					} catch (err) {
						console.log('Error stat '+name+': '+err);
					}
				} else {
					experience.versions.push(time);
				}
			}
		}
		res.set('Content-Type', 'application/json').send(JSON.stringify(resp));
	});
});
app.get('/experiences/:experience', function(req,res) {
	console.log('get experience '+req.params.experience);
	res.sendFile(EXPERIENCES_DIR+req.params.experience);
});
app.get('/experiences/:experience/:version', function(req,res) {
	console.log('get experience '+req.params.experience+' version '+req.params.version);
	res.sendFile(EXPERIENCES_DIR+req.params.experience+'.'+req.params.version);
});
app.use(require('body-parser').json());
app.use(require('body-parser').urlencoded({ extended: true })); 

app.put('/experiences/:experience', function(req,res) {
	console.log('put experience '+req.params.experience);
	// rename old version using last modified?
	var filename = EXPERIENCES_DIR+req.params.experience;
	if (fs.existsSync(filename)) {
		try {
			var info = fs.statSync(filename);
			var newfilename = filename+'.'+info.mtime.getTime();
			console.log('Move '+filename+' to '+newfilename);
			try {
				fs.renameSync(filename, newfilename);
			} catch (err) {
				console.log('Error moving '+filename+' to '+newfilename+': '+err);
				res.status(500).send('Error moving '+filename+' to '+newfilename+': '+err);
				return;
			}
		} catch (err) {
			console.log('Error stat (on save) '+filename+': '+err);
			res.status(500).send('Error stat (on save) '+filename+': '+err);
			return;
		}
	}
	console.log('write '+filename);
	fs.writeFile(filename, JSON.stringify(req.body), function(err) {
		if (err) {
			console.log('error writing '+filename+': '+err);
			res.status(500).send('Error writing file: '+err);
			return;
		}
		res.sendStatus(200);
	});
});
app.get('/*.(js|json|html)', returnPublicFile);

function escapeHTML(html) {
    return String(html)
    .replace(/&(?!\w+;)/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
function run_process(cmd, args, cwd, timeout, cont) {
	console.log('spawn '+cmd+' '+args.join(' '));
	var output = [];
	var process = require('child_process').spawn(cmd,
			args, {
		cwd: cwd
	});
	process.stdin.on('error', function() {});
	process.stdout.on('data', function(data) {
		//console.log( 'Client stdout: '+data);
		output.push(data);
	});
	process.stdout.on('end', function() {});
	process.stdout.on('error', function() {});
	process.stderr.on('data', function(data) {
		output.push('Error: '+data);
	});
	process.stderr.on('end', function() {});
	process.stderr.on('error', function() {});
	process.on('close', function(code) {
		console.log('process '+cmd+' exited ('+code+')');
		cont(code, output.join(''));
	});
	console.log('done spawn');
}
var DEFAULT_TIMEOUT = 30000;

function send_status(res, status, out) {
	// commit: git log --pretty=format:%H -1
	run_process('git',['status'], __dirname+'/..',DEFAULT_TIMEOUT,function(code,output) {
		console.log('git status -> '+code+': '+output);
		out += '<h1>Musiccode Update</h1>';
		if (code!==0) {
			status = 500;
			out += '<p>Git status ERROR:</p><pre>'+escapeHTML(output)+'</pre>';
		} else {
			var m = new RegExp('^(On branch |HEAD detached at )(\\S+)').exec(output);
			if (m!==null) {
				out += '<p>Git at '+m[2]+'</p>';
			} else {
				out += '<p>Git status:</p><pre>'+escapeHTML(output)+'</pre>';
			}
		}
		run_process('git',['log','--pretty=format:%H','-1'], __dirname+'/..',DEFAULT_TIMEOUT,function(code,output) {
			if (code!==0) {
				status = 500;
				out += '<p>Git log ERROR:</p><pre>'+escapeHTML(output)+'</pre>';
			} else {
				out += '<p>Commit '+output+'</p>';
			}
			out += '<hr><form action="/update" method="POST"><label>Version: <input type="text" name="tag"><input type="submit" value="Update"></form>'
			res.status(status);
			res.send(out);
		});
	});
	console.log('waiting...');
};
app.get('/update', function(req,res) {
	console.log('/update ...');
	send_status(res,200,'');
});
app.post('/update', function(req,res) {
	//console.log(req.body);
	var tag = req.body.tag;
	console.log('update to '+tag);
	if (tag===undefined || tag=="") {
		send_status(res, 200, '<p>No tag specified</p>');
		return;
	}
	var out = '<p>tag: '+escapeHTML(tag)+' specified</p>';
	run_process('git',['fetch'],__dirname+'/..',DEFAULT_TIMEOUT,function(code,output) {
		console.log('git fetch -> '+code+': '+output);
		if (code!==0) {
			out += '<p>Warning: git fetch failed:</p><pre>'+escapeHTML(output)+'</pre>';
		} else {
			out += '<p>git fetch ok</p>';
		}
		run_process('git',['checkout',tag],__dirname+'/..',DEFAULT_TIMEOUT,function(code,output) {
			console.log('git checkout '+tag+' -> '+code+': '+output);
			var status = 200;
			if (code!==0) {
				out += '<p>Warning: git checkout '+tag+' failed:</p><pre>'+escapeHTML(output)+'</pre>';
				status = 500;
			} else {
				out += '<p>git checkout '+tag+' ok</p>';
			}
			setTimeout(function() {
				console.log('Restart...');
				var child = require('child_process').spawn('sudo',['service','musiccodes','restart'],
						{detached:true, stdio:['ignore','ignore','ignore']});
				child.unref();
			},2000);
			out += '<p>Restarting in 2 seconds</p>';
			send_status(res, status, out+'<hr>');				
		});
	});
	
});
var STATE_WAITING_FOR_PARAMETERS = 1;
var STATE_WAITING_FOR_HEADER = 2;
var STATE_RUNNING = 3;
var STATE_ERROR = 4;

var rooms = {};

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
  socket.on('master', function(msg) {
    self.master(msg);
  });
  socket.on('slave', function(msg) {
    self.slave(msg);
  });
  socket.on('action', function(msg) {
    self.action(msg);
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

Client.prototype.master = function(msg) {
  // room, pin
  if (msg.room===undefined) {
    console.log("Master with no room defined");
    return;
  }
  if (rooms[msg.room]===undefined) {
    console.log("New room for master "+msg.room+" with pin "+msg.pin);
    rooms[msg.room] = { pin: msg.pin };
    this.room = msg.room;
    this.master = true;
  } else if (rooms[msg.room].pin !== msg.pin) {
    console.log("Join existing room "+msg.room+" with wrong pin ("+msg.pin+")");
    this.socket.emit('join.error', 'Incorrect PIN');
  } else {
    console.log("Join existing room "+msg.room);
    this.room = msg.room;
    this.master = true;
  }
};
Client.prototype.slave = function(msg) {
   // room
  if (msg.room===undefined) {
    console.log("Slave with no room defined");
    return;
  }
  console.log("slave joined room "+msg.room);
  this.socket.join(msg.room);
  this.slave = true;
  this.room = msg.room;
  if (rooms[msg.room]===undefined)
    this.socket.emit('join.warning', 'Unknown room');
};
Client.prototype.action = function(msg) {
  // marker...
  if (this.master) {
    console.log("relay action to room "+this.room+": "+msg);
    io.to(this.room).emit('action', msg);
  } else {
    console.log("discard action for non-master");
  }
};

io.on('connection', function(socket){
  var client = new Client(socket);
});

http.listen(3000, function(){
  console.log('listening on *:3000');
});
