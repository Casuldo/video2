var socket = io.connect();
myID=-1;
var isChrome = false;
var video;
var videoSource;
var peer;
var localStream;
var offerList=[];
var clID=-1;
var signalingCount=0;
var chatChannel;
var nickName="Pösilö";

socket.on('getID',function(id){
	myID=id;
	console.log("My id is: "+myID);
});

socket.on('newClient',function(id){
	console.log("New client! "+id);
	clID=id;
	var dataChannel = peer.createDataChannel("chat");
	chatChannel = dataChannel;
	dataChannelHandler(dataChannel);	
	sendOffer(id);
});	


// Define STUN and TURN servers
//------------------------//
var pc_config = {    iceServers: [
        {url: "stun:23.21.150.121"},
        {url: "stun:stun.l.google.com:19302"}
    ]
}
 //var pc_config = {"iceServers": [{"url": "stun:stun.l.google.com:19302"}]}; 
/*var pc_config = webrtcDetectedBrowser === 'firefox' ?
  {'iceServers':[{'url':'stun:23.21.150.121'}]} utop: // number IP
  {'iceServers': [{'url': 'stun:stun.l.google.com:19302'}]};*/
  
 var DtlsSrtpKeyAgreement = {
   DtlsSrtpKeyAgreement: true
}; 
  
var optional = {
   optional: [{RtpDataChannels: true,
			DtlsSrtpKeyAgreement: true}]
};
var sdpConstraints = {'mandatory': {
  'OfferToReceiveAudio':true,
  'OfferToReceiveVideo':true }};
 var sdpConstraints = {'mandatory': {
  'OfferToReceiveAudio':true,
  'OfferToReceiveVideo':true }};
/*var sdpConstraints = {
        optional: [],
        mandatory: {
            OfferToReceiveAudio: true,
            OfferToReceiveVideo: true
        }
 };*/
 
 	navigator.getUserMedia ||
      (navigator.getUserMedia = navigator.mozGetUserMedia ||
      navigator.webkitGetUserMedia || navigator.msGetUserMedia);
 
 // Button clicked -> GetMediaData + its callbacks onMediaError and onMediaSuccess

//------------------------//

function getUserData() {
	var button = document.getElementById('start-peer-connection');
    button.disabled = true;
    console.log("Button clicked");
    var MediaConstraints = {
        audio: true,
        video: true
    };
	  
	if (navigator.getUserMedia) 
		navigator.getUserMedia(MediaConstraints, OnMediaSuccess, OnMediaError);

    function OnMediaError(error) {
        console.error(error);
    }
	
	//Callback success -> Create peerConnection, addstream to peer
	// and icecandites + emit icecandidate info + createoffer
    function OnMediaSuccess(mediaStream) {
		localStream = mediaStream;
		video = document.getElementById('local');
		if(video.src !=='undefined' && window.webkitURL) {
			  isChrome=true;
			  setFunctions();
			  videoSource = window.webkitURL.createObjectURL(mediaStream);
			  video.src = videoSource;
			  peer = new webkitRTCPeerConnection(pc_config);

			  socket.emit('join','jep');
		  }
		else if(video.mozSrcObject !=='undefined') {
				setFunctions();
				video.mozSrcObject = mediaStream;
				peer = new RTCPeerConnection(pc_config,optional);
				socket.emit('join','jep');
			}
		
		if (offerList.length>0){
			sendOffer(offerList[0]);
			offerList = [];
		}
		
		peer.ondatachannel = function (event) {
			console.log("data channel detected");
            var dataChannel = event.channel;
			chatChannel = dataChannel;
            dataChannelHandler(dataChannel);
        };
		sendIceCandidateData();
			
        peer.onicecandidate = function(event) {
			console.log("sending candidate data");
            var candidate = event.candidate;
            if(candidate) {
                socket.emit('icecandidate',{
                    targetUser: 'target-user-id',
                    candidate: candidate
                });
            }
        };
		video.play();
		video.autoplay = false;
        peer.addStream(localStream);
        console.log(peer);
		peer.onaddstream = function(remoteData) {
			console.log("-- onaddstream --");
			var remote = document.getElementById('remote');
			if(remote.src !=='undefined' && window.webkitURL) {
				  isChrome=true;
				  videoSource = window.webkitURL.createObjectURL(remoteData.stream);
				  remote.src = videoSource;
			  }
			else if(remote.mozSrcObject !=='undefined') {
					remote.mozSrcObject = remoteData.stream;
				}
		remote.play();
		remote.autoplay = false;
		sendIceCandidateData();
		};
    }
	
};

socket.on('getIcecandidate', function (data) {
		console.log('Got icecandidate data from... : ', data);
    if(data.targetUser !== myID && data.candidate) {
        var candidate     = data.candidate.candidate;
        var sdpMLineIndex = data.candidate.sdpMLineIndex;
		
        peer.addIceCandidate(new RTCIceCandidate({
            sdpMLineIndex: sdpMLineIndex,
            candidate    : candidate
        }));
		
		sendIceCandidateData();
    }
});
//------------------------//


//------------------------//

// DTLS/SRTP is preferred on chrome
// to interop with Firefox
// which supports them by default


// Create answer functionality
//------------------------//

socket.on('getOffer', function(data) {
	console.log("offer received");
    if(data.targetUser == myID && data.offerSDP) {
        var remoteDescription = new RTCSessionDescription(data.offerSDP);
        peer.setRemoteDescription(remoteDescription,success,failure);	
		createAnswer(data.offerSDP);
    }
});

function createAnswer(offerSDP) {
		
	console.log("creating answer");
	console.log(peer);
        //var remoteDescription = new mozRTCSessionDescription(offerSDP);
        //peer.setRemoteDescription(remoteDescription,success,failure);		
		console.log("sending answer...");
		console.log(peer);
		peer.createAnswer(function(answerSDP) {
			//answerSDP.sdp = preferOpus(answerSDP.sdp);
			peer.setLocalDescription(answerSDP);
			socket.emit('answer',{
				targetUser: '2',
				answerSDP: answerSDP
			});
		}, failureMessage, sdpConstraints);
};

//----------------------
//Offerer handles answerers data

socket.on('getAnswer', function(data) {
	console.log("answer received");
    if(data.targetUser !== myID && data.answerSDP) {
        // completing the handshake; this code is for offerer
        var remoteDescription = new RTCSessionDescription(data.answerSDP);
        peer.setRemoteDescription(remoteDescription,success,failure);
    }
	if(signalingCount==0) {
		signalingCount++;
		//setTimeout(sendOffer(clID),1000);
		sendOffer(clID);
	}
	else signalingCount=0;
	//setTimeout(function(){alert("Hello")},3000);
	//setTimeout(sendDataOffer(clID),3000);
});

function success() {
	console.log("SUCCESS!\n");
}
function failure(error) {
	console.log("failure in remote...\n" + error.name);
}
function failureMessage(error) {
	console.log("fail\n" + error.name);
}

function sendOffer(clientID) {
    peer.createOffer(function(offerSDP) {
        peer.setLocalDescription(offerSDP);
		console.log(offerSDP);
        socket.emit('offer',{
            targetUser: clientID,
            offerSDP: offerSDP
        });
		console.log("Create offer");
    }, failureMessage, sdpConstraints);
}

function sendIceCandidateData() {
        peer.onicecandidate = function(event) {
			console.log("sending candidate data");
            var candidate = event.candidate;
            if(candidate) {
                socket.emit('icecandidate',{
                    targetUser: 'target-user-id',
                    candidate: candidate
                });
            }
        };
}

function sendMessage() {
	if(typeof chatChannel === 'undefined') return;
	
	var txtarea= document.getElementById('chatChannel').value;
	var html = document.getElementById('chatBox').innerHTML;
	document.getElementById('chatBox').innerHTML = html + "<p><b>"+nickName+": </b>"+txtarea+"</p>";
	chatChannel.send(nickName+"!.!/"+txtarea);
	console.log("Sending: " + txtarea);
	document.getElementById('chatChannel').value="";
}

function dataChannelHandler(dataChannel) {
	console.log("-- dataChannelHandler -- ");
	console.log(dataChannel);
	console.log(dataChannel.readyState);
	console.log(dataChannel.label);
	
	/*var dataChannelOptions = {
	  ordered: false, // do not guarantee order
	  maxRetransmitTime: 3000, // in milliseconds
	};*/


	dataChannel.onerror = function (error) {
	  console.log("Data Channel Error:", error);
	};

	dataChannel.onmessage = function (event) {
	  console.log("Got Data Channel Message:", event.data);
	var html = document.getElementById('chatBox').innerHTML;
	var str = event.data.split("!.!/");
	document.getElementById('chatBox').innerHTML = html + "<p><b>"+str[0]+": </b>"+str[1]+"</p>";
	};

	dataChannel.onopen = function () {
	  console.log("Hello world!");
	};

	dataChannel.onclose = function () {
	  console.log("The Data Channel is Closed");
	};
}

function setFunctions() {
	if(!isChrome) {
		RTCSessionDescription = mozRTCSessionDescription;
		RTCIceCandidate = mozRTCIceCandidate;
		RTCPeerConnection = mozRTCPeerConnection;
	}
}