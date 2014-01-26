<h2>Neo4j Data Loader</h2>

A simple Node module to quickly load smalller datasets into Neo4j for analysis in the their browser application.

Dependencies:

* Async.js
* Request.js

**Installation**

```javascript
npm install neo4j-loader
```

**API**

There are only three methods to the API (insertFile, setURL, addToQueue), so it is very easy to use.  Basically, you can use it to load data from a JSON file or in the context of a larger script - sending each realtionship to the queue manually.

***Loading from a JSON file***

```javascript
var loader = require("neo4j-loader");

var inputFile = 'data/relationships.json';
var dataURL = 'http://localhost:7474/db/data/';

loader.insertFile(inputFile, dataURL);
```

***Add Each to Queue Manually***

```javascript
var fs = require('fs');
var loader = require("neo4j-loader");

var inputFile = 'data/relationships.json';
var dataURL = 'http://localhost:7474/db/data/';

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

<img src="neo4j-loader.jpg" />



