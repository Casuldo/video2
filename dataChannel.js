
function sendDataOffer(clientID) {
	//var dataChannel = peer.createDataChannel("chat");
	//dataChannelHandler(dataChannel);
	
    peer.createOffer(function(offerSDP) {
		console.log(offerSDP);
        socket.emit('dataOffer',{
            targetUser: clientID,
            offerSDP: offerSDP
        });
		console.log("Create data offer");
    }, failureMessage,   {mandatory: {
      OfferToReceiveAudio: false,
      OfferToReceiveVideo: false
  }});
	
}

socket.on('getDataOffer', function(data) {
	console.log("Data offer received");
    if(data.targetUser == myID && data.offerSDP) {
		sendDataAnswer();
    }
});

function sendDataAnswer() {
    peer.createAnswer(function(answerSDP) {
		console.log(peer);
        socket.emit('dataAnswer',{
            targetUser: myID,
            answerSDP: answerSDP
        });
		console.log("Create data answer");
    }, failureMessage);
}

socket.on('getDataAnswer', function(data) {
    if(data.targetUser !== myID && data.answerSDP) {
        // completing the handshake; this code is for offerer
		console.log("Data answer received");
    }
});