let isChannelReady = false;
let isInitiator = false;
let isStarted = false;
let localStream;
let pc;
let remoteStream;
let devices;
let videoInputs;
let audioInputs;

const pcConfig = {
  iceServers: [{
    urls: 'stun:stun.l.google.com:19302',
  }],
};

// Set up audio and video regardless of what devices are present.
const sdpConstraints = {
  offerToReceiveAudio: true,
  offerToReceiveVideo: true,
};

var audioEnabled = true
audioBtn.addEventListener('click', () => {
  const audioTrack = localStream.getAudioTracks()[0];

  if (audioEnabled) {
    audioBtn.classList.add('muted');
  } else {
    audioBtn.classList.remove('muted');
  }

  audioTrack.enabled = !audioEnabled;
  try {
    const sender = pc.getSenders().find(s => s.track && s.track.kind === 'audio');
    if (sender) {
      sender.track.enabled = !audioBtn.classList.contains('muted');
    };
  } catch (error) {
    console.log('Peer connection senders not found: ', error);
  }

  audioEnabled = !audioEnabled;
  return;
});

const constraints = {
  audio: true,
  video: true,
};

/// //////////////////////////////////////////

do {
  var validRoom = prompt("Enter a room name to chat with your friend:");
} while (validRoom === null || validRoom === "")

const room = validRoom;

const socket = io();

if (room !== '') {
  socket.emit('create or join', room);
  console.log('Attempted to create or  join room', room);
}

socket.on('created', (roomObject) => {
  console.log(`Created room ${roomObject}`);
  isInitiator = true;
  console.log('User is set to initiator');
});

socket.on('full', (roomObject) => {
  console.log(`Room ${roomObject} is full`);
});

socket.on('join', (roomObject) => {
  console.log(`Another peer made a request to join room ${roomObject}`);
  console.log(`This peer is the initiator of room ${roomObject}!`);
  isChannelReady = true;
  if (isInitiator) {
    maybeStart();
  }
});

socket.on('joined', (roomObject) => {
  console.log(`joined: ${roomObject}`);
  setPeerStatus('joined');
  if (isInitiator) {
    isInitiator = false
  }
  isChannelReady = true;
});

socket.on('log', (array) => {
  console.log(...array);
});

// This client receives a message
socket.on('message', (message) => {
  console.log('Client received message:', message);
  if (message === 'got user media') {
    maybeStart();
  } else if (message.type === 'offer') {
    if (!isInitiator && !isStarted) {
      maybeStart();
      pc.setRemoteDescription(new RTCSessionDescription(message));
    }
    console.log('Offer came from peer, you can press answer!');
    setPeerStatus('incomingCall');
    answerButton.removeAttribute('disabled');
  } else if (message.type === 'answer' && isStarted) {
    pc.setRemoteDescription(new RTCSessionDescription(message));
  } else if (message.type === 'candidate' && isStarted) {
    const candidate = new RTCIceCandidate({
      sdpMLineIndex: message.label,
      candidate: message.candidate,
    });
    pc.addIceCandidate(candidate);
  } else if (message === 'bye' && isStarted) {
    handleRemoteHangup();
  }
});

/// /////////////////////////////////////////////

function handleRemoteStreamAdded(event) {
  console.log('Remote stream added.');
  remoteStream = event.stream;
  remoteVideo.srcObject = remoteStream;
}

function handleRemoteStreamRemoved(event) {
  console.log('Remote stream removed. Event: ', event);
}

function handleIceCandidate(event) {
  console.log('icecandidate event: ', event);
  if (event.candidate) {
    sendMessage({
      type: 'candidate',
      label: event.candidate.sdpMLineIndex,
      id: event.candidate.sdpMid,
      candidate: event.candidate.candidate,
    });
  } else {
    hangupButton.removeAttribute('disabled');
    selectAudio.setAttribute('disabled', 'disabled');
    selectVideo.setAttribute('disabled', 'disabled');
    console.log('End of candidates.');
    setPeerStatus('inCall');
  }
}

function createPeerConnection() {
  try {
    pc = new RTCPeerConnection(pcConfig);
    pc.onicecandidate = handleIceCandidate;
    pc.onaddstream = handleRemoteStreamAdded;
    pc.onremovestream = handleRemoteStreamRemoved;
    console.log('Created RTCPeerConnnection');
  } catch (e) {
    console.log(`Failed to create PeerConnection, exception: ${e.message}`);
    alert('Cannot create RTCPeerConnection object.');
  }
}

function setLocalAndSendMessage(sessionDescription) {
  pc.setLocalDescription(sessionDescription);
  console.log('setLocalAndSendMessage sending message', sessionDescription);
  sendMessage(sessionDescription);
}

function handleCreateOfferError(event) {
  console.log('createOffer() error: ', event);
}

function doCall() {
  // Create offer and send it to the peer via signalling server
  console.log('Sending offer to peer');
  pc.addStream(localStream);
  pc.createOffer([sdpConstraints])
    .then((offer) => setLocalAndSendMessage(offer))
    .catch(handleCreateOfferError);
}

function maybeStart() {
  console.log('>>>>>>> maybeStart() ', isStarted, localStream, isChannelReady);
  if (!isStarted && typeof localStream !== 'undefined' && isChannelReady) {
    console.log('>>>>>> creating peer connection');
    createPeerConnection();
    isStarted = true;
    console.log('isInitiator', isInitiator);
    if (isInitiator) {
      // Enable call button for the room owner
      console.log('A new user is joined and peer connection is created, you can call your peer!');
      setPeerStatus('userJoined');
      callButton.removeAttribute('disabled');
    }
  }
}

// Create answer and send it to the peer via signalling server
function doAnswer() {
  console.log('Sending answer to peer.');
  pc.addStream(localStream);
  pc.createAnswer()
    .then((answer) => setLocalAndSendMessage(answer))
    .catch(onCreateSessionDescriptionError);
  answerButton.setAttribute('disabled', 'disabled');
}

/// /////////////////////////////////////////////

async function gotStream(stream) {
  console.log('Adding local stream.');
  localStream = stream;
  localVideo.srcObject = stream;
  // Get available devices 
  getAvailableDevices();

  sendMessage('got user media');
  if (isInitiator) {
    maybeStart();
  }
}

async function init() {
  navigator.mediaDevices.getUserMedia(constraints)
    .then(gotStream)
    .catch((e) => {
      alert(`getUserMedia() error: ${e.name}`);
    });
};

console.log('Getting user media with constraints', constraints);
init();

selectAudio.onchange = async () => {
  switchDevices();
}

selectFilter.onchange = async () => {
  switchFilter(pc);
}

selectVideo.onchange = async () => {
  switchDevices();
}

hangupButton.onclick = async () => {
  hangup();
}

answerButton.onclick = async () => {
  console.log('clicked answer');
  doAnswer();
};

function search(ele) {
  if (isStarted) {
    alert("You can't switch rooms during a call..")
  } else {
    if (event.key === 'Enter') {
      goToNewRoom(ele.value);
    }
  }
}

newRoomButton.onclick = async () => {
  console.log('clicked new room');
  if (isStarted) {
    alert("You can't switch rooms during a call..")
  } else {
    goToNewRoom(roomText.value);
  }
}

function goToNewRoom(roomName) {
  console.log('Attempted to create or new join room', roomName);
  if (roomName !== '') {
    isStarted = false;
    isChannelReady = false;
    socket.emit('create or join', roomName);
  } else {
    alert('Room name can not be empty');
  }
};


callButton.onclick = async () => {
  console.log('clicked call');
  doCall();
  callButton.setAttribute('disabled', 'disabled');
  setPeerStatus('calling');
};
/// /////////////////////////////////////////////

window.onbeforeunload = function bye() {
  sendMessage('bye');
};

/// ////////////////////////////////////////