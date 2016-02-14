// MusicCodes slave view (actions)

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

var socket = io();
var markers = [];
var markerId = 1;

function redraw() {
  var list = d3.select('#links');
  var marks = list.selectAll('li').data(markers, function(d) { return d.id; });
  var lis = marks.enter().append('li')
      .classed('codelink', true);
  lis.append('img')
      .classed('codeimage', true)
      .attr('src',function(d) { return d.marker.image; });
  lis.append('p')
      .classed('codetitle', true)
      .text(function(d) { return d.marker.title; });
  marks.exit().remove();
}

socket.on('join.warning', function(msg) {
  alert('Warning joining session: '+msg);
});

socket.on('action', function(marker) {
  console.log('new marker: '+marker);
  var time = (new Date()).getTime();
  for (var ai in marker.actions) {
    var action = marker.actions[ai];
    if (channel==action.channel) {
      console.log('open '+action.url);
      $('#viewframe').attr('src',action.url);
    }
  }
  // markers.push({ marker: marker, lastTime: time, id: markerId++ });
  redraw();
});

setInterval(function() {
  console.log("tick");
  var time = (new Date()).getTime();
  var ni=0;
  for (; ni<markers.length && markers[ni].lastTime<time-10000; ni++)
    ;
  if (ni>0)
    markers.splice(0,ni);
  redraw();
},1000);


var params = getQueryParams(document.location.search);
var room = params['r']===undefined ? 'default' : params['r'];
var channel = params['c']===undefined ? '' : params['c'];
console.log('Slave: Room = '+room+', channel='+channel);
socket.emit('slave',{room:room});

$(document).on('click', '.codelink', function(ev) {
  var group = d3.select(ev.target).datum();
  if (group.marker && group.marker.action) {
    console.log('open '+group.marker.action);
    $('#viewframe').attr('src',group.marker.action);
  }
});

