// Copyright IBM Corp. 2017,2018. All Rights Reserved.
// Node module: loopback-connector-zosconnectee
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

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
