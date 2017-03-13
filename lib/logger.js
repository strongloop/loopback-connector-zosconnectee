'use strict';

var util = require('util');
var colors = require('colors');

module.exports = function(/* ... things to log ... */) {
  var args = Array.prototype.slice.call(arguments);

  if (args.length === 0) return '';

  var message = args.map(function(arg) {
    return ['string', 'number'].indexOf(typeof(arg)) !== -1 ? arg : util.inspect(arg);
  }).join(' ');

  if (this.debug == true) console.log(colors.green('[zosconnectee connector] ' + message));

  return message;
};
