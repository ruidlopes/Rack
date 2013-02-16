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
lib.functions.RACK1U = lib.functions.constant(1);
lib.functions.RACK2U = lib.functions.constant(2);
lib.functions.RACK3U = lib.functions.constant(3);

namespace('lib.paint');
lib.paint.roundedRectangle = function(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
};
lib.paint.circle = function(ctx, x, y, r, c) {
  ctx.fillStyle = c;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 2 * Math.PI);
  ctx.closePath();
  ctx.fill();
};
lib.paint.screw = function(ctx, x, y) {
  lib.paint.circle(ctx, x, y, 7, 'rgba(0, 0, 0, 0.25)');
  lib.paint.circle(ctx, x, y, 8, 'rgba(99, 99, 99, 0.15)');
  lib.paint.circle(ctx, x, y, 5, '#eee');
  ctx.save();
  ctx.translate(-10, -5);
  ctx.beginPath();
  ctx.moveTo(x + 5, y + 5);
  ctx.lineTo(x + 15, y + 5);
  ctx.closePath();
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.stroke();
  ctx.restore();
};
lib.paint.text = function(ctx, text, x, y, color, font) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.font = font;
  ctx.fillText(text, x, y);
  ctx.restore();
};
lib.paint.line = function(ctx, x1, y1, x2, y2, c) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.lineWidth = 1;
  ctx.closePath();
  ctx.strokeStyle = c;
  ctx.stroke();
};


namespace('rack');
namespace('rack.Rack');

rack.Rack = function() {
  this.context = null;
  this.units = [];

  this.canvas = document.getElementById('rack-canvas');
  this.paint = this.canvas.getContext('2d');

  this.ready = false;
};

rack.Rack.prototype.init = function() {
  this.initAudio();
  this.resize();
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
    this.paint.translate(0, /** spacing */5 + i * rack.Unit.UNIT_SIZE);
    this.units[i].render();
  }
};

rack.Rack.prototype.renderStructure = function() {
  this.paint.translate(0, 0);
  this.paint.save();
  var w = 30;
  this.paint.fillStyle = '#444';
  this.paint.fillRect(0, 0, w, this.canvas.height);
  this.paint.fillRect(this.canvas.width - w, 0, this.canvas.width, this.canvas.height);
  this.paint.restore();
};

rack.Rack.prototype.audio = function() {
  return this.context;
};


// Rack units.
namespace('rack.Unit');

rack.Unit = function(rackInstance) {
  this.rack = rackInstance;
  this.canvas = rackInstance.canvas;
  this.paint = rackInstance.paint;
  this.input = null;
  this.output = null;
};

rack.Unit.UNIT_SIZE = 100;

rack.Unit.prototype.size = lib.functions.RACK1U;

rack.Unit.prototype.render = lib.functions.EMPTY;

rack.Unit.prototype.renderPlate = function(color, highlight, title, opt_titleColor) {
  this.paint.save();

  var w = this.canvas.width - 7;
  var h = rack.Unit.UNIT_SIZE * this.size();
  this.paint.fillStyle = 'rgba(0, 0, 0, 0.3)';
  lib.paint.roundedRectangle(this.paint, 4, 1, w + 1, h + 1, 8);
  this.paint.fill();

  var gradient = this.paint.createLinearGradient(0, 0, w, 0);
  gradient.addColorStop(0, color);
  gradient.addColorStop(0.3, color);
  gradient.addColorStop(0.5, highlight);
  gradient.addColorStop(0.7, color);
  this.paint.fillStyle = gradient;
  lib.paint.roundedRectangle(this.paint, 3, 0, w, h, 8);
  this.paint.fill();

  lib.paint.screw(this.paint, 16, 13);
  lib.paint.screw(this.paint, w - 10, 13);
  lib.paint.screw(this.paint, 16, h - 13);
  lib.paint.screw(this.paint, w - 10, h - 13);

  lib.paint.line(this.paint, 31, 1, 31, h - 1, 'rgba(0, 0, 0, 0.15)');
  lib.paint.line(this.paint, w - 25, 1, w - 25, h - 1, 'rgba(0, 0, 0, 0.15)');

  var colorStub = 'rgba(' + (opt_titleColor || '0,0,0');
  lib.paint.text(this.paint, title, 40, 25, colorStub + ',0.55)', 'italic 17pt Georgia');
  lib.paint.text(this.paint, title, 42, 25, colorStub + ',0.25)', 'italic 17pt Georgia');

  this.paint.restore();
};

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

rack.units.Input.prototype.render = function() {
  this.renderPlate('#eee', '#fff', 'Input', '164,164,164');
};

namespace('rack.units.Output');
rack.units.Output = function(rackInstance) {
  rack.Unit.call(this, rackInstance);
  this.input = this.rack.context.destination;
};
lib.inherits(rack.units.Output, rack.Unit);

rack.units.Output.prototype.render = function() {
  this.renderPlate('#555', '#777', 'Output', '18,18,18');
};


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
