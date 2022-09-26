/* eslint-disable no-plusplus */
/*
 *  Copyright (c) 2015 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

// WebAudioExtended helper class which takes care of the WebAudio related parts.
class WebAudioExtended {
  constructor() {
    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    this.context = new AudioContext();
  }

  getFilteredStream(stream, filterType) {
    let filteredStream;
    switch (filterType) {
      case this.filters.anonymousFilter:
        filteredStream = this.anonFilter(stream);
        return filteredStream;
      case this.filters.cuteRobotFilter:
        filteredStream = this.cuteRobotFilter(stream);
        return filteredStream;
      case this.filters.autowahFilter:
        filteredStream = this.autowahFilter(stream);
        return filteredStream;
      default:
        return stream;
    }
  }

  anonFilter(stream) {
    const source = this.context.createMediaStreamSource(stream);
    const destination = this.context.createMediaStreamDestination();

    const oscillator1 = this.context.createOscillator();
    oscillator1.frequency.value = -10;
    oscillator1.type = 'sawtooth';

    const oscillator2 = this.context.createOscillator();
    oscillator2.frequency.value = 50;
    oscillator2.type = 'sawtooth';

    const oscillator3 = this.context.createOscillator();
    oscillator3.frequency.value = 30;
    oscillator3.type = 'sawtooth';
    // ---
    const oscillatorGain = this.context.createGain();
    oscillatorGain.gain.value = 0.007;
    // ---
    const oscillatorGain2 = this.context.createGain();
    oscillatorGain2.gain.value = 0.007;
    // ---
    const delay = this.context.createDelay();
    delay.delayTime.value = 0.01;
    // ---
    const delay2 = this.context.createDelay();
    delay2.delayTime.value = 0.01;

    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 2000;

    const compressor = this.context.createDynamicsCompressor();
    const compressor2 = this.context.createDynamicsCompressor();
    const compressor3 = this.context.createDynamicsCompressor();
    const compressor4 = this.context.createDynamicsCompressor();
    const compressor5 = this.context.createDynamicsCompressor();

    oscillator1.connect(oscillatorGain);
    oscillator2.connect(oscillatorGain);
    oscillatorGain.connect(delay.delayTime);
    source.connect(compressor2);
    compressor2.connect(delay);
    delay.connect(compressor3);
    compressor3.connect(filter);
    filter.connect(compressor5);
    oscillator3.connect(oscillatorGain2);
    oscillatorGain2.connect(delay2.delayTime);
    source.connect(compressor);
    compressor.connect(delay2);
    delay2.connect(compressor4);
    compressor4.connect(filter);
    filter.connect(compressor5);
    compressor5.connect(destination);

    oscillator1.start(0);
    oscillator2.start(0);
    oscillator3.start(0);

    return destination.stream;
  }

  autowahFilter(stream) {
    const source = this.context.createMediaStreamSource(stream);
    const destination = this.context.createMediaStreamDestination();

    const waveshaper = this.context.createWaveShaper();
    const awFollower = this.context.createBiquadFilter();
    awFollower.type = 'lowpass';
    awFollower.frequency.value = 10.0;

    const curve = new Float32Array(65536);
    for (let i = -32768; i < 32768; i++) {
      curve[i + 32768] = ((i > 0) ? i : -i) / 32768;
    }
    waveshaper.curve = curve;
    waveshaper.connect(awFollower);

    const wetGain = this.context.createGain();
    wetGain.gain.value = 1;

    const compressor = this.context.createDynamicsCompressor();
    compressor.threshold.value = -20;
    compressor.ratio.value = 16;

    const awDepth = this.context.createGain();
    awDepth.gain.value = 11585;
    awFollower.connect(awDepth);

    const awFilter = this.context.createBiquadFilter();
    awFilter.type = 'lowpass';
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

  cuteRobotFilter(stream) {
    const source = this.context.createMediaStreamSource(stream);
    const destination = this.context.createMediaStreamDestination();

    // Wobble
    const oscillator1 = this.context.createOscillator();
    oscillator1.frequency.value = 50;
    oscillator1.type = 'sawtooth';
    const oscillator2 = this.context.createOscillator();
    oscillator2.frequency.value = 500;
    oscillator2.type = 'sawtooth';
    const oscillator3 = this.context.createOscillator();
    oscillator3.frequency.value = 50;
    oscillator3.type = 'sawtooth';
    // ---
    const oscillatorGain = this.context.createGain();
    oscillatorGain.gain.value = 0.004;
    // ---
    const delay = this.context.createDelay();
    delay.delayTime.value = 0.01;

    // Create graph
    oscillator1.connect(oscillatorGain);
    oscillator2.connect(oscillatorGain);
    // oscillator3.connect(oscillatorGain);
    oscillatorGain.connect(delay.delayTime);
    // ---
    source.connect(delay);
    delay.connect(destination);

    // Render
    oscillator1.start(0);
    oscillator2.start(0);
    oscillator3.start(0);

    return destination.stream;
  }
}
WebAudioExtended.prototype.filters = {
  anonymousFilter: 'anonymous',
  autowahFilter: 'autowah',
  cuteRobotFilter: 'cuteRobot',
  noFilter: 'noFilter',
};
