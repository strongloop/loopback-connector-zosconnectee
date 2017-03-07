# LoopBack connector for z/OS Connect Enterprise Edition
IBM® z/OS® Connect Enterprise Edition (EE) V2.0 extends the value of applications that run on z/OS by allowing efficient and scalable APIs for contemporary mobile and cloud applications to be easily created. The `loopback-connector-zosconnectee` module is the LoopBack connector for z/OS Connect Enterprise Edition.

Consists of the following two components:
  - `apic-zosconnectee` : A Yeoman generator for auto-discovery of z/OS Connect EE services
  - `loopback-connector-zosconnectee` : A REST based template driven connector for z/OS Connect EE

**Note**: `loopback-connector-zosconnectee` leverages `loopback-connector-rest` LoopBack connector for performing RESTful invocations to z/OS Connect EE server.

## Installation
Enter the following in the top-level directory of your LoopBack application:
```
$ npm install loopback-connector-zosconnectee --save
```
The `--save` option adds the dependency to the application's `package.json` file.

## Configuration
Run the LoopBack datasource generator `apic-zosconnectee` command to add z/OS Connect EE datasource to your LoopBack application. The entry in the application's server/datasources.json will look similar like below:
```
"zosds1": {
    "host": <ip address>,
    "port": <port>,
    "username": <username>,
    "password": <pasword>,
    "name": "zosds1",
    "connector": "zosconnectee",
    "template": "zosds1_template.json",
    "timeout": 0,
    "debug": false,
    "swaggerfile": <swagger file>
}
```
The following table describes the connector properties.

Property       | Type    | Description
---------------| --------| --------
host           | String  | z/OS Connect EE server TCP hostname or IP address
port           | String  | z/OS Connect EE server TCP port number
username       | String  | Username
password       | String  | password associated with the username above
debug          | Boolean | Turn ON / OFF debug messages logged by the connector
timeout        | Integer | Specifies the timeout value for connecting to the server instance
swaggerfile    | String  | Specifies the swagger document located in server/<swaggerfile> to be read instead of contacting the host [useful for local development]

## Usage
### Add z/OS Connect EE as a LoopBack datasource
- Create a LoopBack datasource through `apic-zosconnectee` command and choose **Install New Data Source** and follow the prompt.
### Discover z/OS Connect EE services
- Discover models through `apic-zosconnectee` command and choose **Discover z/OS Connect Enterprise Edition Services** and follow the prompt.

## Customization
You may further edit the generated template file located in your LoopBack application under server/<datasource_name>_template.json for customizing the function names, parameters, etc,.

### Example
You can quickly try with a basic example provided with this project:
##### Create a Loopback application
```sh
$ mkdir tzapp; cd tzapp
$ apic loopback
$ npm install loopback-connector-zosconnectee.tgz
```
##### Run the test datetime server
```sh
$ cd node_modules/loopback-connector-zosconnectee/example/datetime/
$ npm install
$ node index.js
```
##### Define datasource for the test datetime server
```sh
$ cd tzapp
$ apic-zosconnectee
```
The output will be similar like below:

```
$ apic-zosconnectee
? What would you like to do? Install New Data Source
? Enter data source name  zosds1
? Enter z/OS Connect Enterprise Edition server Domain Name localhost
? Enter z/OS Connect Enterprise Edition server port number  3100
? Enter Username  user
? Enter Password  ****
? Confirm to create data source Yes
Datasource zosds1 created successfully
```

##### Discover the API from the test datetime server
```sh
$ cd tzapp
$ apic-zosconnectee
```
The output will be similar like below:
```
$ apic-zosconnectee
? What would you like to do? Discover z/OS Connect Enterprise Edition Services
? Which all data sources you want to Discover services from? zosds1
? Which resources you want to select for Model creation? Date Time 1.0.0 [ API to return date and time based on a given timezone ]
? Do you want to customize the imported resources? No
Success. Below are the auto discovered model functions that you may use:
[GET http://localhost:3100/dateTime/{timezone}] : model.gettimezone(timezone)
You can further customize the models using the template file located at server/zosds1_template.json
```
##### create a boot-script
```sh
$ apic loopback:boot-script zosconnectee
```
##### Add the below code to the `server/boot/zosconnectee.js`
```javascript
module.exports = function(app, cb) {
   var ds = app.datasources.zosds1;

   var model = ds.createModel('zosds1');
   console.log('Model created for datasource zosds1.');

   var tz = 'UTC';
   console.log('Invoking gettimezone() with timezone ' + tz);

   model.gettimezone(tz, function(err, result) {
     if (result) {
       console.log('gettimezone() Response: ' + JSON.stringify(result));
     }
     else {
       console.log('gettimezone() Failed: ' + err);
     }
   });
  process.nextTick(cb); // Remove if you pass `cb` to an async function yourself
};
```

##### Run the LoopBack application
```sh
$ node .
```
##### The output will be similar like below:
```
Model created for datasource zosds1.
Invoking gettimezone() with timezone UTC
Web server listening at: http://0.0.0.0:3000
gettimezone() Response: {"date":"2016:02:5","time":"03:56:49"}
```

## Known Caveats
* Cannot view/edit the z/OS Connect datasource through apic edit graphical console
* timeout functionality (attribute in the connectors settings) is not yet implemented
