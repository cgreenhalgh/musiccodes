// OSC send test
var osc = require("osc");

var udpPort = new osc.UDPPort({
    localAddress: "0.0.0.0",
    localPort: 0,
    
    remoteAddress: "128.243.22.74",
    remotePort: 9001
});

udpPort.on("ready", function () {
    console.log("OSC over UDP ready.");
});

udpPort.on("error", function (err) {
    console.log(err);
});

udpPort.open();

setInterval(function() {
    var msg = {
        address: "/test",
        args: [Math.random()]
    };

    console.log("Sending message", msg.address, msg.args, "to", udpPort.options.remoteAddress + ":" + udpPort.options.remotePort);
    udpPort.send(msg);
}, 1000);
