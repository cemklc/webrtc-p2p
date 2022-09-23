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
    anon: 'anonymous',
    autowahFilter: 'autowahFilter',
    cuteRobotFilter: 'cuteRobotFilter',
}

function WebAudioExtended() {
    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    /* global AudioContext */
    this.context = new AudioContext();
    this.soundBuffer = null;
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


WebAudioExtended.prototype.getFilteredStream = function (stream, filterType) {
    switch (filterType) {
        case 'anonymous':
            stream = this.anonFilter(stream);
            return stream;
        case 'cuteRobot':
            stream = this.cuteRobotFilter(stream);
            return stream;
        case 'autowah':
            stream = this.autowahFilter(stream);
            console.log(stream);
            return stream;
        default:
            return stream;
    }
}

WebAudioExtended.prototype.autowahFilter = function (stream) {
    let source = this.context.createMediaStreamSource(stream);
    var destination = this.context.createMediaStreamDestination();

    let waveshaper = this.context.createWaveShaper();
    let awFollower = this.context.createBiquadFilter();
    awFollower.type = "lowpass";
    awFollower.frequency.value = 10.0;

    let curve = new Float32Array(65536);
    for (let i = -32768; i < 32768; i++) {
        curve[i + 32768] = ((i > 0) ? i : -i) / 32768;
    }
    waveshaper.curve = curve;
    waveshaper.connect(awFollower);

    let wetGain = this.context.createGain();
    wetGain.gain.value = 1;

    let compressor = this.context.createDynamicsCompressor();
    compressor.threshold.value = -20;
    compressor.ratio.value = 16;

    let awDepth = this.context.createGain();
    awDepth.gain.value = 11585;
    awFollower.connect(awDepth);

    let awFilter = this.context.createBiquadFilter();
    awFilter.type = "lowpass";
    awFilter.Q.value = 15;
    awFilter.frequency.value = 50;
    awDepth.connect(awFilter.frequency);
    awFilter.connect(wetGain);

    source.connect(waveshaper);
    source.connect(awFilter);

    waveshaper.connect(compressor);
    wetGain.connect(compressor);
    compressor.connect(destination);

    return destination.stream;
}


WebAudioExtended.prototype.cuteRobotFilter = function (stream) {
    let source = this.context.createMediaStreamSource(stream);
    var destination = this.context.createMediaStreamDestination();

    // Wobble
    let oscillator1 = this.context.createOscillator();
    oscillator1.frequency.value = 50;
    oscillator1.type = 'sawtooth';
    let oscillator2 = this.context.createOscillator();
    oscillator2.frequency.value = 500;
    oscillator2.type = 'sawtooth';
    let oscillator3 = this.context.createOscillator();
    oscillator3.frequency.value = 50;
    oscillator3.type = 'sawtooth';
    // ---
    let oscillatorGain = this.context.createGain();
    oscillatorGain.gain.value = 0.004;
    // ---
    let delay = this.context.createDelay();
    delay.delayTime.value = 0.01;

    // Create graph
    oscillator1.connect(oscillatorGain);
    oscillator2.connect(oscillatorGain);
    // oscillator3.connect(oscillatorGain);
    oscillatorGain.connect(delay.delayTime);
    // ---
    source.connect(delay)
    delay.connect(destination);

    // Render
    oscillator1.start(0);
    oscillator2.start(0);
    oscillator3.start(0);

    return destination.stream;
};