// Copyright IBM Corp. 2017,2018. All Rights Reserved.
// Node module: loopback-connector-zosconnectee
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

'use strict';

var Connector = require('loopback-connector').Connector;
var RestConnector = require('loopback-connector-rest').RestConnector;
var RequestBuilder = require('loopback-connector-rest').RequestBuilder;
var RestInitialize = require('loopback-connector-rest').initialize;
var util = require('util');
var fs = require('fs');
var Model = require('loopback').Model;
var logger = require('../lib/logger');

/**
 * Initialize the zosconnectee connector against the given data source
 *
 * @param {DataSource} dataSource The loopback-datasource-juggler dataSource
 * @param {Function} [callback] The callback function
 */
exports.initialize = function initializeDataSource(dataSource, callback) {
  var settings = dataSource.settings;

  // Get the template file
  var templateFile = process.cwd() + '/server/' + settings.template;
  var templateJSON;

  // check if the template file exists
  try {
    fs.accessSync(templateFile, fs.F_OK);
    // console.log('template file ' + templateFile + ' found.');

    templateJSON = JSON.parse(
      fs.readFileSync(
        require('path').resolve(
          __dirname,
          templateFile),
        'utf8'));

    // console.log('done reading the template ' + JSON.stringify(templateJSON));
  } catch (e) {
    console.log('Unable to find the template file ' + process.cwd() + e);
  }

  dataSource.settings = templateJSON;

  RestInitialize(dataSource, callback);
};

exports.zosconnectee = zosconnectee;

/**
 * The constructor for zosconnectee connector
 * @param {Object} settings The settings object
 * @param {DataSource} dataSource The data source instance
 * @constructor
 */
function zosconnectee(settings, dataSource) {
  RestConnector.call(this, 'zosconnectee', settings.templateJSON);
  this.dataSource = dataSource;
  this.debug      = !! settings.debug;
  this._logger    = logger;

  this._logger('!!! should not get called !!! zosconnectee constructor');
};

/**
 * Inherit the prototype methods
 */
util.inherits(zosconnectee, RestConnector);

/**
 * Connect to zosconnectee
 * @param {Function} [callback] The callback function
 *
 * @callback callback
 * @param {Error} err The error object
 * @param {Client} client The zosconnectee Client object
 */
zosconnectee.prototype.connect = function(callback) {
  var conn = this.settings;

  // dummy - for debug purposes only
  this._logger('connection is established');

  callback(null);
};

zosconnectee.prototype.disconnect = function(callback) {
  // dummy - for debug purposes only
  this._logger('connection is disconnected');

  callback(null);
};

/**
 * Count cannot not be supported efficiently.
 * @param {string} model The model name
 * @param {function} [callback] The callback function
 * @param {object} where The where object
 */
zosconnectee.prototype.count = function count(model, callback, where) {
  throw new Error('Not supported');
};
