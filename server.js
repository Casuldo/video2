var static = require('node-static');
var http = require('http');
var file = new(static.Server)();
var app = http.createServer(function (req, res) {
  file.serve(req, res);
}).listen(process.env.PORT || 5000);
console.log("Running!");
var clientID= 0;
var clients = [];


var io = require('socket.io').listen(app);

io.sockets.on('connection', function (socket){

	socket.on('icecandidate', function (data) {
		console.log('Got icecandidate data from... : ', data);
		socket.broadcast.emit('getIcecandidate', data);
	});
	
	socket.on('offer', function (data) {
		console.log('Got offer data from... : ', data);
		socket.broadcast.emit('getOffer', data);
	});
	
	socket.on('answer', function (data) {
		console.log('Got answer data from... : ', data);
		socket.broadcast.emit('getAnswer', data);
	});
	socket.on('join', function (data) {
		console.log('Got answer data from... : ', data);
		socket.emit('getID', clientID);
		socket.broadcast.emit('newClient', clientID);
		clientID++;
	});

});