/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-restricted-globals */
/* eslint-disable no-undef */
/* eslint-disable no-alert */
let isInitiator = false;
let isStarted = false;
let localStream;
let pc;
let remoteStream;
let devices;
let videoInputs;
let audioInputs;
let validRoom;

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

let audioEnabled = true;
audioBtn.addEventListener('click', () => {
  const audioTrack = localStream.getAudioTracks()[0];

  if (audioEnabled) {
    audioBtn.classList.add('muted');
    audioBtn.innerText = 'Unmute Microphone';
  } else {
    audioBtn.classList.remove('muted');
    audioBtn.innerText = 'Mute Microphone';
  }

  audioTrack.enabled = !audioEnabled;
  try {
    const sender = pc.getSenders().find((s) => s.track && s.track.kind === 'audio');
    if (sender) {
      sender.track.enabled = !audioBtn.classList.contains('muted');
    }
  } catch (error) {
    console.log('Peer connection senders not found: ', error);
  }

  audioEnabled = !audioEnabled;
});

const constraints = {
  audio: true,
  video: true,
};

/// //////////////////////////////////////////

do {
  validRoom = prompt('Enter a room name to chat with your friend:');
} while (validRoom === null || validRoom === '');

const room = validRoom;
setRoomName(room);

const socket = io();

if (room !== '') {
  socket.emit('create or join', room);
  console.log('Attempted to create or  join room', room);
}

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
    console.log('End of candidates.');
    setPeerStatus('inCall');
  }
}

function createPeerConnection() {
  if (!isStarted && typeof localStream !== 'undefined') {
    try {
      pc = new RTCPeerConnection(pcConfig);
      pc.onicecandidate = handleIceCandidate;
      pc.onaddstream = handleRemoteStreamAdded;
      pc.onremovestream = handleRemoteStreamRemoved;
      console.log('Created RTCPeerConnnection');
      isStarted = true;
      console.log('isInitiator', isInitiator);
      if (isInitiator) {
        // Enable call button for the room owner
        console.log('A new user is joined and peer connection is created, you can call your peer!');
        setPeerStatus('userJoined');
        callButton.removeAttribute('disabled');
      }
    } catch (e) {
      console.log(`Failed to create PeerConnection, exception: ${e.message}`);
      alert('Cannot create RTCPeerConnection object.');
    }
  }
}

function goToNewRoom(roomName) {
  console.log('Attempted to create or new join room', roomName);
  if (roomName === room) {
    alert(`You are already in room: ${roomName} Please enter a different room name`);
  } else if (roomName !== '') {
    isStarted = false;
    socket.emit('create or join', roomName);
    setRoomName(roomName);
  } else {
    alert('Room name can not be empty');
  }
}

socket.on('created', (roomObject) => {
  console.log(`Created room ${roomObject}`);
  isInitiator = true;
  console.log('User is set to initiator');
});

socket.on('full', (roomObject) => {
  console.log(`Room ${roomObject} is full`);
  do {
    validRoom = prompt('You have joined a room that is full, enter a different room name');
  } while (validRoom === null || validRoom === '');
  goToNewRoom(validRoom);
});

socket.on('join', (roomObject) => {
  console.log(`Another peer made a request to join room ${roomObject}`);
  console.log(`This peer is the initiator of room ${roomObject}!`);
  if (isInitiator) {
    console.log('Another user joined the room, calling createPeerConnection');
    createPeerConnection();
  }
});

socket.on('joined', (roomObject) => {
  console.log(`joined: ${roomObject}`);
  setPeerStatus('joined');
  if (isInitiator) {
    isInitiator = false;
  }
});

socket.on('log', (array) => {
  console.log(...array);
});

// This client receives a message
socket.on('message', (message) => {
  console.log('Client received message:', message);
  if (message.type === 'offer') {
    if (!isInitiator && !isStarted) {
      console.log('Offer came, calling createPeerConnection');
      createPeerConnection();
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

  if (isInitiator) {
    console.log('You are the room owner. You can call your peer when someone enters your room');
  }
}

async function init() {
  navigator.mediaDevices.getUserMedia(constraints)
    .then(gotStream)
    .catch((e) => {
      alert(`getUserMedia() error: ${e.name}`);
    });
}

console.log('Getting user media with constraints', constraints);
init();

selectAudio.onchange = async () => {
  switchDevices(pc);
};

selectFilter.onchange = async () => {
  switchFilter(pc);
};

selectVideo.onchange = async () => {
  switchDevices(pc);
};

hangupButton.onclick = async () => {
  hangup();
};

answerButton.onclick = async () => {
  console.log('clicked answer');
  doAnswer();
};

function search(ele) {
  if (isStarted) {
    alert('You can\'t switch rooms during a call..');
  } else if (event.key === 'Enter') {
    goToNewRoom(ele.value);
  }
}

newRoomButton.onclick = async () => {
  console.log('clicked new room');
  if (isStarted) {
    alert('You can\'t switch rooms during a call..');
  } else {
    goToNewRoom(roomText.value);
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
