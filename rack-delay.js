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
  this.delays = [];
};
lib.inherits(rack.delay.Delay, rack.Unit);

rack.delay.Delay.MAX_DELAYS = 10;

rack.delay.Delay.prototype.renderComponents = function() {
  this.renderPlate('#00c', '03f', 'Delay', '33,33,33');
  rack.Unit.prototype.renderComponents.call(this);
};

// register this rack unit.
rack.load(rack.delay.Delay, 'delay');
