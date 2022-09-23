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

async function getAvailableDevices() {
    // Get available devices 
    try {
        devices = await navigator.mediaDevices.enumerateDevices();
        videoInputs = devices.filter(e => e.kind === 'videoinput');
        audioInputs = devices.filter(e => e.kind === 'audioinput');
        populateOptions(videoInputs, selectVideo);
        populateOptions(audioInputs, selectAudio);
    } catch (error) {
        console.log('Error when getting available devices');
        console.log(error);
    }
    return true;
};

async function populateOptions(deviceInputs, deviceType) {
    let index = 0
    for (item in deviceInputs) {
        var opt = document.createElement('option');
        opt.value = deviceInputs[item].deviceId;
        opt.innerHTML = deviceInputs[item].label;
        deviceType.appendChild(opt);
        index++
    }
};

async function applyFilter(pc, filterType) {
    try {
        var sender = pc.getSenders().find(s => s.track && s.track.kind === 'audio');
        if (sender) {
            const filteredStream = webAudio.getFilteredStream(localStream, filterType);
            console.log(filteredStream);
            const filteredTrack = filteredStream.getAudioTracks()[0];
            replaceAudioTrack(pc, filteredTrack);
            sender = filteredTrack;
            sender.enabled = !audioBtn.classList.contains('muted');
        } else {
            console.log("Filter didn't applied");
        }
    }
    catch (e) {
        console.log("Error: ", e);
        console.log("Filter didn't applied");
    }
};


async function clearFilterEffect(pc) {
    var audioDeviceId = selectAudio.options[selectAudio.selectedIndex].value;
    var videoDeviceId = selectVideo.options[selectVideo.selectedIndex].value;
    try {
        let stream = await navigator.mediaDevices.getUserMedia({
            audio: { deviceId: audioDeviceId },
            video: { deviceId: videoDeviceId }
        });
        localStream = stream;
        const clearTrack = localStream.getAudioTracks()[0];
        replaceAudioTrack(pc, clearTrack);
        localVideo.srcObject = stream;
    } catch (error) {
        alert(error.message);
    }
    return;
};



function replaceAudioTrack(pc, withTrack) {
    const sender = pc.getSenders().find(s => s.track && s.track.kind === 'audio');
    if (sender) {
        sender.replaceTrack(withTrack);
    };
    return;
};

async function switchFilter(pc) {
    var selectedFilter = selectFilter.options[selectFilter.selectedIndex].value;

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
};

async function switchDevices(pc) {
    var audioDeviceId = selectAudio.options[selectAudio.selectedIndex].value;
    var videoDeviceId = selectVideo.options[selectVideo.selectedIndex].value;
    try {
        let stream = await navigator.mediaDevices.getUserMedia({
            audio: { deviceId: audioDeviceId },
            video: { deviceId: videoDeviceId }
        });
        localStream = stream;
        localVideo.srcObject = stream;
        console.log('Switched devices');
        if (pc) {
            let sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
            if (sender) {
                replaceTracks(pc, localStream.getVideoTracks()[0], localStream.getAudioTracks()[0]);
            };
        }
    } catch (error) {
        alert(error.message);
    }
    return;
};

function replaceTracks(pc, videoTrack, audioTrack) {
    const video = pc.getSenders().find(s => s.track && s.track.kind === 'video');
    const audio = pc.getSenders().find(s => s.track && s.track.kind === 'audio');
    if (video) {
        video.replaceTrack(videoTrack);
    };
    if (audio) {
        audio.replaceTrack(audioTrack);
    }
    return;
};

// Status messages to keep track of the room and the call
function setPeerStatus(status) {
    var notification = '';
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
    return;
};

function onCreateSessionDescriptionError(error) {
    trace(`Failed to create session description: ${error.toString()}`);
};

function stop() {
    // Set button availabilities
    selectAudio.removeAttribute('disabled');
    selectVideo.removeAttribute('disabled');
    answerButton.setAttribute('disabled', 'disabled');
    hangupButton.setAttribute('disabled', 'disabled');

    isStarted = false;
    pc.close();
    pc = null;
};

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
};

function sendMessage(message) {
    console.log('Client sending message: ', message);
    socket.emit('message', message);
}

function setRoomName(roomName) {
    document.getElementById('currentRoom').innerText = roomName;
}