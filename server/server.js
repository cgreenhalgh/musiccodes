var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var fs = require('fs');
var dateFormat = require('dateformat');
var osc = require("osc");
var extend = require('extend');

app.get('/', function(req, res){
  console.log('get /');
  res.sendFile(__dirname + '/public/index.html');
});
function returnPublicFile(req, res) {
  var url = require('url').parse(req.url);
  console.log('get ' + req.url + ' -> ' + url.pathname);
  res.sendFile(__dirname + '/public' + url.pathname);
};
app.get('/content/*', returnPublicFile);
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

// Test if URL can load in iframe, return 0=OK, -1=failed to get, -2=x-frame-origin prevents
app.get('/testiframeurl', function(req,res) {
	var url = req.query.u;
	if (url===null || url===undefined || url=='') {
		res.status(400).send('No query parameter u specified');
		return;
	}
	console.log('test http get '+url);
	var request = require('request');
	console.log('check URL '+url);
	try {
		request({uri: url, method: 'GET', followRedirect:true}).on('response', function(urlres) {

			if (urlres.statusCode!=200) {
				console.log('URL '+url+' -> status '+urlres.statusCode);
				//if (urlres.statusCode==301 || urlres.statusCode==302 || urlres.statusCode)
				res.send(''+urlres.statusCode);
				return;
			}
			var options = urlres.headers['x-frame-options'];
			console.log('URL '+url+' -> x-frame-options '+options);
			if (options!==undefined) {
				options = options.toLowerCase();
				if (options.indexOf('deny')>=0 || options.indexOf('sameorigin')>=0) {
					res.send('-2');
					return;
				}
			}
			res.send('0');

		}).on('error', function(err) {
			console.log('Error getting '+url+': '+err.message);
			res.send('-3');
		});
	}
	catch (err) {
		console.log('URL '+url+' -> error '+err.message);
		console.log('Error getting '+url+': '+err.message);
		res.send('-3');		
	}
});

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

var $rdf = require('rdflib');
var VAMP_PLUGIN = $rdf.sym('http://purl.org/ontology/vamp/Plugin');
var VAMP_PLUGIN_LIBRARY = $rdf.sym('http://purl.org/ontology/vamp/PluginLibrary');
var VAMP_IDENTIFIER = $rdf.sym('http://purl.org/ontology/vamp/identifier');
var VAMP_PARAMETER = $rdf.sym('http://purl.org/ontology/vamp/parameter');
var VAMP_MIN_VALUE = $rdf.sym('http://purl.org/ontology/vamp/min_value');
var VAMP_MAX_VALUE = $rdf.sym('http://purl.org/ontology/vamp/max_value');
var VAMP_DEFAULT_VALUE = $rdf.sym('http://purl.org/ontology/vamp/default_value');
var VAMP_QUANTIZE_STEP = $rdf.sym('http://purl.org/ontology/vamp/quantize_step');
var VAMP_VALUE_NAMES = $rdf.sym('http://purl.org/ontology/vamp/value_names');
var RDF_TYPE = $rdf.sym('http://www.w3.org/1999/02/22-rdf-syntax-ns#type');
var RDF_FIRST = $rdf.sym('http://www.w3.org/1999/02/22-rdf-syntax-ns#first');
var RDF_REST = $rdf.sym('http://www.w3.org/1999/02/22-rdf-syntax-ns#rest');
var RDF_NIL = $rdf.sym('http://www.w3.org/1999/02/22-rdf-syntax-ns#nil');
var XSD_INTEGER = $rdf.sym('http://www.w3.org/2001/XMLSchema#integer');
// VAMP plugin metadata
var vampPlugins = {};
// unwrap rdflib value
function unwrapValue(val) {
	if (val!==undefined && val!==null) {
		if (val.value!==undefined && val.value!==null && val.datatype!==undefined) {
			if (XSD_INTEGER.sameTerm(val.datatype))
				return Number(val.value);
			//else
			//	console.log('value '+val.value+' datatype '+val.datatype);
		}
		return val.value;
	}
	return val;;
}
try {
	// get search path
	run_process('vamp-live-host',['-p'],__dirname,DEFAULT_TIMEOUT,function(code,output) {
		if (code!=0) {
			console.log('Error running vamp-live-host -p: '+code+': '+output);
			return;
		}
		var directories = output.split('\n');
		for (var di in directories) {
			// for loop closure
			(function() {
				var dir = directories[di];
				if (dir=='')
					return;
				fs.readdir(dir, function(err,fnames) {
					if (err) {
						console.log('Could not read vamp plugin directory '+dir+': '+err);
						return;
					}
					for (var fi in fnames) {
						// for loop closure
						(function(){
							var fname = fnames[fi];
							var ix = fname.indexOf('.');
							var ext = ix>=0 ? fname.substring(ix+1) : '';
							if ('n3'==ext) {
								fs.readFile(dir+'/'+fname, 'utf8', function(err,n3data) {
									if (err) {
										console.log('Error reading vamp metadata file '+dir+'/'+fname+': '+err.message);
										return;
									}
									try {
										var uri= 'file://'+dir+'/'+fname.substring(0,ix);
										var store = $rdf.graph();
										// read metadata
										$rdf.parse(n3data, store, uri, 'text/turtle');
										console.log('Read vamp metadata from '+fname);
										// extract singleton PluginLibrary
										var library = store.any(undefined, RDF_TYPE, VAMP_PLUGIN_LIBRARY);
										var libraryName = store.any(library, VAMP_IDENTIFIER);
										// each Plugin...
										var plugins = store.each(undefined, RDF_TYPE, VAMP_PLUGIN);
										for (var pi in plugins) {
											var plugin = plugins[pi];
											var pluginName = store.any(plugin, VAMP_IDENTIFIER);
											console.log('Found plugin '+libraryName+':'+pluginName);
											var pluginInfo = { library: 'libraryName', uri: plugin, pluginName: pluginName, parameters:[] };
											// TODO cope with multiple plugins
											if (libraryName=='silvet' && pluginName=='silvet') {
												vampPlugins[libraryName+':'+pluginName] = pluginInfo;
											}
											// each Plugin parameter...
											var parameters = store.each(plugin, VAMP_PARAMETER);
											for (var ai in parameters) {
												var parameter = parameters[ai];
												var parameterName = unwrapValue(store.any(parameter, VAMP_IDENTIFIER))
												var paramInfo = { 
													name: parameterName,
													min_value: unwrapValue(store.any(parameter, VAMP_MIN_VALUE)),
													max_value: unwrapValue(store.any(parameter, VAMP_MAX_VALUE)),
													default_value: unwrapValue(store.any(parameter, VAMP_DEFAULT_VALUE)),
													quantize_step: unwrapValue(store.any(parameter, VAMP_QUANTIZE_STEP))
												};
												var value_names = store.any(parameter, VAMP_VALUE_NAMES);
												// value_names should be a Collection...
												if (value_names!==undefined && value_names!==null && value_names.elements!==undefined) {
													paramInfo.options = [];
													paramInfo.value_names = [];
													try {
														var value = Number(paramInfo.min_value);
														var step = Number(paramInfo.quantize_step);
														for (var ei in value_names.elements) {
															paramInfo.options.push({value:value,name:unwrapValue(value_names.elements[ei])});
															paramInfo.value_names.push(unwrapValue(value_names.elements[ei]));
															value += step;
														}
													} catch (err) {
														console.log('Error extracting options for parameter '+parameter+': '+err.message);
													}
												}
												console.log('Found parameter '+parameter+': '+JSON.stringify(paramInfo));
												// TODO more extensible configuration of parameters to expose
												if (parameterName=='instrument') {
													pluginInfo.parameters.push(paramInfo);
												}
											}
										}
									}
									catch (err) {
										console.log('Error reading vamp metadata from '+fname+': '+err.message);
									}
								});
							}
						})();
					}
				});
			})();
		}
	});
} catch (err) {
	console.log('Error starting vamp-live-host: '+err.message);
}
// get known vamp parameters
app.get('/vampPlugins',function(req,res) {
	res.set('Content-Type', 'application/json').send(JSON.stringify(vampPlugins));
});

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
			out += '<hr><form action="/update" method="POST"><label>Version: <input type="text" name="tag"><input type="submit" value="Update"></form>'+
				'<p><a href="/">Back</a></p>'
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
			// npm install --no-bin-links
			run_process('npm',['install','--no-bin-links'],__dirname,DEFAULT_TIMEOUT,function(code,output) {
				console.log('npm install --no-bin-links -> '+code+': '+output);
				var status = 200;
				if (code!==0) {
					out += '<p>Warning: npm install failed:</p><pre>'+escapeHTML(output)+'</pre>';
					status = 500;
				} else {
					out += '<p>npm install ok</p>';
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
	
});
var DEFAULT_SETTINGS = { machineNickname:'', defaultAuthor:'', defaultLogUse:true, defaultRecordAudio:false };
var settings = {};
try {
	fs.accessSync(__dirname+'/settings.json', fs.R_OK);
	settings = JSON.parse(fs.readFileSync(__dirname+'/settings.json','utf8'));
} catch (err) {
	console.log('Error reading '+__dirname+'/settings.json: '+err.message);
}
for (var v in DEFAULT_SETTINGS) {
	if (settings[v]===undefined)
		settings[v] = DEFAULT_SETTINGS[v];
}


var STATE_WAITING_FOR_PARAMETERS = 1;
var STATE_WAITING_FOR_HEADER = 2;
var STATE_RUNNING = 3;
var STATE_ERROR = 4;

var LEVEL_DEBUG = 2;
var LEVEL_INFO = 4;
var LEVEL_WARN = 6;
var LEVEL_ERROR = 8;
var LEVEL_SEVERE = 10;

var LOG_FILENAME_DATE_FORMAT = "yyyymmdd'T'HHMMssl'Z'";
var LOG_DATE_FORMAT = "yyyy-mm-dd'T'HH:MM:ss.l'Z'";
var rooms = {};
var roomLogs = {};
var LOG_DIR = __dirname+'/logs';
if (!fs.existsSync(LOG_DIR)) {
	console.log('Try to create log dir '+LOG_DIR);
	fs.mkdirSync(LOG_DIR);
	if (!fs.existsSync(LOG_DIR)) {
		console.log('ERROR: could not create log dir '+LOG_DIR);
	} else {
		console.log('Created log dir '+LOG_DIR);		
	}
}
var AUDIO_DIR = __dirname+'/audio';
if (!fs.existsSync(AUDIO_DIR)) {
	console.log('Try to create audio dir '+AUDIO_DIR);
	fs.mkdirSync(AUDIO_DIR);
	if (!fs.existsSync(AUDIO_DIR)) {
		console.log('ERROR: could not create audio dir '+AUDIO_DIR);
	} else {
		console.log('Created audio dir '+AUDIO_DIR);		
	}
}

var packageInfo = null;
try {
	var json = fs.readFileSync(__dirname+'/package.json','utf8');
	packageInfo = JSON.parse(json);
}
catch (err) {
	console.log("Error reading/parsing package info from "+__dirname+'/package.json: '+err.message);
}
var appCommit = null;
run_process('git',['log','--pretty=format:%H','-1'], __dirname+'/..',DEFAULT_TIMEOUT,function(code,output) {
	if (code!==0) {
		console.log('Could not get git commit');
	} else {
		appCommit = output.trim();
		console.log('git commit = '+appCommit);
	}
});
var installId = null;
try {
	fs.accessSync(__dirname+'/installId', fs.R_OK);
	installId = fs.readFileSync(__dirname+'/installId','utf8').trim();
} catch (err) {
	console.log('Error reading '+__dirname+'/installId: '+err.message);
}
if (installId===null) {
	var uuid = require('uuid');
	installId = uuid.v1();
	console.log('Generated installId '+installId);
	try {
		fs.writeFileSync(__dirname+'/installId', installId, 'utf8');
	} catch (err) {
		console.log('Error: could not write installId: '+err.message);
	}
}

function send_settings(res, status, out) {
	out += '<h1>General Settings</h1>';
	out += '<form action="/settings" method="POST">'+
	'<table><tbody>'+
	'<tr><td>Installation ID:</td><td>'+escapeHTML(installId)+'</td></tr>'+
	'<tr><td>Machine nickname:</td><td><input type="text" name="machineNickname" value="'+escapeHTML(settings.machineNickname)+'"></td></tr>'+
	'<tr><td>Default author:</td><td><input type="text" name="defaultAuthor" value="'+escapeHTML(settings.defaultAuthor)+'"></td></tr>'+
	//'<tr><td>Default log use:</td><td><input type="checkbox" name="defaultLogUse" value="true" '+(settings.defaultLogUse ? 'checked="checked"' : '')+'"></td></tr>'+
	'<tr><td>Default record audio:</td><td><input type="checkbox" name="defaultRecordAudio" value="true" '+(settings.defaultRecordAudio ? 'checked="checked"' : '')+'"></td></tr>'+
	'<tr><td></td><td><input type="submit" value="Update"></td></tr>'+
	'</tbody></table></form>'+
	'<p><a href="/">Back</a></p>'
	res.status(status);
	res.send(out);
};
app.get('/settings', function(req,res) {
	console.log('/settings ...');
	send_settings(res,200,'');
});
app.get('/defaults', function(req,res) {
	var defaults = { author: settings.defaultAuthor, logUse: settings.defaultLogUse, recordAudio: settings.defaultRecordAudio };
	res.set('Content-Type', 'application/json').send(JSON.stringify(defaults));
});
app.post('/settings', function(req,res) {
	var status = 200;
	var out = '';
	if (req.body.machineNickname!==undefined)
		settings.machineNickname = req.body.machineNickname;
	if (req.body.defaultAuthor!==undefined)
		settings.defaultAuthor = req.body.defaultAuthor;
	//settings.defaultLogUse = (req.body.defaultLogUse!==undefined && req.body.defaultLogUse=='true');
	settings.defaultRecordAudio = (req.body.defaultRecordAudio!==undefined && req.body.defaultRecordAudio=='true');
	try {
		fs.writeFileSync(__dirname+'/settings.json', JSON.stringify(settings), 'utf8');
		console.log('updated settings to '+JSON.stringify(settings));
		out += '<p>Updated settings.</p><hr>';
	} catch (err) {
		console.log('Error: could not write settings.json: '+err.message);
		out += '<p>Error: could not write settings.json: '+err.message+'</p><hr>';
		status = 500;
	}
	send_settings(res, status, out);				
});

function roomJoin(room, id, masterFlag) {
	var l = roomLogs[room];
	if (l===undefined) {
		roomLogs[room] = l = { masters:[], slaves: [], recordAudio: false, entries: [] };
		var now = new Date();
		l.path = LOG_DIR+'/'+dateFormat(now, LOG_FILENAME_DATE_FORMAT)+'-'+room+'.log';
/*		try {
			roomLogs[room].log = fs.openSync(path, 'a+');
		} catch (err) {
			console.log('Error opening log file '+path+': '+err);
		}
*/
		var info = {
			logVersion: '1.0'
		};
		if (packageInfo!==null) {
			info.application = packageInfo.name;
			info.version = packageInfo.version;
		} else {
			info.application = "musiccodes-server";
			// version ?!
		}
		// installId, machineNickname, appCommit
		if (appCommit!==null)
			info.appCommit = appCommit;
		if (installId!==null)
			info.installId = installId;
		if (settings.machineNickname!==undefined)
			info.machineNickname = settings.machineNickname;
		log(room, 'server', 'log.start', info, LEVEL_INFO);
	}
	if (masterFlag && !l.masters.indexOf(id)>=0) {
		l.masters.push(id);
	}
	else if (!masterFlag && !l.slaves.indexOf(id)>=0) {
		l.slaves.push(id);
	}
}
function roomLeave(room, id) {
	var l = roomLogs[room];
	if (l!==undefined) {		
		if (l.masters.indexOf(id)>=0) {
			l.masters.splice(l.masters.indexOf(id), 1);
			console.log('remove master '+id+', leaves '+l.masters.length+'+'+l.slaves.length);
		}
		else if (l.slaves.indexOf(id)>=0) {
			l.slaves.splice(l.slaves.indexOf(id), 1);
			console.log('remove slave '+id+', leaves '+l.masters.length+'+'+l.slaves.length);
		}
		if (l.masters.length==0 && l.slaves.length==0 && l.log!==undefined) {
			log(room, 'server', 'log.end', {});
			console.log('close log '+l.path);
			l.log.end();
			delete l.out;
			delete roomLogs[room];
		} else if (l.masters.length==0) {
			delete l.logUse;
		}
	}
}
function roomLogUse(room, logUse) {
	var log = roomLogs[room];
	if (log!==undefined) {
		log.logUse = logUse;
		if (logUse==false) {
			log.entries = [];
		} else {
			try {
				console.log('create log file '+log.path);
				log.log = fs.createWriteStream(log.path, {flags:'a+',defaultEncoding:'utf8',autoClose:true,mode:0o644});
			} catch (err) {
				console.log('Error creating log file '+log.path+': '+err.message);
			}
			if (log.log!==undefined) {
				for (var ei in log.entries) {
					log.log.write(JSON.stringify(log.entries[ei]));
					log.log.write('\n');
				}
				log.entries = [];
			}
		}
	}
}
function log(room, component, event, info, level) {
	var log = roomLogs[room];
	if (log!==undefined) {
		if (log.logUse===false) 
			// discard
			return;
		if (level===undefined)
			level = LEVEL_INFO;
		var now = new Date();
		var entry = {
				time: now.getTime(),
				datetime: dateFormat(now, LOG_DATE_FORMAT),
				level: level,
				component: component,
				event: event,
				info: info
		};
		if (log.logUse===undefined || log.log===undefined) {
			// save for later
			log.entries.push(entry);
		} else {
			log.log.write(JSON.stringify(entry));
			log.log.write('\n');
		}
	}
}
var EDITORS = '_editors_';
var MASTERS = '_masters_';

app.post('/input', function(req,res) {
	var params = extend({}, req.query, req.body);
	var room = params.room ? params.room : "default";
	var pin = params.pin ? params.pin : "";
	var name = params.name;
	var client = params.client ? params.client : "(undefined)";
	console.log('action room='+room+', pin='+pin+', name='+name+', client='+client);
	if (!name) {
		console.log('POST /input with no input (client '+client+')');
		res.status(400).send('no input name specified');
		return;
	}
	if (rooms[room]===undefined) {
		console.log('POST /input '+name+' for unknown room '+room+' (client '+client+')');
		res.status(404).send('unknown room');
		return;
	} else if (rooms[room].pin !== pin) {
		console.log('POST /input '+name+' for room '+room+' with incorrect pin (client '+client+')');
		res.status(403).send('incorrect pin');
		return;
	}
	// send to room
	var msg = { "inputUrl":"post:"+encodeURIComponent(name), params: params };
	log(room, "server", 'input', msg, LEVEL_INFO); 
    io.to(MASTERS+room).emit('input', msg);

	res.status(200).send('');
});


function Client(socket) {
  this.socket = socket;
  console.log('New client');
  var self = this;
  this.editor = false;
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
    self.onMaster(msg);
  });
  socket.on('slave', function(msg) {
    self.onSlave(msg);
  });
  socket.on('action', function(msg) {
    self.action(msg);
  });
  socket.on('parameters', function(msg) {
    self.parameters(msg);
  });
  socket.on('recordAudio', function(msg) {
	  self.recordAudio();
  });
  socket.on('stopAudio', function(msg) {
	  self.stopAudio();
  });
  socket.on('audioHeader', function(msg) {
	    self.header(msg);
	  });
  socket.on('audioData', function(msg) {
  self.data(msg);
  });
  socket.on('osc.send', function(msg) {
	  self.oscSend(msg);
  });
  socket.on('log', function(msg) {
	  var event = msg.event;
	  if (event===undefined)
		  event = 'undefined';
	  log(self.room, 'client', event, msg.info, msg.level);
  });
  socket.on('editor', function() {
	 self.editor = true;
	 socket.join(EDITORS);
	 console.log('new editor');
  });
  socket.on('selectNotes', function(notes) {
	  log(self.room, 'server', 'selectNotes', notes, LEVEL_INFO);
	  console.log('selectNotes: '+JSON.stringify(notes));
	  io.to(EDITORS).emit('selectNotes', notes);
  })
}
Client.prototype.parameters = function(parameters) {
  var self = this;
  log(this.room, 'server', 'audio.parameters', parameters);
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
  this.process.inbuf = '';
  this.process.stdout.on('data', function(data) {
	  console.log( 'Client stdout: '+data);
	  self.process.inbuf += data;
	  var lines = self.process.inbuf.split('\n');
	  // can be out of order - process together to sort before send
	  /*for (var li=0; li<lines.length-1; li++) {
		  var line = lines[li];
		  console.log( 'Client line: '+line);
		  self.processSilvetOnoffset(line);    
	  }*/
	  // what's left?
	  if (lines.length>0) {
		  self.processSilvetOnoffset(lines.slice(0, lines.length-1).join('\n'));
		  self.process.inbuf = lines[lines.length-1];
	  } else {
		  self.process.inbuf = '';
	  }
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
  console.log('Client disconnected, master='+this.master+', room='+this.room);
  this.stopAudio();
  if (this.room!==null && this.room!==undefined) {
	  if (this.master)
		  log(this.room, 'server', 'master.disconnect', {id:this.socket.id, room:this.room});
	  else
		  log(this.room, 'server', 'slave.disconnect', {id:this.socket.id, room:this.room});
	  roomLeave(this.room, this.socket.id);
  }
};
Client.prototype.stopAudio = function() {
	log(this.room, 'server', 'audio.stop', {});
	try {
		if (this.process!==null) 
			this.process.kill();
		this.process = null;
	} catch (err) {
		console.log('Error killing process: ', err);
	}
	try {
		if (this.audioOut!==undefined && this.audioOut!==null)
			this.audioOut.end();
		this.audioOut = null;
	} catch (err) {
		console.log('Error ending audio out: '+err);
	}	
};
Client.prototype.recordAudio = function() {
	console.log('RecordAudio');
	var now = new Date();
	var filename = dateFormat(now, LOG_FILENAME_DATE_FORMAT)+'-'+this.room+'.wav';
	var path = AUDIO_DIR+'/'+filename;
	try {
		console.log('create audio file '+path);
		this.audioOut = fs.createWriteStream(path, {flags:'a+',defaultEncoding:'base64',autoClose:true,mode:0o644});
		log(this.room, 'server', 'audio.record', {filename:filename});
	} catch (err) {
		console.log('Error creating audio file '+path+': '+err.message);
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
  if (this.audioOut!==null && this.audioOut!==undefined) {
	  try {
		  this.audioOut.write(msg, 'base64');
	  } catch (err) {
		  console.log('Error writing data to audio file', err);
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
  if (this.audioOut!==null && this.audioOut!==undefined) {
	  try {
		  this.audioOut.write(msg, 'base64');
	  } catch (err) {
		  console.log('Error writing data to audio file', err);
	  }
  }
};
Client.prototype.processSilvetOnoffset = function(data) {
  // e.g.  0.720000000: 174.614 6 F3
  var values = [];
  var lines = data.split('\n');
  for (var li in lines) {
	  lines[li].replace(/\s*(\d+(\.\d+)?):\s*(\d+(\.\d+)?)\s+(\d+)\s(\S+)\s*(\S+)?/,
		       function(m, time, t2, freq, f2, velocity, note, off) {
		           values.push({time:Number(time),freq:Number(freq),velocity:Number(velocity),
		                        note:note,off:(off=='off')});
		       });
  }
  values.sort(function(a,b){return a.time-b.time;});
  for (var ix in values) {
    console.log('Get note '+JSON.stringify(values[ix]));
    log(this.room, 'server', 'audio.note', values[ix]);
    this.socket.emit('onoffset', values[ix]);
  }     
};

Client.prototype.onMaster = function(msg) {
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
  this.socket.join(MASTERS+msg.room);
  if (this.room!==null && this.room!==undefined) {
	  roomJoin(this.room, this.socket.id, true);
	  // TODO: logUse set by experience
	  roomLogUse(this.room, true);
	  log(this.room, 'server', 'master.connect', {id:this.socket.id, room:this.room, channel:msg.channel, experience:msg.experience});
  }
};
Client.prototype.onSlave = function(msg) {
   // room
  if (msg.room===undefined) {
    console.log("Slave with no room defined");
    return;
  }
  console.log("slave joined room "+msg.room);
  this.socket.join(msg.room);
  this.slave = true;
  this.room = msg.room;
  roomJoin(this.room, this.socket.id, false);
  log(this.room, 'server', 'slave.connect', {id:this.socket.id, room:this.room, channel:msg.channel});
  if (rooms[msg.room]===undefined)
    this.socket.emit('join.warning', 'Unknown room');
};
Client.prototype.action = function(msg) {
  // marker...
  if (this.master) {
    console.log("relay action to room "+this.room+": "+msg);
    log(this.room, 'server', 'action.tiggered', msg);
    io.to(this.room).emit('action', msg);
  } else {
    console.log("discard action for non-master");
  }
};

// shared pool of osc UDPPorts
var udpPorts = [];

Client.prototype.oscSend = function(surl) {
	var self = this;
	log(this.room, 'server', 'osc.send', {url: surl});
	console.log('osc.send '+surl);
	var args =  surl.split(',');
	var url = require('url').parse(args[0]);
	// protocol, hostname, port, pathname
	var port = null;
	if (url.protocol=='osc.udp:') {
		if (url.hostname===undefined || url.port===undefined) {
			console.log('osc.udp must define hostname and port: '+surl);
			this.socket.emit('osc.error', 'osc.udp must define hostname and port: '+surl);
			return;
		}
		for (var pi in udpPorts) {
			var p = udpPorts[pi];
			if (p.options.remoteAddress==url.hostname && p.options.remotePort==url.port) {
				port = p;
				break;
			}
		}
		if (port===null) {
			console.log('create osc UDPPort for '+url.hostname+':'+url.port);
			port = new osc.UDPPort({
			    localAddress: "0.0.0.0",
			    localPort: 0,
			    
			    remoteAddress: url.hostname,
			    remotePort: url.port,
			    
			    metadata: true
			});
			
			udpPorts.push(port);
			
			port.on("ready", function () {
			    console.log("OSC over UDP "+port.options.remoteAddress+":"+port.options.remotePort+" ready.");
			});

			port.on("error", function (err) {
			    console.log("OSC over UDP "+port.options.remoteAddress+":"+port.options.remotePort+" error: "+err);
			    self.socket.emit('osc.error', "OSC over UDP "+port.options.remoteAddress+":"+port.options.remotePort+" error: "+err);
			});
			port.open();
		}
	}
	else {
		console.log('Unsupported OSC protocol: '+url.protocol);
		this.socket.emit('osc.error','Unsupported OSC protocol: '+url.protocol);
		return;
	}
	var message = { address: url.pathname, args: [] };
	if (args.length>1) {
		// any comma? specified arguments...
		var type = (args.length>1 ? args[1] : '');
		if (type.length+2 != args.length) {
			console.log('types dont match arguments in osc message: '+type+' vs '+args.length+': '+surl);
			this.socket.emit('osc.error','types dont match arguments in osc message: '+type+' vs '+args.length+': '+surl);
			return;
		}
		for (var ai=2; ai<args.length; ai++) {
			var arg = args[ai];
			var ty = type.charAt(ai-2);
			var value = null;
			if (ty=='i') {
				// int
				value = parseInt(arg);
			} else if (ty=='f') {
				// float
				value = parseFloat(arg);
			} else if (ty=='s') {
				// string
				value = decodeURIComponent(arg);
			}
			else if (ty=='b') {
				// blob
				value = new Uint8Array(arg.length/2);
				for (var c = 0; c < arg.length; c += 2) {
					value[c/2] = parseInt(arg.substr(c, 2), 16);
				}
			}
			else {
				console.log('unsupported OSC type: '+ty);
				this.socket.emit('osc.error','unsupported OSC type: '+ty);
				return;
			}
			message.args.push({type: ty, value: value});
		}
	} else {
		// TODO: handle arguments with whitespace
	}
	console.log('send osc message to '+surl+': '+JSON.stringify(message));
	try {
		port.send(message);
	}
	catch (err) {
		console.log('osc send error: '+err.message);
		this.socket.emit('osc.error','osc send error: '+err.message);
	}
};

io.on('connection', function(socket){
  var client = new Client(socket);
});

http.listen(3000, function(){
  console.log('listening on *:3000');
});
