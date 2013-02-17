// Rack.js reverb unit.
// Copyright (c) Rui Lopes 2013
// Contact: ruidlopes@gmail.com
// MIT-style license.

namespace('rack.Reverb');
rack.Reverb = function(rackInstance) {
  rack.Unit.call(this, rackInstance);
  this.input = this.rack.context.createGain();
  this.output = this.rack.context.createGain();
  this.input.gain.value = 1.0;
  this.output.gain.value = 1.0;
  this.input.connect(this.output);
};
lib.inherits(rack.Reverb, rack.Unit);

rack.Reverb.prototype.size = lib.functions.RACK2U;

rack.Reverb.prototype.renderComponents = function() {
  this.renderPlate('#c00', '#d33', 'Reverb', '33,33,33');
  rack.Unit.prototype.renderComponents.call(this);
};

// register this rack unit.
rack.load(rack.Reverb, 'reverb');
