// Rack.js - extendable WebAudio guitar effects rack.
// Copyright (c) Rui Lopes 2013
// Contact: ruidlopes@gmail.com
// MIT-style license.

var namespace = function(ns) {
  for (var scope = window, names = ns.split('.'), name;
       name = names.shift();
       scope = scope[name]) {
    scope[name] = scope[name] || {};
  }
};

namespace('lib');
lib.inherits = function(child, base) {
  child.prototype = Object.create(base.prototype);
};
lib.isString = function(object) {
  return typeof object == 'string';
};
lib.isFunction = function(object) {
  return typeof object == 'function';
};
lib.error = function(message) {
  throw new Error(message);
};

namespace('lib.functions');
lib.functions.constant = function(constant) {
  return function() {
    return constant;
  };
};
lib.functions.EMPTY = lib.functions.constant(undefined);
lib.functions.TRUE = lib.functions.constant(true);
lib.functions.FALSE = lib.functions.constant(false);


namespace('rack');
namespace('rack.Rack');

rack.Rack = function() {
  this.context = null;
  this.units = [];

  this.canvas = document.getElementsByTagName('canvas')[0];
  this.paint = this.canvas.getContext('2d');

  this.ready = false;
};

rack.Rack.prototype.init = function() {
  this.initAudio();
  this.render();
};

rack.Rack.prototype.initAudio = function() {
  this.context = new webkitAudioContext();
  this.units.unshift(new rack.units.Output(this));
  this.units.unshift(new rack.units.Input(this));
};

rack.Rack.prototype.dispose = function() {
};

rack.Rack.prototype.isReady = function() {
  return this.ready;
};

rack.Rack.prototype.setReady = function(isReady) {
  this.ready = isReady;
  if (isReady) {
    this.rewire();
  }
};

rack.Rack.prototype.addUnit = function(unit) {
  // Last unit is reserved for audio output.
  this.units.splice(this.units.length - 1, 0, unit);
  this.rewire();
};

rack.Rack.prototype.removeUnit = function(unit) {
  this.units.splice(this.units.indexOf(unit), 1);
  this.rewire();
};

rack.Rack.prototype.moveUnit = function(from, to) {
  if (from == to) {
    return;
  }
  var unit = this.units.splice(from, 1)[0];
  this.units.splice(to, 0, unit);
  this.rewire();
};

rack.Rack.prototype.rewire = function() {
  for (var i = 0; i < this.units.length - 1; ++i) {
    var unit = this.units[i];
    var next = this.units[i+1];
    unit.output.disconnect();
    if (this.ready) {
      unit.output.connect(next.input);
    }
  }
  this.render();
};

rack.Rack.prototype.resize = function() {
  this.canvas.width = document.width;
  this.canvas.height = document.height;
  this.render();
};

rack.Rack.prototype.render = function() {
  this.renderStructure();
  for (var i = 0; i < this.units.length; ++i) {
    this.units[i].render();
  }
};

rack.Rack.prototype.renderStructure = function() {
};

rack.Rack.prototype.audio = function() {
  return this.context;
};


// Rack units.
namespace('rack.Unit');

rack.Unit = function(rackInstance) {
  this.rack = rackInstance;
  this.input = null;
  this.output = null;
};

rack.Unit.prototype.size = lib.functions.constant(1);

rack.Unit.prototype.render = lib.functions.EMPTY;

rack.Rack.load = function(unit) {
  if (lib.isString(unit)) {
    rack.Unit.fromScript(unit);
  } else if (lib.isFunction(unit)) {
    racl.Unit.fromFunction(unit);
  }
};

rack.Unit.fromScript = function(unitScriptLocation) {
  var script = document.createElement('script');
  script.src = unitScriptLocation;
  document.body.appendChild(script);
};

rack.Unit.fromFunction = function(unitConstructor) {
  rack.get().addUnit(new unitConstructor(rack.get()));
};


namespace('rack.units.Input');
rack.units.Input = function(rackInstance) {
  rack.Unit.call(this, rackInstance);
  navigator.webkitGetUserMedia(
      {video: false, audio: true},
      this.success.bind(this),
      this.error.bind(this));
};
lib.inherits(rack.units.Input, rack.Unit);

rack.units.Input.prototype.success = function(stream) {
  this.output = this.rack.context.createMediaStreamSource(stream);
  this.rack.setReady(true);
};

rack.units.Input.prototype.error = function() {
  this.rack.setReady(false);
  lib.error('no input connected');
};


namespace('rack.units.Output');
rack.units.Output = function(rackInstance) {
  rack.Unit.call(this, rackInstance);
  this.input = this.rack.context.destination;
};
lib.inherits(rack.units.Output, rack.Unit);


// Instance control.
rack.instance = rack.instance || new rack.Rack();
rack.get = function() {
  return rack.instance;
};
rack.bind = function(functionName) {
  return rack.instance[functionName].bind(rack.instance);
};
rack.load = function(unit) {
  rack.Unit.fromFunction(unit);
};

// Global events.
window.addEventListener('load', rack.bind('init'));
window.addEventListener('unload', rack.bind('dispose'));
window.addEventListener('resize', rack.bind('resize'));
