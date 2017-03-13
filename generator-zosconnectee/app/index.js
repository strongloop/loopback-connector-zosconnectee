'use strict';

var async = require('async');
var yeoman;
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

module.exports = yeoman.generators.Base.extend({

  // The name `constructor` is important here
  constructor: function() {
    yeoman.generators.Base.apply(this, arguments);
  },

  selectOptions: function() {
    /*  */
    var defaultChoices = [{
      name: 'Install New Data Source',
      value: 'datasourceadd',
    }, {
      name: 'Discover z/OS Connect Enterprise Edition Services',
      value: 'discover',
    }];

    var prompts = [{
      type: 'list',
      name: 'whatNext',
      message: 'What would you like to do?',
      choices: defaultChoices,
    }];

    this.prompt(prompts, function(answers) {
      if (answers.whatNext == 'datasourceadd') {
        this.composeWith('zosconnectee:dsadd');
      } else if (answers.whatNext == 'discover') {
        this.composeWith('zosconnectee:discover');
      }
    }.bind(this));
  },
});
