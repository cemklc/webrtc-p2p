const localVideo = document.querySelector('#localVideo');
const remoteVideo = document.querySelector('#remoteVideo');
const hangupButton = document.getElementById('hangupButton');
const answerButton = document.getElementById('answerButton');
const callButton = document.getElementById('callButton');
const audioBtn = document.getElementById('audioBtn');
const anonEffectButton = document.getElementById('anonEffectButton');
const clearEffectButton = document.getElementById('clearEffectButton');
const selectVideo = document.getElementById('selectVideo');
const selectAudio = document.getElementById('selectAudio');


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


async function anonymousEffect(pc) {
    try {
        var sender = pc.getSenders().find(s => s.track && s.track.kind === 'audio');
        if (sender) {
            console.log(webAudio.filters);
            const filteredStream = webAudio.anonFilter(localStream);
            const filteredTrack = filteredStream.getAudioTracks()[0];
            replaceAudioTrack(pc, filteredTrack);
            sender = filteredTrack;
            sender.enabled = !audioBtn.classList.contains('muted');
            anonEffectButton.setAttribute('disabled', 'disabled');
            clearEffectButton.removeAttribute('disabled');
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
        anonEffectButton.removeAttribute('disabled');
        clearEffectButton.setAttribute('disabled', 'disabled');
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
};

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
    anonEffectButton.setAttribute('disabled', 'disabled');
    clearEffectButton.setAttribute('disabled', 'disabled');
    answerButton.setAttribute('disabled', 'disabled');
    hangupButton.setAttribute('disabled', 'disabled');

    isStarted = false;
    pc.close();
    pc = null;
};

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