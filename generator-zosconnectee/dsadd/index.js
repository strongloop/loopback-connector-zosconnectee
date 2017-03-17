'use strict';

var async = require('async');
var chalk = require('chalk');

var yeoman;
try {
    // Try to use the yeoman-generator from generator-loopback module
  yeoman = require('apiconnect/node_modules/yeoman-generator');
} catch (ex) {
  try {
    yeoman = require('apiconnect/node_modules/generator-loopback/node_modules/yeoman-generator');
  } catch (ex) {
    try {
      yeoman = require('yeoman-generator');
    } catch (ex) {
      console.log("To resolve issue, install yeoman-generator by using command 'npm install yeoman-generator -g'");
      return;
    }
  }
}
var util = require('util');

try {
  var DataSourceDefinition = require('apiconnect/node_modules/loopback-workspace').models.DataSourceDefinition;
} catch (ex) {
  try {
    DataSourceDefinition = require('apiconnect/node_modules/generator-loopback/node_modules/loopback-workspace').models.DataSourceDefinition;
  } catch (ex) {
    try {
      DataSourceDefinition = require('loopback-workspace').models.DataSourceDefinition;
    } catch (ex) {
      console.log("To resolve issue, install loopback-workspace by using command 'npm install loopback-workspace -g'");
      return;
    }
  }
}

var generators = yeoman.generators;

module.exports = generators.Base.extend({
  constructor: function() {
    generators.Base.apply(this, arguments);
  },
  promptForDatasource: function() {
    var done = this.async();
    var prompts = [{
      type: 'input',
      name: 'dsname',
      message: 'Enter data source name ',
      validate: function(input) {
        var done = this.async();
        if (input == '') {
          done('You should provide data source name');
        }
        done(true);
      },
    }, {
      type: 'input',
      name: 'host',
      message: 'Enter z/OS Connect Enterprise Edition server Domain Name',
      validate: function(input) {
        var done = this.async();
        if (input == '') {
          done('You should provide proper IP Address');
        }
        done(true);
      },
    }, {
      type: 'input',
      name: 'port',
      message: 'Enter z/OS Connect Enterprise Edition server port number ',
      default: 2006,
      validate: function(input) {
        var done = this.async();
        if (isNaN(input)) {
          done('You should provide proper port number');
        }
        done(true);
      },
    }, {
      type: 'input',
      name: 'username',
      message: 'Enter Username ',
      default: 'user',
    }, {

      type: 'password',
      name: 'password',
      message: 'Enter Password ',
      default: 'pass',

    }, {
      type: 'confirm',
      name: 'confirm',
      message: 'Confirm to create data source',
      default: true,
    }];

    this.prompt(prompts, function(answers) {
      if (answers.confirm == false)
        return;
      var options = {
        host: answers.host,
        port: answers.port,
        username: answers.username,
        password: answers.password,
        template: answers.dsname + '_template.json',
        timeout: 0,
        debug: false,
        swaggerfile: '',
      };
      try {
        this._createDatasource(answers.dsname, options, function(err) {
          if (err) {
            console.log('Failed to create Datasource ' + answers.dsname);
          } else {
            console.log('Datasource ' + answers.dsname + ' created successfully');
          }
        });
      } catch (e) {
        console.log(e);
      } finally {
        done();
      }
    }.bind(this));
  },

  /* Helper functions */

  _isVerbose: function() {
    return !!this.options.l;
  },

  _createDatasource: function(dsName, options, cb) {
    cb = cb || this.async();
    DataSourceDefinition.create({
      facetName: 'server',
      name: dsName,
      connector: 'zosconnectee',
    }, function(err, data) {
      if (err) cb(err);
      else {
        DataSourceDefinition.findOne({ where: {
          name: dsName,
          facetName: 'server',
        }}, function(err, dsDef) {
          if (err) return cb(err);
          var extras = util._extend({}, options);
          delete extras.connector;
          var extraNames = Object.keys(extras);
          if (!extraNames.length) return cb(true);
          util._extend(dsDef, extras);
          dsDef.save(cb);
        });
      }
    });
  },
  _logStep: function() {
    if (!this._isVerbose()) return;
    this.log(chalk.cyan('  ' + util.format.apply(null, arguments)));
  },
});

// Export it for strong-cli to use

module.exports._yeoman = yeoman;
