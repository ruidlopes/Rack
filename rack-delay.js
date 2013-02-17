// Rack.js delay unit.
// Copyright (c) Rui Lopes 2013
// Contact: ruidlopes@gmail.com
// MIT-style license.

namespace('rack.delay.Delay');
rack.delay.Delay = function(rackInstance) {
  rack.Unit.call(this, rackInstance);
  this.input = this.rack.context.createGain();
  this.output = this.rack.context.createGain();
  this.input.gain.value = 1.0;
  this.output.gain.value = 1.0;
  this.input.connect(this.output);
  this.knobs.push(new rack.Knob(this, 'taps', -100, 35, '#000', '#333'));
  this.knobs.push(new rack.Knob(this, 'time', -200, 35, '#000', '#333'));

  this.delays = [];
  this.activeDelays = 0;
  this.tapTime = 0;
  this.createDelays();
};
lib.inherits(rack.delay.Delay, rack.Unit);

rack.delay.Delay.MAX_DELAYS = 10;

rack.delay.Delay.prototype.createDelays = function() {
  for (var i = 0; i < rack.delay.Delay.MAX_DELAYS; ++i) {
    this.delays.push(new rack.delay.DelayLine(this));
  }
  this.updateDelays();
};

rack.delay.Delay.prototype.updateDelays = function() {
  for (var i = 0; i < rack.delay.Delay.MAX_DELAYS; ++i) {
    if (i < this.activeDelays) {
      this.delays[i].connect(this.tapTime * i, 1.0 - (i/this.activeDelays));
    } else {
      this.delays[i].disconnect();
    }
  }
};

rack.delay.Delay.prototype.onKnobValueChanged = function(knob, newValue) {
  switch (knob.name) {
    case 'taps':
      this.activeDelays = Math.floor(newValue * 10);
      this.updateDelays();
      break;
    case 'time':
      this.tapTime = newValue * 5;
      this.updateDelays();
      break;
  }
  this.render();
};

rack.delay.Delay.prototype.renderComponents = function() {
  this.renderPlate('#00c', '03f', 'Delay', '33,33,33');
  rack.Unit.prototype.renderComponents.call(this);
};


namespace('rack.delay.DelayLine');
rack.delay.DelayLine = function(delay) {
  this.delay = delay;
  this.delayNode = this.delay.rack.context.createDelay(5.0 /** max seconds for buffering */);
  this.gainNode = this.delay.rack.context.createGain();
  this.gainNode.gain.value = 1.0;
  this.delay.input.connect(this.delayNode);
  this.delayNode.connect(this.gainNode);
};

rack.delay.DelayLine.prototype.connect = function(opt_time, opt_gain) {
  this.delayNode.delayTime.value = opt_time || 0.0;
  this.gainNode.gain.value = opt_gain || 1.0;
  this.gainNode.connect(this.delay.output);
};

rack.delay.DelayLine.prototype.disconnect = function() {
  this.gainNode.disconnect();
};

// register this rack unit.
rack.load(rack.delay.Delay, 'delay');
