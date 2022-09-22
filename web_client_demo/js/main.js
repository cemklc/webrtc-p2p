let isChannelReady = false;
let isInitiator = false;
let isStarted = false;
let localStream;
let pc;
let remoteStream;
let remoteOffer;

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

const localVideo = document.querySelector('#localVideo');
const remoteVideo = document.querySelector('#remoteVideo');
const hangupButton = document.getElementById('hangupButton');
const answerButton = document.getElementById('answerButton');
const callButton = document.getElementById('callButton');
const selectVideo = document.getElementById('selectVideo');
const selectAudio = document.getElementById('selectAudio');

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
// const socket = io("ws://localhost:80");

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
  if(!isInitiator){
    isInitiator = true;
  }
  isChannelReady = true;
});

socket.on('joined', (roomObject) => {
  console.log(`joined: ${roomObject}`);
  isChannelReady = true;
});

socket.on('log', (array) => {
  console.log(...array);
});

function sendMessage(message) {
  console.log('Client sending message: ', message);
  socket.emit('message', message);
}

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
  pc.createOffer([sdpConstraints])
    .then((offer) => setLocalAndSendMessage(offer))
    .catch(handleCreateOfferError);
}

function maybeStart() {
  console.log('>>>>>>> maybeStart() ', isStarted, localStream, isChannelReady);
  if (!isStarted && typeof localStream !== 'undefined' && isChannelReady) {
    console.log('>>>>>> creating peer connection');
    createPeerConnection();
    pc.addStream(localStream);
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
// Status messages to keep track of the room and the call
function setPeerStatus(status) {
  var notification = '';
  switch (status) {
    case 'userJoined':
      notification = 'A user has joined the room, you can call now';
      break;
    case 'joinedNoCall':
      notification = 'You have joined the room, wait for the call';
      break;
    case 'incomingCall':
      notification = 'You have an incoming call and can answer now';
      break;
    case 'inCall':
      notification = 'You are in a call';
      break;
    case 'closed':
      notification = 'Call ended';
      break;
    default:
      notification = 'The room is empty';
  }
  document.getElementById('peerId').innerText = notification;
  return;
}

function onCreateSessionDescriptionError(error) {
  trace(`Failed to create session description: ${error.toString()}`);
}

// Create answer and send it to the peer via signalling server
function doAnswer() {
  console.log('Sending answer to peer.');
  pc.setRemoteDescription(new RTCSessionDescription(remoteOffer));
  pc.createAnswer()
    .then((answer) => setLocalAndSendMessage(answer))
    .catch(onCreateSessionDescriptionError);
  answerButton.setAttribute('disabled', 'disabled');
}

/// /////////////////////////////////////////////

console.log('Getting user media with constraints', constraints);

async function gotStream(stream) {
  console.log('Adding local stream.');
  localStream = stream;
  localVideo.srcObject = stream;

  // Get available devices 
  devices = await navigator.mediaDevices.enumerateDevices();
  videoInputs = devices.filter(e => e.kind === 'videoinput');
  audioInputs = devices.filter(e => e.kind === 'audioinput');
  populateOptions(videoInputs, selectVideo);
  populateOptions(audioInputs, selectAudio);


  sendMessage('got user media');
  if (isInitiator) {
    maybeStart();
  }
}

async function populateOptions(deviceInputs, deviceType) {
  let index = 0
  for (item in deviceInputs) {
    var opt = document.createElement('option');
    opt.value = deviceInputs[item].deviceId;
    opt.innerHTML = deviceInputs[item].label;
    deviceType.appendChild(opt);
    index++
  }
}

async function init() {
  navigator.mediaDevices.getUserMedia(constraints)
    .then(gotStream)
    .catch((e) => {
      alert(`getUserMedia() error: ${e.name}`);
    });
};

selectAudio.onchange = async () => {
  switchDevices();
}

selectVideo.onchange = async () => {
  switchDevices();
}

async function switchDevices() {
  var audioDeviceId = selectAudio.options[selectAudio.selectedIndex].value;
  var videoDeviceId = selectVideo.options[selectVideo.selectedIndex].value;
  try {
    let stream = await navigator.mediaDevices.getUserMedia({
      audio: { deviceId: audioDeviceId },
      video: { deviceId: videoDeviceId }
    });
    localStream = stream;
    localVideo.srcObject = stream;
    console.log('Switched local stream');
  } catch (error) {
    alert(error.message);
  }
  return;
}

function replaceTrack(withTrack) {
  const sender = pc.getSenders().find(s => s.track && s.track.kind === withTrack.type);
  if (sender) {
    sender.replaceTrack(withTrack);
  };
  return;
}

init();

hangupButton.onclick = async () => {
  hangup();
}

answerButton.onclick = async () => {
  console.log('clicked answer');
  doAnswer();
};

callButton.onclick = async () => {
  console.log('clicked call');
  doCall();
  callButton.setAttribute('disabled', 'disabled');
};
/// /////////////////////////////////////////////

function stop() {
  // Set button availabilities
  selectAudio.removeAttribute('disabled');
  selectVideo.removeAttribute('disabled');
  answerButton.setAttribute('disabled', 'disabled');
  hangupButton.setAttribute('disabled', 'disabled');

  isStarted = false;
  pc.close();
  pc = null;
}

function handleRemoteHangup() {
  console.log('Session terminated.');
  setPeerStatus('closed');
  stop();
  isInitiator = false;
}

// This client receives a message
socket.on('message', (message) => {
  console.log('Client received message:', message);
  if (message === 'got user media') {
    maybeStart();
  } else if (message.type === 'offer') {
    if (!isInitiator && !isStarted) {
      maybeStart();
    }
    remoteOffer = message;
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

/// /////////////////////////////////////////////////

window.onbeforeunload = function bye() {
  sendMessage('bye');
};

function hangup() {
  console.log('Hanging up.');
  setPeerStatus('closed');
  stop();
  sendMessage('bye');
}

/// ////////////////////////////////////////