// Rack.js distortion unit.
// Copyright (c) Rui Lopes 2013
// Contact: ruidlopes@gmail.com
// MIT-style license.

namespace('rack.Distortion');
rack.Distortion = function(rackInstance) {
  rack.Unit.call(this, rackInstance);
  this.distortion = 0.0;
  this.curve = new Float32Array(rack.Distortion.SAMPLES);
  this.input = this.rack.context.createGain();
  this.input.gain.value = 0.0;
  this.output = this.rack.context.createWaveShaper();
  this.output.curve = this.curve;
  this.input.connect(this.output);
  this.knobs.push(new rack.Knob(this, 'distortion', -100, 35, '#111', '#f00', '#c00'));
  this.knobs.push(new rack.Knob(this, 'level', -200, 35, '#111', '#f00', '#c00'));
};
lib.inherits(rack.Distortion, rack.Unit);

rack.Distortion.SAMPLES = 2048;

rack.Distortion.prototype.computeCurve = function() {
  a = this.distortion;
  var k = 2 * a / (1 - a);
  for (var i = 0; i < rack.Distortion.SAMPLES; ++i) {
    var x = (i - 0) * (1 - (-1)) / (rack.Distortion.SAMPLES - 0) + (-1);
    this.curve[i] = (1 + k) * x / (1 + k * Math.abs(x));
  }
};

rack.Distortion.prototype.onKnobValueChanged = function(knob, newValue) {
  switch (knob.name) {
    case 'distortion':
      this.distortion = lib.math.clamp(newValue, 0.01, 0.985);;
      this.computeCurve();
      break;
    case 'level':
      this.input.gain.value = newValue * 0.5;
      break;
  }
  this.render();
};

rack.Distortion.prototype.renderComponents = function() {
  this.renderPlate('#000', '#333', 'Distortion', '255,0,0');
  rack.Unit.prototype.renderComponents.call(this);
};


// register this rack unit.
rack.load(rack.Distortion, 'distortion');
