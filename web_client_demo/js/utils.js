/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-alert */
/* eslint-disable no-undef */
const localVideo = document.querySelector('#localVideo');
const remoteVideo = document.querySelector('#remoteVideo');
const hangupButton = document.getElementById('hangupButton');
const answerButton = document.getElementById('answerButton');
const callButton = document.getElementById('callButton');
const audioBtn = document.getElementById('audioBtn');
const selectVideo = document.getElementById('selectVideo');
const selectAudio = document.getElementById('selectAudio');
const selectFilter = document.getElementById('selectFilter');
const newRoomButton = document.getElementById('roomButton');
const roomText = document.getElementById('newRoomtext');

const webAudio = new WebAudioExtended();

function populateOptions(deviceInputs, deviceType) {
  Object.values(deviceInputs).forEach((input) => {
    const opt = document.createElement('option');
    opt.value = input.deviceId;
    opt.innerHTML = input.label;
    deviceType.appendChild(opt);
  });
}

async function getAvailableDevices() {
  // Get available devices and fill the select forms
  try {
    devices = await navigator.mediaDevices.enumerateDevices();
    videoInputs = devices.filter((e) => e.kind === 'videoinput');
    audioInputs = devices.filter((e) => e.kind === 'audioinput');
    populateOptions(videoInputs, selectVideo);
    populateOptions(audioInputs, selectAudio);
  } catch (error) {
    console.log('Error when getting available devices');
    console.log(error);
  }
  return true;
}

// Replace the audio track with a new one
function replaceAudioTrack(pc, withTrack) {
  const sender = pc.getSenders().find((s) => s.track && s.track.kind === 'audio');
  if (sender) {
    sender.replaceTrack(withTrack);
  }
}

// Apply voice effect filter
async function applyFilter(pc, filterType) {
  try {
    let sender = pc.getSenders().find((s) => s.track && s.track.kind === 'audio');
    if (sender) {
      const filteredStream = webAudio.getFilteredStream(localStream, filterType);
      const filteredTrack = filteredStream.getAudioTracks()[0];
      replaceAudioTrack(pc, filteredTrack);
      sender = filteredTrack;
      sender.enabled = !audioBtn.classList.contains('muted');
    } else {
      console.log('Filter didn\'t applied');
    }
  } catch (e) {
    console.log('Error when applying voice filter: ', e);
  }
}

async function clearFilterEffect(pc) {
  const audioDeviceId = selectAudio.options[selectAudio.selectedIndex].value;
  const videoDeviceId = selectVideo.options[selectVideo.selectedIndex].value;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { deviceId: audioDeviceId },
      video: { deviceId: videoDeviceId },
    });
    localStream = stream;
    const clearTrack = localStream.getAudioTracks()[0];
    replaceAudioTrack(pc, clearTrack);
    localVideo.srcObject = stream;
  } catch (error) {
    alert(error.message);
  }
}

async function switchFilter(pc) {
  const selectedFilter = selectFilter.options[selectFilter.selectedIndex].value;

  console.log('filter switched to: ', selectedFilter);
  switch (selectedFilter) {
    case 'noFilter':
      clearFilterEffect(pc);
      break;
    case 'anonymous':
      applyFilter(pc, 'anonymous');
      break;
    case 'cuteRobot':
      applyFilter(pc, 'cuteRobot');
      break;
    case 'autowah':
      applyFilter(pc, 'autowah');
      break;
    default:
      clearFilterEffect(pc);
  }
}

function replaceTracks(pc, videoTrack, audioTrack) {
  const video = pc.getSenders().find((s) => s.track && s.track.kind === 'video');
  const audio = pc.getSenders().find((s) => s.track && s.track.kind === 'audio');
  if (video) {
    video.replaceTrack(videoTrack);
  }
  if (audio) {
    // eslint-disable-next-line no-param-reassign
    audioTrack.enabled = !audioBtn.classList.contains('muted');
    audio.replaceTrack(audioTrack);
  }
}

// Switch camera or microphone device and set both local and remote streams
async function switchDevices(pc) {
  const audioDeviceId = selectAudio.options[selectAudio.selectedIndex].value;
  const videoDeviceId = selectVideo.options[selectVideo.selectedIndex].value;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { deviceId: audioDeviceId },
      video: { deviceId: videoDeviceId },
    });
    localStream = stream;
    localVideo.srcObject = stream;
    console.log('Switched devices');
    if (pc) {
      replaceTracks(pc, localStream.getVideoTracks()[0], localStream.getAudioTracks()[0]);
    }
  } catch (error) {
    alert(error.message);
  }
}

// Status messages to keep track of the room and the call
function setPeerStatus(status) {
  let notification = '';
  switch (status) {
    case 'userJoined':
      notification = 'A user has joined the room, you can call now';
      break;
    case 'joined':
      notification = 'You have joined the room, wait for the call from the room owner';
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
    case 'calling':
      notification = 'Calling...';
      break;

    default:
      notification = 'The room is empty';
  }
  document.getElementById('peerId').innerText = notification;
}

function onCreateSessionDescriptionError(error) {
  console.log(`Failed to create session description: ${error.toString()}`);
}

function stop() {
  // Set button availabilities
  answerButton.setAttribute('disabled', 'disabled');
  hangupButton.setAttribute('disabled', 'disabled');

  isStarted = false;
  pc.close();
  pc = null;
}

function sendMessage(message) {
  console.log('Client sending message: ', message);
  socket.emit('message', message);
}

function hangup() {
  console.log('Hanging up.');
  setPeerStatus('closed');
  stop();
  sendMessage('bye');
}

function handleRemoteHangup() {
  console.log('Session terminated.');
  setPeerStatus('closed');
  stop();
  isInitiator = false;
}

function setRoomName(roomName) {
  document.getElementById('currentRoom').innerText = roomName;
}
