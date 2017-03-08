var async = require('async');
var util = require('util');
var http = require("http");
var url = require('url');
var fs = require('fs');
var path = require('path');
var SwaggerParser = require('swagger-parser');

try {
    // Try to use the yeoman-generator from generator-loopback module
    yeoman = require('strongloop/node_modules/yeoman-generator');
  } catch (ex) {
    try{
      yeoman = require('strongloop/node_modules/generator-loopback/node_modules/yeoman-generator');
    } catch (ex){

      try{
        yeoman = require('yeoman-generator');
      } catch (ex){
        console.log("To resolve issue, install yeoman-generator by using command 'npm install yeoman-generator -g'");
        return;
      }

    }
  }

var wsModels;
try{
  wsModels= require('strongloop/node_modules/loopback-workspace').models;
} catch(ex) {
    try{
      wsModels= require('strongloop/node_modules/generator-loopback/node_modules/loopback-workspace').models;
    } catch (ex){
      try{
      wsModels= require('loopback-workspace').models;
      } catch(ex){
       console.log("To resolve issue, install loopback-workspace by using command 'npm install loopback-workspace -g'");
       return;
      }
    }
}

var ModelDefinition = wsModels.ModelDefinition;
var ModelConfig = wsModels.ModelConfig;

var chalk = require('chalk');
var arrayDiff = require('array-difference');
var fs = require('node-fs-extra');

require('events').EventEmitter.defaultMaxListeners = Infinity;
var tempfile ;

// Set debugThisGenerator to true for turning ON logging
//
var debugThisGenerator = false;

function debugLog(/* ... things to log ... */){
  if (debugThisGenerator == false) {
    return "";
  }

  var args = Array.prototype.slice.call(arguments);
  if (args.length === 0) return "";
  var message = args.map(function(arg){
    return [ "string", "number" ].indexOf(typeof(arg)) !== -1 ? arg : util.inspect(arg);
  }).join(" ");

  console.log("[zosconnectee generator] " + message);

  return message;
};

// Declare variables
//
var rootobj;
var baseURL;
var tem;
var resourceKeyList = [];
var customizeRequired = false;
var creds;
var mastertemplate = {
    'name': '',
    'connector': 'rest',
    'strictSSL': false,
    'debug': false,
    'defaults': {
        'headers': {
            'accept': 'application/json',
            'content-type': 'application/json'
        }
    },
    'operations': []
};
var skeltemplate = {
  'template': {
    'method': '',
    'url': '',
    'headers': {
        'authorization' : ''
    },
    'query': {
    },
    'body': {
    },
    'options': {
        'strictSSL' : false,
        'userQuerystring' : true
    }
  },
  'functions': {
  }
};

function getURL(obj, tem) {
    if (obj.schemes.indexOf("https") > -1)
      baseURL = 'https://' + obj.host + obj.basePath;
    else
      baseURL = 'http://' + obj.host + obj.basePath;

    tem['template']['url'] = baseURL;
}

function processHeaderParameters(creds, apiname, obj, tem) {
    debugLog('>> processHeaderParameters');

    for (var ep in obj) {
        if (obj[ep]['in'] == 'header') {
            var auth = 'Basic ' + new Buffer(creds.username + ':' + creds.password).toString('base64');
            tem['template']['headers']['authorization'] = auth;
        }
    }

    debugLog('<< processHeaderParameters');
}

function processQueryParameters(apiname, obj, tem) {
    debugLog('>> processQueryParameters');
    for (var ep in obj) {
        if (obj[ep]['in'] == 'query') {
            var queryParameterName = obj[ep]['name'];
            tem['template']['query'][queryParameterName] = '{'+queryParameterName+'}';
            tem['template']['options']['userQuerystring'] = true;
            var fnname = 'get' + apiname.substr(1, apiname.length);
            if (!tem['functions'][fnname]) {
              tem['functions'][fnname] = [];
            }
            tem['functions'][fnname].push(queryParameterName);
        }
    }

    debugLog('<< processQueryParameters');
}

function processPathParameters(apiname, obj, tem) {
    debugLog('>> processPathParameters');
    for (var ep in obj) {
        if (obj[ep]['in'] == 'path') {
            var pathParameterName = obj[ep]['name'];
            tem['template']['query'][pathParameterName] = '{'+pathParameterName+'}';
            tem['template']['options']['userQuerystring'] = true;
            var fnname = 'get' + pathParameterName;
            tem['functions'][fnname] = [pathParameterName];
        }
    }

    debugLog('<< processPathParameters');
}

function processGetOperation(creds, apiname, obj, tem) {
    debugLog('>> processGetOperation');

    delete tem['template']['body'];
    if(obj['parameters'])
    {
      processHeaderParameters(creds, apiname, obj['parameters'], tem);
      processQueryParameters(apiname, obj["parameters"], tem);
      processPathParameters(apiname, obj["parameters"], tem);
    }
    else
    {
      var fnname;
      if (!obj['operationId'])
        fnname = 'get' + apiname.substr(1, apiname.length);
      else
        fnname = obj['operationId'];

      tem['functions'][fnname] = [];
    }

    debugLog('<< processGetOperation');
}

function processBodyParameters(apiname, obj, tem) {
    debugLog('>> processBodyParameters');

    delete tem['template']['query'];
    var p;
    var fnname = 'post' + apiname.substr(1, apiname.length);
    tem['functions'][fnname] = [];

    for (var bp in obj) {
        if (obj[bp]['in'] == 'body') {
            var bodyParameterName = obj[bp]['name'];

            if (! rootobj['definitions'][bodyParameterName]) {
              p = obj[bp]['schema']['properties'];
            }
            else {
              p = rootobj['definitions'][bodyParameterName]['properties'];
            }

            var fnname = 'post' + apiname.substr(1, apiname.length);
            tem['functions'][fnname] = [];
            for (var k in p)
            {
                tem['functions'][fnname].push(k);
                tem['template']['body'][k] = '{'+k+'}';
            }
        }
    }

    debugLog('<< processBodyParameters');
}

function processPostOperation(creds, apiname, obj, tem) {
    debugLog('>> processPostOperation');

    processHeaderParameters(creds, apiname, obj['parameters'], tem);
    processBodyParameters(apiname, obj['parameters'], tem);

    debugLog('<< processPostOperation');
}

function processAPI(creds, apiname, obj, tem) {
    debugLog('>> processAPI ');

    for (var ops in obj) {
        if ( ops == 'get') {
            tem['template']['method'] = 'GET';
            processGetOperation(creds, apiname, obj[ops], tem);
        }
        else if (ops == 'post') {
            tem['template']['method'] = 'POST';
            processPostOperation(creds, apiname, obj[ops], tem);
        }
    }

    debugLog('<< processAPI');
}

function processPaths(creds, obj, tem) {
    debugLog('>> processPaths');

    for (var apiobj in obj) {
        tem = JSON.parse(JSON.stringify(skeltemplate));
        getURL(rootobj, tem);
        var urln = tem['template']['url'];
        tem['template']['url'] = urln + apiobj;
        processAPI(creds, apiobj, obj[apiobj], tem);
        mastertemplate['operations'].push(tem);
    }

    debugLog('<< processPaths');
}

function writeTemplateFile(file, data) {
    fs.writeFile(file, JSON.stringify(data, null, 2), 'utf8', function(err, data) {
        if (err) {
            return console.log(err);
        }
    });
}

var zosconnecteeNode = [];

/* default options used for every models */
var defOptions = {
                "plural": "",
                "validations": [],
                "relations": {},
                "acls": [],
                "methods": {},
                "idInjection": true,  /* By default ID Injection is set to true */
              };

/*
 * Yeoman generator code
 */

module.exports = yeoman.Base.extend({

  // The name `constructor` is important here
  constructor: function () {
    yeoman.Base.apply(this, arguments);
    this.resource = [];
  },

  // Get the list of datasources from the connector
  createDatasourceList : function()
  {
    var done = this.async();
    var that = this;  // that will be used as a reference to this in all the async jobs

    wsModels.DataSourceDefinition.find(
      function(err, dsDef) {
        if (err) return cb(err);

        var tempList = [];
        dsDef.map(function(datasource) {
          if(datasource.connector == 'zosconnectee')
          {
            tempList.push(datasource);
          }
        });
        that.datasources = tempList;
        done(); // End the sync
      }
    );
  },

  // Select the list of datasources for which the model needs to be created
  selectDataSource : function()
  {
    var done = this.async(); // Start sync
    var choices = [];

    this.datasources.map(function(datasource){
      choices.push({
        name : datasource.name,
        value : datasource.name,
        checked : false,
      });
    });

    // Create prompt message
    var prompts = [{
          type: 'checkbox',
          name: 'ds',
          message: 'Which all data sources you want to Discover services from?',
          choices: choices,
          validate: function(input) {
                      var done = this.async();
                      if (input == "") {
                        done("You should provide atleast one data source");
                      }
                      done(true);
                  }
    }];

    // Consider only selected datasources for discovery
    this.prompt(prompts, function(selected) {
      var tempList = [];

      this.datasources.map(function(datasource) {
        if (selected.ds.indexOf(datasource.name) >= 0) {
          tempList.push(datasource);
        }
      });

      this.datasources = tempList;
      done(); // End sync
    }.bind(this));
  },

  /*
   * Discover services
   *
   * for each selected data source, pick the host, port details
   * establish connection to the z/os connect node
   * get the swagger document
   *
   * get title, version, Path [catalog | 1.0.0 | /catalogManager/items]
   *
   * retrieve all the info on the resources
   * add the response to the global resourcelist
   */

  discoverDataSources : function()
  {
    var done = this.async();
    var tempList = [];

    this.datasources.map(function(datasource) {
      // Check if the datasource provides the swagger document
      // or reach to the URL to query the swagger document
      //
      if (datasource.swaggerfile.localeCompare("")) {
        // swagger document provided in the datasource
        //
        fs.readFile('server/' + datasource.swaggerfile, 'utf8', function(err, data) {
          if (err) {
            return console.log(err);
          }

          var apidoc = JSON.parse(data);

          // validate the swagger document
          SwaggerParser.validate(apidoc, function(err, api) {
            if (err) {
              console.log('failed to parse the swagger document' + err);
            }
          });

          // read the swagger and parse it
          SwaggerParser.parse(apidoc)
            .then(function(api) {
              if (!api.host) {
                api['host'] = datasource.host + ':' + datasource.port;
              }
              tempList.push({'dsName' : datasource.name,
                             'dsUserName' : datasource.username,
                             'dsPassword' : datasource.password,
                             'apititle': api.info.title,
                             'apiversion' : api.info.version,
                             'apiinfo' : api.info.description,
                             'apidocs' : api});
              done();
          });
        });
      }
      else
      {
        try {
          var authcode = 'Basic ' + new Buffer(datasource.username + ':' + datasource.password).toString('base64');
          var authcode = '';

          // Get the api doc from the zosconnectee datasource
          var options = {
            "method": "GET",
            "hostname": datasource.host,
            "port": datasource.port,
            "path": "/zosConnect/apis/",
            "headers": {
              "Authorization": authcode,
              "cache-control": "no-cache"
            }
          };

          process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
          var req = http.request(options, function (res) {
            var chunks = [];

            res.on("data", function (chunk) {
              chunks.push(chunk);
            });

            res.on("end", function () {
              var body = Buffer.concat(chunks);
              var apislist = JSON.parse(body.toString());

              for (var apik in apislist['apis'])
              {
                // Get the api doc from the zosconnectee datasource
                var options = {
                  "method": "GET",
                  "hostname": datasource.host,
                  "port": datasource.port,
                  "path": "/zosConnect/apis/" + apislist['apis'][apik].name,
                  "headers": {
                    "Authorization": authcode,
                    "cache-control": "no-cache"
                  }
                };

                var req = http.request(options, function (res) {
                  var chunks = [];

                  res.on("data", function (chunk) {
                    chunks.push(chunk);
                  });

                  res.on("end", function () {
                    var body = Buffer.concat(chunks);
                    var catalogURI = JSON.parse(body.toString());

                    // Parse the documentation URI
                    var uriobj = url.parse(catalogURI.documentation.swagger);

                    var options = {
                      "method": "GET",
                      "hostname": datasource.host, // datasource.host
                      "port": datasource.port, // datasource.port
                      "path": uriobj.path, // fixed URL
                      "headers": {
                        "Authorization": authcode,
                        "cache-control": "no-cache"
                      }
                    };

                    var req = http.request(options, function (res) {
                      var chunks = [];

                      res.on("data", function (chunk) {
                        chunks.push(chunk);
                      });

                      res.on("end", function () {
                        var body = Buffer.concat(chunks);
                        var apidoc = JSON.parse(body.toString());

                        // validate the swagger document
                        SwaggerParser.validate(apidoc, function(err, api) {
                          if (err) {
                            console.log('failed to parse the swagger document' + err);
                          }
                        });

                        // read the swagger and parse it
                        SwaggerParser.parse(apidoc)
                          .then(function(api) {
                            if (!api.host) {
                              api['host'] = datasource.host + ':' + datasource.port;
                            }
                            tempList.push({'dsName' : datasource.name,
                                         'dsUserName' : datasource.username,
                                         'dsPassword' : datasource.password,
                                         'apititle': api.info.title,
                                         'apiversion' : api.info.version,
                                         'apiinfo' : api.info.description,
                                         'apidocs' : api});
                            if (tempList.length >= apislist['apis'].length)
                            {
                              done();
                            }
                          });
                      });
                    });
                    req.end();
                  });
                });
                req.end();
              }
            });
          });
          req.end();
        } catch (ex) {
          console.log(ex);
          return;
        }
      }
    });
    this.resourceList = tempList;
    // done();
  },

  // Select the Models from the fetched swagger document
  selectModels : function(){
    var done = this.async();
    var choices = [];

    if(this.resourceList.length == 0){
      done("No resources discoverd");
      return;
    }

    this.resourceList.map(function(resource){
      choices.push({
        name : resource.apititle + ' ' + resource.apiversion + ' [ ' + resource.apiinfo + ' ]',
        value : resource.apititle,
        checked : false
      })
    });

    var prompts = [{
          type: 'checkbox',
          name: 'models',
          message: 'Which resources you want to select for Model creation?',
          choices: choices,
          validate: function(input) {
                        var done = this.async();
                          if (input == "") {
                            done("You should provide atleast one resource");
                          }
                        done(true);
                  }
    }];

    this.prompt(prompts, function(selected) {
      var tempList = [];
      /* Consider only selected datasources for discovery */
      this.resourceList.map(function(resource){
        if( selected.models.indexOf(resource.apititle) >= 0)
        {
          tempList.push(resource);
        }
      });
      this.resourceList = tempList;
      done();               /* End Sync */
    }.bind(this));
  },

  // Customize the model if the user wishes
  customizeModels : function(){
    var done = this.async();
    var resources = [];

    var prompts = [{
      type: 'confirm',
      name: 'customizeModels',
      message: 'Do you want to customize the imported resources?',
      default: false
    }];

    this.prompt(prompts, function(value) {
      customizeRequired = value.customizeModels;

      rootobj = JSON.parse(JSON.stringify(this.resourceList[0].apidocs));
      creds = {
        'username' : this.resourceList[0].dsUserName,
        'password' : this.resourceList[0].dsPassword
      };

      processPaths(creds, rootobj['paths'], tem);
      var robj = mastertemplate['operations'];
      for (var k in robj) {
        var tobj = robj[k]['template'];
        var fobj = robj[k]['functions'];
        for (var f in fobj) {
          var v = "[" + tobj['method'] + ' ' + tobj['url'] + "]" + ' --> model.' + f + '(' + fobj[f] + ')';
          resourceKeyList.push(tobj['url']);
        }
      }
      mastertemplate['name'] = this.resourceList[0].apititle;

      done();
    }.bind(this));
  },
  customizeResources : function()
  {
    var done = this.async(); // Start sync
    var choices = [];

    if (customizeRequired == true)
    {

    for (var v in resourceKeyList) {
      choices.push({
        name : resourceKeyList[v],
        value : resourceKeyList[v],
        checked : true,
      });
    }

    // Create prompt message
    var prompts = [{
          type: 'checkbox',
          name: 'resourceKey',
          message: 'Which all resources do you want to create models for?',
          choices: choices,
          validate: function(input) {
                      var done = this.async();
                      if (input == "") {
                        done("You should select atleast one");
                      }
                      done(true);
                  }
    }];

    this.prompt(prompts, function(selected) {
      var tempList = [];
      var deleteResourceList = [];
      var k;
      var j;

      for (k in resourceKeyList) {
        var found = false;
        for (j in selected.resourceKey) {
          if (resourceKeyList[k].localeCompare(selected.resourceKey[j]) == 0){
            found = true;
            break;
          }
        }
        if (found == false) {
          deleteResourceList.push(resourceKeyList[k]);
        }
      }

      for (var i in deleteResourceList) {
        var robj = mastertemplate['operations'];
        for (var k in robj) {
          var tobj = robj[k]['template'];
          var fobj = robj[k]['functions'];
          if (deleteResourceList[i].localeCompare(tobj.url) == 0) {
            robj.splice(k, 1);
          }
        }
      }
      done(); // End sync


    }.bind(this));
       } else {
        done();
       }
  },

  // Complete the processing and exit
  Finish : function()
  {
    var done = this.async();

    // It's time to write to the template file
    //
    var templateFile = 'server/'+ this.resourceList[0].dsName + '_template.json';
    writeTemplateFile(templateFile, mastertemplate);

    var finalresources_h = [];
    var finalresources_r = [];
    var robj = mastertemplate['operations'];
    for (var k in robj) {
      var tobj = robj[k]['template'];
      var fobj = robj[k]['functions'];

      for (var f in fobj) {
        var v = '[' + tobj['method'] + ' ' + tobj['url'] + ']';
        var w = ' : model.' + f + '(' + fobj[f] + ')';
        finalresources_h.push(v);
        finalresources_r.push(w);
      }
    }

    console.log(chalk.bold('Success. Below are the auto discovered model functions that you may use:'));
    for (var m in finalresources_h) {
      console.log(chalk.yellow(finalresources_h[m]) + chalk.green(finalresources_r[m]));
    }

    console.log(chalk.bold('You can further customize the models using the template file located at ' + chalk.green(templateFile)));

    done();
  },

/* Helper Functions */

  _createLoopbackPersistentModel: function(resName, modelProperties,dsName,idInjection,modelStruct,operationSet,idParameter){
    var done = this.async();
    var self = this;
    var modelOptions = defOptions;
    modelOptions.idInjection = idInjection;
    try{
      this._createModel(resName,modelProperties,modelOptions,dsName,'PersistedModel',modelStruct,operationSet,idParameter,function(err,data){
      if(err)
      {
          console.log('Failed to create Model '+resName);
          var message = err.message == undefined ? err : err.message;
          console.log(message);
      }
      else{
          console.log('Model '+resName+' Created Successfully');
      }
      done();
      });

    } catch(ex)
    {
      console.log("Failed to create Model for Resource "+resName);
      console.log("Details : "+ex);
    }

  },

  _createLoopbackBasicModel : function(basicModelList,dsName,idInjection){
    var that = this;
    var done = this.async();
    basicModelList.map(function(basicModel){
      if(basicModel.BasicModels.length > 0){
        that._createLoopbackBasicModel(basicModelList.BasicModels);
      }
      var resName = basicModel.modelName;
      var modelProperties = basicModel.modelProperties;
      var modelOptions = defOptions;

      modelOptions.idInjection = false;     /* Always set idInjection to false for basic models */
      try{
          that._createModel(resName,modelProperties,modelOptions,dsName,'Model',function(err,data){
          if(err !== null)
          {
            that._logStep('Failed to create Model '+resName+'err');
          }

        });
      }catch(ex){
        console.log("Failed to create Model for Resource "+resName);
        console.log("Details : "+ex);
      }
    });
    done();
  },

  _createModel: function(modelName, properties, options, datasource,modelType,modelStruct,operationSet,idParameter,cb)  {
    var cb = cb || this.async();
    var self = this;
    var isID = idParameter == false ? false : true;

    var model = {
          name: modelName,
          facetName: 'common',
          idInjection: isID,
          base: modelType
    };

    ModelDefinition.create(model, function(err, modelDef) {
        if(err)  return cb(err);
        var tempPropList = [];
        for(key in properties)
        {
          var tempJSON = properties[key];
          tempJSON['name'] = key;
          tempPropList.push(tempJSON);
        }
        modelDef.properties.create(tempPropList,function(err,data){
            if(err) return cb(err);
            ModelConfig.create({
                    dataSource: datasource,
                    facetName: "server",
                    name: modelName,
                    public: true
            },function(err,data){
                    if(err) cb(err);
                    if(modelStruct != undefined)
                    {
                        self._logStep('Updating Model Custom file with js-struct information');
                        /* Now re-construct only the PersistedModel custom file with discover/templates/modelcustom.js */
                        self._addStructModelToModelCustomFile(modelName,modelStruct,operationSet,idParameter);
                      }
                    cb();
                  });
            });
    });
  },
  _getStructInfoFromResDefinition: function(ModelDefinition,modelName,isPacked) {
      /* Add Struct Model to model custom file */

      var modelProperties = ModelDefinition.structModel;
      var structName = typeof modleName != undefined ? modelName : typeof ModelDefinition.modelName != 'undefined' ? ModelDefinition.modelName : '';
      var structField = '';
      structField = convertModelPropertiesToJSStruct(modelProperties,isPacked);
      var that = this;
      ModelDefinition.BasicModels.map(function(model){
            structField+=that._getStructInfoFromResDefinition(model,undefined,isPacked);
      });
      return structField;
  },
  _addStructModelToModelCustomFile : function(modelName,modelStruct,operationSet,idParameter){
    var done = this.async();

    modelJsonFile = ModelDefinition.getPath('common', { name: modelName });
    try{
        modelCustomFile = modelJsonFile.slice(0,modelJsonFile.length-2);
    } catch(ex){
      console.log('Model '+modelName+' not found');
      done(ex);
    }

    if( idParameter == false )
    {
      var jsonObj = fs.readJsonSync(modelJsonFile,{throws: false});
      jsonObj.properties.id = null;
      fs.writeJsonSync(modelJsonFile,jsonObj);
    }

    /* Read template to construct model custom file content */
    var template = tempfile;

    var loopbackSkeletonOperation = { POST : 'create', PUT: 'upsert', GET: 'findById', DELETE: 'deleteById' };
    var configuredOperations = '\'';
    for( operation in operationSet){
      configuredOperations+=loopbackSkeletonOperation[operation]+' ';

    }
    configuredOperations+='\'';

    template = template.replace(new RegExp('\\$1', 'g'),modelName);
    template = template.replace('$2',modelStruct);
    template = template.replace('$3',configuredOperations);
    template = template.replace('$4',JSON.stringify(operationSet));

    if(idParameter == false)
      template = template.replace('$5',undefined);
    else {
      template = template.replace('$5','\''+idParameter+'\'');
    }

    fs.writeFileSync(modelCustomFile,template);
    done();
  },
  _isVerbose: function() {
      return !!this.options.l;
    },

  _logPart: function() {
    this.log(chalk.bold(format.apply(null, arguments)));
  },

  _logStep: function() {
    if (!this._isVerbose()) return;
    this.log(chalk.cyan('  ' + format.apply(null, arguments)));
  }

});


function createDebugLogger(yolog) {
  function debugLog() {
    debug.apply(null, arguments);
    return debugLog;
  }

  for (var key in yolog) {
    debugLog[key] = yolog[key];
  }

  debugLog.write = function(msg) {
    if (!msg) {
      return this.write('\n');
    }

    debug(util.format.apply(util, arguments));
    return this;
  };

  return debugLog;
}

// test function ONLY!!  Never call this
//
function test() {
    fs.readFile('CatalogManager.yaml', 'utf8', function(err, data) {
        if (err) {
            return console.log(err);
        }
        rootobj = JSON.parse(data);
        processPaths(rootobj['paths'], tem);
        console.log(JSON.stringify(mastertemplate, null, 2));
        fs.writeFile('test.json', JSON.stringify(mastertemplate, null, 2), 'utf8', function(err) {
            if (err) {
                return console.log(err);
            }
        });
    });
}
