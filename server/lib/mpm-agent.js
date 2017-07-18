// Node Agent
console.log('Node status service agent');

var os = require('os');
//if (!os.tmpdir)
var osTmpdir = require('os-tmpdir');
var path = require('path');
var fs = require('fs');
var uuid = require('uuid/v1'); // MAC/timestamp based
var request = require('request');

var ioclient = require('socket.io-client');

function datetime() {
	return (new Date()).toISOString();
}


// PROCESS...

function getIps() {
	var nets = os.networkInterfaces();
	var ips = [];
	for (var ni in nets) {
		var net = nets[ni];
		for (var ai in net) {
			var addr = net[ai];
			if (!addr.internal && addr.family=='IPv4' && !!addr.address) {
				ips.push(addr.address);
			}
		}
	}
	return ips;
}

function getProcessInfo() {
	return {
		pid: process.pid,
		end: process.env,
		argv: process.argv,
		execArgv: process.execArgv,
		execPath: process.execPath,
		nodeVersion: process.version
	}
}
function getProcessStatus(info) {
	info = info || {};
	//cpuUsage: process.cpuUsage(),
	info.cwd = process.cwd();
	info.memoryUsage = process.memoryUsage();
	info.uptime = process.uptime();
	info.ips = getIps();
	return info;
}

function getUuidIri() {
	return 'urn:uuid:'+uuid();
}

var osreport = {
		info: getOsInfo(),
		status: getOsStatus(),
		'@type': 'Environment'
};

//console.log(JSON.stringify(osreport,null,2));

var processinfo = getProcessInfo();
var processiri = getUuidIri();
var config = {};

var files = [];

function getFilesInfo() {
	// TODO update times, lengths, etc.
	return files;
}

function getProcReport() {
	return {
		datetime: datetime(),
		info: getProcessStatus(processinfo),
		processType: 'Node.js',
		'@type': 'Process',
		title: process.argv[1],
		'@id': processiri,
		config: config,
		files: getFilesInfo()
	}
};
//console.log(JSON.stringify(procreport, null, 2));

// ENVIRONMENT = OS...

//(probably) fixed OS-related information
function getOsInfo() {
	var info = {
		datetime: datetime(),
		arch: os.arch(),
		cpus: os.cpus(),
		hostname: os.hostname(),
		platform: os.platform(),
		release: os.release(),
		type: os.type(),
		totalmem: os.totalmem()
	};
	return info;
}
var osinfo = getOsInfo();

// dynamic OS-related information
function getOsStatus(info) {
	info = info || {};
	info.datetime = datetime();
	info.uptime = os.uptime();
	info.loadavg = os.loadavg();
	info.freemem = os.freemem();
	info.networkInterfaces = os.networkInterfaces();
	info.ips = getIps();
	return info;
}
var tmpdir = osTmpdir();

var ENVIRONMENT_FILENAME = 'music-perf-mgr-env.json';
var environment_file = path.join(tmpdir,ENVIRONMENT_FILENAME);
var environment=null;
console.log('check environment file '+environment_file);

try {
	var data = fs.readFileSync(environment_file, 'utf-8');
	//console.log('read '+data);
	environment = JSON.parse(data);
	console.log('Read environment '+JSON.stringify(environment, null, 2));
}
catch (err) {
	console.log('Error reading environment file '+environment_file+': '+err.message);
}
if (!environment || !environment['@id']) {
	var envid = getUuidIri();
	environment = {
			'@id': envid
	};
	console.log('Generating environment: '+JSON.stringify(environment, null, 2));
	try {
		fs.writeFileSync(environment_file, JSON.stringify(environment), {encoding:'utf8', flag:'wx'});
		console.log('Wrote environment file '+environment_file);
	} catch (err) {
		console.log('Error writing environment file '+environment_file+': '+err.message);
	}
}
function getOsReport() {
	var info = getOsStatus(osinfo);
	return { '@id': environment['@id'], '@type': 'Environment', environmentType:'OS', title: info.hostname, datetime: datetime(), info: info };
}
osreport['@id'] = environment['@id'];

//console.log('process: '+procreport['@id']);

// Now the agent itself...
// parallel mpm-agent.js

var MPM_REPORT_INTERVAL = 10;
var MPM_REPORT_JITTER = 4;

var DEFAULT_MPM_SERVER = 'http://localhost:3003';

var sockets = {};
var reportos = true;

function connect(url) {
	url = url || DEFAULT_MPM_SERVER;
	if (sockets[url]===undefined) {
		var socket = sockets[url] = ioclient.connect(url);
		socket.on('error', function(err) {
			console.log('agent socket error: '+err);
		});
		socket.on('reconnect', function(err) {
			console.log('agent socket reconnect');
		});
		socket.on('connect', function(err) {
			console.log('agent socket connect');
			socket.mpmIsConnected = true;
			report(socket);
		});
		socket.on('disconnect', function(err) {
			console.log('agent socket disconnect');
			socket.mpmIsConnected = false;
		});
		socket.on('post', function(msg) {
			console.log('agent post (unimplemented)', msg);
			// TODO handle file post request
			var resp = { iri:msg.iri, path: msg.path, request: msg.request, url: msg.url, status: 'unsupported' };
			try {
				console.log('upload '+msg.path+' to '+msg.url);
				fs.createReadStream(msg.path).pipe(request.post(msg.url))
				.on('response', function(httpResp ) {
					console.log('upload response '+httpResp.status);
					resp.statusCode = httpResp.status;
					resp.status = httpResp.statusMessage;
					socket.emit('postResponse', resp);
				})
				.on('error', function(err) {
					console.log('upload error', err);
					resp.status = 'error ('+err.message+')';
					resp.statusCode = -1;
					socket.emit('postResponse', resp);
				});
			}
			catch (err) {
				console.log('upload exception', err);
				resp.status = 'error ('+err.message+')';
				socket.emit('postResponse', resp);
			}
		});
	}
}	
connect(DEFAULT_MPM_SERVER);
module.exports.connect = connect;

function getDelay() {
	return (MPM_REPORT_INTERVAL+(Math.random()-0.5)*MPM_REPORT_JITTER)*1000;
}
var timeout = null;
function report(socket) {
	console.log('mpmAgent report '+(socket!==undefined ? 'specific' : 'global'));
	
	var report = getProcReport();
	report.expire = MPM_REPORT_INTERVAL*2;
	
	var osreport = null;
	if (reportos) {
		osreport = getOsReport();
		osreport.reportedBy = report['@id'];
		osreport.expire = MPM_REPORT_INTERVAL*2;
	}
	
	if (socket===undefined) {
		for (var url in sockets) {
			var socket = sockets[url];
			if (socket.mpmIsConnected) {
				socket.emit('mpm-report', report);
				if (osreport)
					socket.emit('mpm-report', osreport);
			} else {
				console.log('warning: mpm-agent cannot send report - unconnected');
			}
		}
		if (timeout!==null)
			clearTimeout(timeout);
		timeout = setTimeout(reportTimer, getDelay());
	} else {
		if (socket.mpmIsConnected) {
			socket.emit('mpm-report', report);
			if (osreport)
				socket.emit('mpm-report', osreport);
		} else {
			console.log('warning: mpm-agent cannot send report - unconnected');
		}
	}
};
function reportTimer() {
	timeout = null;
	report();
}
report();

module.exports.init = function(moreinfo) {
	console.log('mpmAgent init', moreinfo);
	for (var k in moreinfo) {
		info[k] = moreinfo[k];
	}
	report();
};
module.exports.configure = function(values) {
	for (var k in values) {
		config[k] = values[k];
	}
	report();
}

// array of {tag:, path:, useType: 'log'|...}
module.exports.addFiles = function(newfiles) {
	for (var fi in newfiles) {
		var nfile = newfiles[fi];
		// TODO length, remove old??
		var file = {tag: nfile.tag, path: nfile.path, useType: nfile.useType, created:datetime()};
		files.push(file);
	}
	report();
}
