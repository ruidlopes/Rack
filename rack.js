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

lib.functions.binary = function(str8) {
  var num = 0;
  for (var i = 0; i < 8; ++i) {
    if (str8[i] == '1') {
      num += 1 << (7 - i);
    }
  }
  return num;
};

namespace('lib.math');
lib.math.clamp = function(value, min, max) {
  return Math.max(Math.min(value, max), min);
};

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
lib.paint.text = function(ctx, text, x, y, color, font, opt_align) {
  ctx.fillStyle = color;
  ctx.textAlign = opt_align || 'left';
  ctx.font = font;
  ctx.fillText(text, x, y);
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
  this.registeredUnits = {};

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

rack.Rack.prototype.getPositionForUnit = function(unit) {
  var position = 0;
  for (var i = 0; i < this.units.indexOf(unit); ++i) {
    position += this.units[i].size();
  }
  return position;
};

rack.Rack.prototype.registerUnit = function(unit, name) {
  this.registeredUnits[name] = unit;
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
  this.paint.fillStyle = '#000';
  this.paint.fillRect(0, 0, this.canvas.width, this.canvas.height);
  this.renderStructure();
  for (var i = 0; i < this.units.length; ++i) {
    this.units[i].render();
  }
};

rack.Rack.prototype.renderStructure = function() {
  this.paint.save();
  this.paint.translate(0, 0);
  var w = 30;
  this.paint.fillStyle = '#444';
  this.paint.fillRect(0, 0, w, this.canvas.height);
  this.paint.fillRect(this.canvas.width - w, 0, this.canvas.width, this.canvas.height);
  this.paint.restore();
};

rack.Rack.prototype.audio = function() {
  return this.context;
};

rack.Rack.prototype.translateUnitEventY = function(event, unit) {
  return event.clientY - this.getPositionForUnit(unit) * rack.Unit.UNIT_HEIGHT - rack.Unit.UNIT_SPACING;
};

rack.Rack.prototype.isUnitEventYWithinBounds = function(unit, y) {
  return y >= 0 && y < rack.Unit.UNIT_SIZE * unit.size();
};

rack.Rack.prototype.handleEvent = function(event) {
  for (var i = 0; i < this.units.length; ++i) {
    var unit = this.units[i];
    var x = event.clientX;
    var y = this.translateUnitEventY(event, unit);
    if (this.isUnitEventYWithinBounds(unit, y) && unit.willHandleEvent(event, x, y)) {
      unit.handleEvent(event, x, y);
      return;
    }
  }
};


// Rack unit knob.
namespace('rack.Knob');
rack.Knob = function(unitInstance, name, x, y, opt_color, opt_highlight) {
  this.unit = unitInstance;
  this.canvas = unitInstance.canvas;
  this.paint = unitInstance.paint;
  this.name = name;
  this.value = 0;
  this.color = opt_color || 'rgba(0,0,0,0.75)';
  this.highlight = opt_highlight || 'rgba(127,127,127,0.75)';
  this.x = x;
  this.y = y;

  this.isHandlingMouseDown = false;
  this.valueAtMouseDown = 0;
  this.mouseDownY = 0;
};

rack.Knob.RADIUS = 30;

rack.Knob.prototype.getValue = function() {
  return this.value;
};

rack.Knob.prototype.setValue = function(newValue) {
  this.value = lib.math.clamp(newValue, 0.0, 1.0);
  this.unit.onKnobValueChanged(this, this.value);
};

rack.Knob.prototype.render = function() {
  var realX = this.x > 0 ? this.x : this.canvas.width + this.x; 
  var realY = this.y > 0 ? this.y : this.canvas.height + this.y;
  var angle = Math.PI * 0.75 + this.value * Math.PI * 1.5;
  var angleX = realX + 20 * Math.cos(angle);
  var angleY = realY + 20 * Math.sin(angle);
  var gradient = this.paint.createRadialGradient(realX, realY, rack.Knob.RADIUS, angleX, angleY, 2);
  gradient.addColorStop(0, this.color);
  gradient.addColorStop(0.15, this.color);
  gradient.addColorStop(0.9, this.highlight);
  gradient.addColorStop(1, this.color);
  lib.paint.circle(this.paint, realX, realY, rack.Knob.RADIUS, gradient);
  lib.paint.text(this.paint, this.name.toUpperCase(), realX, realY + rack.Knob.RADIUS + 12, 'rgba(0,0,0,0.7)', 'bold 7pt Arial', 'center');
};

rack.Knob.prototype.willHandleEvent = function(event, x, y) {
  var realX = this.x > 0 ? this.x : this.canvas.width + this.x; 
  var realY = this.y > 0 ? this.y : this.canvas.height + this.y;
  var xx = Math.pow(realX - x, 2);
  var yy = Math.pow(realY - y, 2);
  return (event.type == 'mousedown' && Math.sqrt(xx + yy) <= rack.Knob.RADIUS) ||
      (event.type == 'mousemove' && this.isHandlingMouseDown) ||
      (event.type == 'mouseup' && this.isHandlingMouseDown);
};

rack.Knob.prototype.handleEvent = function(event, x, y) {
  switch (event.type) {
    case 'mousedown':
      this.isHandlingMouseDown = true;
      this.valueAtMouseDown = this.value;
      this.mouseDownY = y;
      break;
    case 'mousemove':
      var value = this.valueAtMouseDown + (this.mouseDownY - y) / 40;
      this.setValue(value);
      break;
    case 'mouseup':
      this.isHandlingMouseDown = false;
      this.unit.onKnobDone();
      break;
    default:
      break;
  }
};


// Rack units.
namespace('rack.Unit');
rack.Unit = function(rackInstance) {
  this.rack = rackInstance;
  this.canvas = rackInstance.canvas;
  this.paint = rackInstance.paint;
  this.input = null;
  this.output = null;
  this.knobs = [];

  this.knobHandlingEvent = null;
};

rack.Unit.UNIT_SPACING = 5;
rack.Unit.UNIT_SIZE = 80;
rack.Unit.UNIT_HEIGHT = rack.Unit.UNIT_SPACING + rack.Unit.UNIT_SIZE;

rack.Unit.prototype.size = lib.functions.RACK1U;

rack.Unit.prototype.getPosition = function() {
  return this.rack.getPositionForUnit(this);
};

rack.Unit.prototype.render = function() {
  this.paint.save();
  this.paint.translate(0, this.getPosition() * (rack.Unit.UNIT_SIZE + rack.Unit.UNIT_SPACING));
  this.renderComponents();
  this.paint.restore();
};

rack.Unit.prototype.renderComponents = function() {
  for (var i = 0; i < this.knobs.length; ++i) {
    this.knobs[i].render();
  }
};

rack.Unit.prototype.renderPlate = function(color, highlight, title, opt_titleColor) {
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
};

rack.Unit.prototype.willHandleEvent = function(event, x, y) {
  for (var i = 0; i < this.knobs.length; ++i) {
    var knob = this.knobs[i];
    if (knob.willHandleEvent(event, x, y)) {
      this.knobHandlingEvent = knob;
      return true;
    }
  }
  this.knobHandlingEvent = null;
  return false;
};

rack.Unit.prototype.handleEvent = function(event, x, y) {
  if (this.knobHandlingEvent) {
    this.knobHandlingEvent.handleEvent(event, x, y);
  }
};

rack.Unit.prototype.onKnobValueChanged = function(knob, value) {
  this.render();
};

rack.Unit.prototype.onKnobDone = function() {
  this.knobHandlingEvent = null;
};

rack.Unit.fromScript = function(unitScriptLocation) {
  var script = document.createElement('script');
  script.src = unitScriptLocation;
  document.body.appendChild(script);
};

rack.Unit.fromFunction = function(unitConstructor, name) {
  rack.get().registerUnit(unitConstructor, name);
};


namespace('rack.Matrix');
rack.Matrix = function(canvas, paint, x, y, width, height, color, midColor, textColor) {
  this.canvas = canvas;
  this.paint = paint;
  this.x = x;
  this.y = y;
  this.width = width;
  this.height = height;
  this.color = color;
  this.midColor = midColor;
  this.textColor = textColor;
  this.text = '';
};

rack.Matrix.CHAR_SIZE = 8;
rack.Matrix.PIXEL_SIZE = 2;

rack.Matrix.chars = {
  '0': [126, 129, 129, 129, 129, 129, 129, 126],
  '1': [16, 48, 80, 16, 16, 16, 16, 254],
  '2': [126, 129, 1, 126, 128, 128, 128, 255],
  '3': [255, 1, 1, 14, 1, 1, 129, 126],
  '4': [129, 129, 129, 255, 1, 1, 1, 1],
  '5': [255, 128, 128, 254, 1, 1, 129, 126],
  '6': [62, 64, 128, 254, 129, 129, 129, 126],
  '7': [255, 1, 2, 4, 8, 8, 8, 8],
  '8': [126, 129, 129, 126, 129, 129, 129, 126],
  '9': [126, 129, 129, 127, 1, 1, 2, 124],
  ' ': [0, 0, 0, 0, 0, 0, 0, 0],
  'A': [126, 129, 129, 255, 129, 129, 129, 129],
  'B': [254, 129, 129, 254, 129, 129, 129, 254],
  'C': [126, 129, 128, 128, 128, 128, 129, 126],
  'D': [254, 129, 129, 129, 129, 129, 129, 254],
  'E': [255, 128, 128, 252, 128, 128, 128, 255],
  'F': [255, 128, 128, 252, 128, 128, 128, 128],
  'G': [126, 129, 128, 143, 129, 129, 129, 126],
  'H': [129, 129, 129, 255, 129, 129, 129, 129],
  'I': [124, 16, 16, 16, 16, 16, 16, 124],
  'J': [1, 1, 1, 1, 1, 1, 129, 126],
  'K': [129, 129, 130, 252, 130, 129, 129, 129],
  'L': [128, 128, 128, 128, 128, 128, 128, 255],
  'M': [129, 195, 165, 153, 129, 129, 129, 129],
  'N': [129, 193, 161, 145, 137, 133, 131, 129],
  'O': [126, 129, 129, 129, 129, 129, 129, 126],
  'P': [254, 129, 129, 254, 128, 128, 128, 128],
  'Q': [126, 129, 129, 129, 137, 133, 131, 127],
  'R': [254, 129, 129, 254, 129, 129, 129, 129],
  'S': [126, 129, 128, 126, 1, 1, 129, 126],
  'T': [255, 16, 16, 16, 16, 16, 16, 16],
  'U': [129, 129, 129, 129, 129, 129, 129, 126],
  'V': [129, 129, 66, 66, 36, 36, 24, 24],
  'W': [129, 129, 129, 66, 66, 90, 36, 36],
  'X': [129, 66, 36, 24, 24, 36, 66, 129],
  'Y': [129, 129, 129, 127, 1, 1, 129, 126],
  'Z': [255, 2, 4, 8, 16, 32, 64, 255],
  '.': [0, 0, 0, 0, 0, 0, 24, 24],
  '/': [1, 2, 4, 8, 16, 32, 64, 128]
};

rack.Matrix.prototype.setText = function(text) {
  this.text = String(text || '').toUpperCase();
};

rack.Matrix.prototype.render = function() {
  var realC = rack.Matrix.CHAR_SIZE * rack.Matrix.PIXEL_SIZE + 1;
  var realW = this.width * realC;
  var realH = this.height * realC; 
  var realX = this.x > 0 ? this.x : (this.canvas.width + this.x - realW); 
  var realY = this.y > 0 ? this.y : (this.canvas.height + this.y - realH);

  this.paint.fillStyle = this.color;
  this.paint.fillRect(realX, realY, realW, realH);
  for (var i = 0, tx = 0, ty = 0; i < this.width * this.height; ++i) {
    if (tx == this.width) {
      tx = 0;
      ty++;
    }
    if (ty == this.height) {
      break;
    }
    var txx = realX + tx * realC;
    var tyy = realY + ty * realC;
    var ch = rack.Matrix.chars[this.text[i]] || rack.Matrix.chars[' '];
    for (var yy = 0; yy < rack.Matrix.CHAR_SIZE; ++yy) {
      var line = ch[yy];
      for (var xx = 0; xx < rack.Matrix.CHAR_SIZE; ++xx) {
        var pixel = line & (128 >> (xx));
        this.paint.fillStyle = pixel ? this.textColor : this.midColor;
        this.paint.fillRect(txx + (xx * rack.Matrix.PIXEL_SIZE + 1),
                            tyy + (yy * rack.Matrix.PIXEL_SIZE + 1),
                            rack.Matrix.PIXEL_SIZE,
                            rack.Matrix.PIXEL_SIZE); 
      }
    }
    tx++;
  }
};



namespace('rack.units.Input');
rack.units.Input = function(rackInstance) {
  rack.Unit.call(this, rackInstance);
  navigator.webkitGetUserMedia(
      {video: false, audio: true},
      this.success.bind(this),
      this.error.bind(this));

  this.gainNode = this.rack.context.createGain();
  this.knobs.push(new rack.Knob(this, 'pre gain', -100, 35));
};
lib.inherits(rack.units.Input, rack.Unit);

rack.units.Input.prototype.success = function(stream) {
  var mediaSource = this.rack.context.createMediaStreamSource(stream);
  this.gainNode.gain.value = 0;
  mediaSource.connect(this.gainNode);
  this.output = this.gainNode;
  this.rack.setReady(true);
};

rack.units.Input.prototype.error = function() {
  this.rack.setReady(false);
  lib.error('no input connected');
};

rack.units.Input.prototype.onKnobValueChanged = function(knob, newValue) {
  // knob is always gain.
  rack.Unit.prototype.onKnobValueChanged.call(this, knob, newValue);
  this.gainNode.gain.value = newValue * 10.0;
};

rack.units.Input.prototype.renderComponents = function() {
  this.renderPlate('#eee', '#fff', 'Input', '164,164,164');
  rack.Unit.prototype.renderComponents.call(this);
};


namespace('rack.units.Output');
rack.units.Output = function(rackInstance) {
  rack.Unit.call(this, rackInstance);
  this.gainNode = this.rack.context.createGain();
  this.gainNode.gain.value = 0;
  this.input = this.gainNode;
  this.gainNode.connect(this.rack.context.destination);
  this.knobs.push(new rack.Knob(this, 'post gain', -100, 35));
};
lib.inherits(rack.units.Output, rack.Unit);

rack.units.Output.prototype.renderComponents = function() {
  this.renderPlate('#555', '#777', 'Output', '18,18,18');
  rack.Unit.prototype.renderComponents.call(this);
};

rack.units.Output.prototype.onKnobValueChanged = function(knob, newValue) {
  // knob is always gain.
  rack.Unit.prototype.onKnobValueChanged.call(this, knob, newValue);
  this.gainNode.gain.value = newValue * 10.0;
};


// Instance control.
rack.instance = rack.instance || new rack.Rack();
rack.get = function() {
  return rack.instance;
};
rack.bind = function(functionName) {
  return rack.instance[functionName].bind(rack.instance);
};
rack.load = function(unit, opt_name) {
  if (lib.isString(unit)) {
    rack.Unit.fromScript(unit);
  } else if (lib.isFunction(unit)) {
    rack.Unit.fromFunction(unit, opt_name);
  }
};

// Global events.
window.addEventListener('load', rack.bind('init'));
window.addEventListener('unload', rack.bind('dispose'));
window.addEventListener('resize', rack.bind('resize'));

window.addEventListener('click', rack.bind('handleEvent'));
window.addEventListener('mousedown', rack.bind('handleEvent'));
window.addEventListener('mousemove', rack.bind('handleEvent'));
window.addEventListener('mouseup', rack.bind('handleEvent'));
