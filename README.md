**Neo4j Data Loader**

A simple Node module to quickly load smalller datasets into Neo4j for analysis in the their browser application.

Dependencies:

* Async.js
* Request.js

**Installation**

```javascript
node install neo4j-loader
```

**API**

There are only three methods to the API, so it is very easy to use.  Basically, you can use it to load data from a JSON file or in the context of a larger script - sending each realtionship to the queue manually.

***Loading from a JSON file***

```javascript
var fs = require('fs');
var loader = require("neo4j-loader");

var inputFile = 'data/recipe-relations.json';
var dataURL = 'http://localhost:7474/db/data/';

loader.insert(inputFile, dataURL);
```

***Add Each to Queue Manually***

```javascript
var fs = require('fs');
var loader = require("neo4j-loader");


// Make sure you set the URL first.
loader.setURL(dataURL); 

fs.readFile(inputFile, 'utf-8', function (err, data) {
  if (err) throw err;
  var relations = JSON.parse(data);
  relations.forEach(function (relation) {
      loader.addToQueue(relation);
  });
});
```

