#!/usr/bin/env node

'use strict';

var nopt = require('nopt');
var path = require('path');
var lbGenerator = require('../app/index.js');

var yeoman = lbGenerator._yeoman; // generator-loopback should export _yeoman

if (!yeoman) {
  try {
    // Try to use the yeoman-generator from generator-loopback module
    yeoman = require('strongloop/node_modules/yeoman-generator');
  } catch (err) {
    try {
      yeoman = require('strongloop/node_modules/generator-loopback/node_modules/yeoman-generator');
    } catch (err) {
      try {
        yeoman = require('yeoman-generator');
      } catch (err) {
        console.log("To resolve issue, install yeoman-generator by using command 'npm install yeoman-generator -g'");
        return;
      }
    }
  }
}

function loopback(args, options, loader) {
  var opts = [];

  var env = yeoman();

  env.alias(/^([^:]+)$/, 'zosconnectee');

  var root = path.dirname(require.resolve('strongloop/node_modules/generator-loopback/package.json'));
  var cwd = process.cwd();
  process.chdir(root);
  env.lookup();
  process.chdir(cwd);

  env.on('end', function() {
    console.log('Done running zosconnectee generator');
  });

  env.on('error', function(err) {
    console.log('Error', 'zosdiscover \n');
    console.log(err);
  });

  env.run(args, opts);
};

loopback('zosconnectee');
