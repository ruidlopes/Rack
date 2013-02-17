// Rack.js reverb unit.
// Copyright (c) Rui Lopes 2013
// Contact: ruidlopes@gmail.com
// MIT-style license.

namespace('rack.reverb.Reverb');
rack.reverb.Reverb = function(rackInstance) {
  rack.Unit.call(this, rackInstance);
  this.impulses = {};
  this.impulsesToLoad = 0;
  this.loadAllImpulses();

  this.input = this.rack.context.createGain();
  this.output = this.rack.context.createGain();
  this.input.gain.value = 1.0;
  this.output.gain.value = 1.0;

  this.convolverNode = this.rack.context.createConvolver();
};
lib.inherits(rack.reverb.Reverb, rack.Unit);

rack.reverb.Reverb.prototype.size = lib.functions.RACK2U;

rack.reverb.Reverb.prototype.loadAllImpulses = function() {
  var keys = Object.keys(rack.reverb.Impulse.descriptors);
  this.impulsesToLoad = keys.length;
  for (var i = 0; i < keys.length; ++i) {
    var key = keys[i];
    var impulse = rack.reverb.Impulse.createFromDescriptor(key);
    this.impulses[key] = impulse;
    impulse.load(this.impulseLoadCallback.bind(this));
  }
};

rack.reverb.Reverb.prototype.impulseLoadCallback = function() {
  this.impulsesToLoad--;
  if (this.impulsesToLoad == 0) {
    // loaded.
    console.log('impulses loaded');
    this.selectImpulse(0);
    this.input.connect(this.convolverNode);
    this.convolverNode.connect(this.output);
  }
};

rack.reverb.Reverb.prototype.selectImpulse = function(index) {
  var keys = Object.keys(this.impulses);
  var impulseName = keys[index];
  this.convolverNode.buffer = this.impulses[impulseName].buffer;
};

rack.reverb.Reverb.prototype.renderComponents = function() {
  this.renderPlate('#c00', '#d33', 'Reverb', '33,33,33');
  rack.Unit.prototype.renderComponents.call(this);
};

namespace('rack.reverb.Impulse');
rack.reverb.Impulse = function(name, filename) {
  this.name = name;
  this.filename = filename;

  this.buffer = null;
  this.xhr = null;
  this.callback = lib.functions.EMPTY;
};

rack.reverb.Impulse.prototype.load = function(opt_callback) {
  this.xhr = new XMLHttpRequest();
  this.xhr.open('GET', this.filename, true);
  this.xhr.responseType = 'arraybuffer';
  this.xhr.onload = this.loadSuccess.bind(this);
  this.xhr.send();
  this.callback = opt_callback || lib.functions.EMPTY;
};

rack.reverb.Impulse.prototype.loadSuccess = function() {
  rack.get().context.decodeAudioData(this.xhr.response, function(buffer) {
    this.buffer = buffer;
    this.callback();
  }.bind(this));
};


// Reverb impulses downloaded from http://www.voxengo.com/impulses/
// See website for copyright information.
rack.reverb.Impulse.descriptors = {
  'block inside': 'Block Inside.wav',
  'bottle hall': 'Bottle Hall.wav',
  'cement blocks 1': 'Cement Blocks 1.wav',
  'cement blocks 2': 'Cement Blocks 2.wav',
  'chateau de logne, outside': 'Chateau de Logne, Outside.wav',
  'conic long echo hall': 'Conic Long Echo Hall.wav',
  'deep space': 'Deep Space.wav',
  'derlon sanctuary': 'Derlon Sanctuary.wav',
  'direct cabinet N1': 'Direct Cabinet N1.wav',
  'direct cabinet N2': 'Direct Cabinet N2.wav',
  'direct cabinet N3': 'Direct Cabinet N3.wav',
  'direct cabinet N4': 'Direct Cabinet N4.wav',
  'five columns long': 'Five Columns Long.wav',
  'five columns': 'Five Columns.wav',
  'french 18th century salon': 'French 18th Century Salon.wav',
  'going home': 'Going Home.wav',
  'greek 7 echo hall': 'Greek 7 Echo Hall.wav',
  'highly damped large room': 'Highly Damped Large Room.wav',
  'in the silo revised': 'In The Silo Revised.wav',
  'in the silo': 'In The Silo.wav',
  'large bottle hall': 'Large Bottle Hall.wav',
  'large long echo hall': 'Large Long Echo Hall.wav',
  'large wide echo hall': 'Large Wide Echo Hall.wav',
  'masonic lodge': 'Masonic Lodge.wav',
  'musikvereinsaal': 'Musikvereinsaal.wav',
  'narrow bumpy space': 'Narrow Bumpy Space.wav',
  'nice drum room': 'Nice Drum Room.wav',
  'on a star': 'On a Star.wav',
  'parking garage': 'Parking Garage.wav',
  'rays': 'Rays.wav',
  'right glass triangle': 'Right Glass Triangle.wav',
  'ruby room': 'Ruby Room.wav',
  'scala milan opera hall': 'Scala Milan Opera Hall.wav',
  'small drum room': 'Small Drum Room.wav',
  'small prehistoric cave': 'Small Prehistoric Cave.wav',
  'st nicolaes church': 'St Nicolaes Church.wav',
  'trig room': 'Trig Room.wav',
  'vocal duo': 'Vocal Duo.wav'
};

rack.reverb.Impulse.createFromDescriptor = function(name) {
  var filename = rack.reverb.Impulse.descriptors[name];
  var impulse = new rack.reverb.Impulse(name, 'reverb-impulses/' + filename);
  return impulse;
};


// register this rack unit.
rack.load(rack.reverb.Reverb, 'reverb');
