/*
 *  Copyright (c) 2015 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

'use strict';

// WebAudioExtended helper class which takes care of the WebAudio related parts.

WebAudioExtended.prototype.filters = {
    troll: 'troll',
    anon: 'anonymous'
}

function WebAudioExtended() {
    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    /* global AudioContext */
    this.context = new AudioContext();
    this.soundBuffer = null;
}

WebAudioExtended.prototype.dummyFilter = function (stream) {
    var source = this.context.createMediaStreamSource(stream);
    var distortion = this.context.createWaveShaper();
    var filter = this.context.createBiquadFilter();
    var destination = this.context.createMediaStreamDestination();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(500, this.context.currentTime);
    filter.gain.setValueAtTime(25, this.context.currentTime);
    source.connect(distortion);
    //filter.connect(distortion);
    distortion.connect(filter);
    //convolver.connect(filter);
    filter.connect(destination);

    return destination.stream;
}
WebAudioExtended.prototype.anonFilter = function (stream) {
    let source = this.context.createMediaStreamSource(stream);
    var destination = this.context.createMediaStreamDestination();

    let oscillator1 = this.context.createOscillator();
    oscillator1.frequency.value = -10;
    oscillator1.type = 'sawtooth';

    let oscillator2 = this.context.createOscillator();
    oscillator2.frequency.value = 50;
    oscillator2.type = 'sawtooth';

    let oscillator3 = this.context.createOscillator();
    oscillator3.frequency.value = 30;
    oscillator3.type = 'sawtooth';
    // ---
    let oscillatorGain = this.context.createGain();
    oscillatorGain.gain.value = 0.007;
    // ---
    let oscillatorGain2 = this.context.createGain();
    oscillatorGain2.gain.value = 0.007;
    // ---
    let delay = this.context.createDelay();
    delay.delayTime.value = 0.01;
    // ---
    let delay2 = this.context.createDelay();
    delay2.delayTime.value = 0.01;

    let filter = this.context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 2000;

    let compressor = this.context.createDynamicsCompressor();
    let compressor2 = this.context.createDynamicsCompressor();
    let compressor3 = this.context.createDynamicsCompressor();
    let compressor4 = this.context.createDynamicsCompressor();
    let compressor5 = this.context.createDynamicsCompressor();

    oscillator1.connect(oscillatorGain);
    oscillator2.connect(oscillatorGain);
    oscillatorGain.connect(delay.delayTime);
    source.connect(compressor2)
    compressor2.connect(delay);
    delay.connect(compressor3)
    compressor3.connect(filter);
    filter.connect(compressor5)
    oscillator3.connect(oscillatorGain2);
    oscillatorGain2.connect(delay2.delayTime);
    source.connect(compressor)
    compressor.connect(delay2);
    delay2.connect(compressor4)
    compressor4.connect(filter)
    filter.connect(compressor5);
    compressor5.connect(destination);

    oscillator1.start(0);
    oscillator2.start(0);
    oscillator3.start(0);

    return destination.stream;
}

WebAudioExtended.prototype.applyFilter = function (stream) {
    this.mic = this.context.createMediaStreamSource(stream);
    this.mic.connect(this.filter);
    this.peer = this.context.createMediaStreamDestination();

    function makeDistortionCurve(amount) {
        const k = typeof amount === "number" ? amount : 50;
        const n_samples = 44100;
        const curve = new Float32Array(n_samples);
        const deg = Math.PI / 180;

        for (let i = 0; i < n_samples; i++) {
            const x = (i * 2) / n_samples - 1;
            curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
        }
        return curve;
    }

    // …
    this.filter.curve = makeDistortionCurve(400);
    this.filter.oversample = "4x";
    this.filter.connect(this.peer);
    return this.peer.stream;
};

WebAudioExtended.prototype.clearFilter = async function () {
    try {
        let stream = await navigator.mediaDevices.getUserMedia({
            audio: { deviceId: audioDeviceId },
            video: { deviceId: videoDeviceId }
        });
        return stream;
    } catch (error) {
        alert(error.message);
    }
};