var fs =      require('fs'),
    async =   require('async'),
    request = require('request');

var dataURL = '';
// **************************************************************************************
// Set up an async queue to hold all the relationships that need to be run.
// **************************************************************************************
var q = async.queue(runTask, 1); // You will duplicate nodes if you change the "1" here!

q.drain = function() { console.log('Finished.'); };

// **************************************************************************************
// Each queued task starts here and does the follwowing:
// 1.  Check to see if a relationship exists betwen the two nodes with that type.
// 2.  If the realtionship exists, it simply console logs, "EXISTS..."
// 3.  If not, the relationship data goes to the createRelation function.
// **************************************************************************************
function runTask(d, callback) {
  checkRelationExists(d, function (err, exists) {
    if (err) throw err;
    if (exists) {
      console.log("EXISTS: ", d.source.uniq + " >> " + d.type + " >> " + d.target.uniq);
      return callback();
    } else {
      createRelation(d, function (err) {
        if (err) throw err;
        console.log("CREATED: ", d.source.uniq + " >> " + d.type + " >> " + d.target.uniq);
        return callback();
      });
    }
  });
}

// **************************************************************************************
// EXPORTED METHODS
// **************************************************************************************
exports.setURL = function (url) {
  dataURL = url;
};

exports.addToQueue = function (relation) {
  q.push(relation);
};

exports.insertFile = function (inputFile, url) {
  if (url) {
    dataURL = url;
  }
  fs.readFile(inputFile, 'utf-8', function (err, data) {
    if (err) throw err;
    var relations = JSON.parse(data);
    relations.forEach(function (relation) {
      q.push(relation);
    });
  });
}

// **************************************************************************************
// Look for a relationship of type = d.type between the two nodes.
// **************************************************************************************
function checkRelationExists(d, callback) {
  var options = getOptions(d, 'REL_MATCH');
  request.post(options, function (err, response, body) {
    if (err) throw err;
    if (response.statusCode === 200) {
      return callback(null, body.data[0] == null ? false: true);
    } else {
      return callback(new Error('REL_MATCH: ' + options.body.query));
    }
  });
}

// **************************************************************************************
// If a realtionship needs to be created, first get the nodeIDs, creating the
// nodes if need be, and returning the nodesIds.
// **************************************************************************************
function createRelation(data, cb) {
  async.waterfall([
    function (callback) {
      getNodeIDs(data, function (err, nodeIDs) {
        if (err) return callback(err);
        return callback(null, nodeIDs);
      });
    },
    function (nodeIDs, callback){
      options = getOptions({rel:data, ids: nodeIDs} , 'REL_CREATE');
      request.post(options, function (err, response, body) {
        if (err) throw err;
        if (response.statusCode === 201) {
          return callback(null);
        } else {
          return callback(new Error('REL_CREATE: ' + response.body.message ));
        }
      });
    },
  ], cb);
}

// **************************************************************************************
// Retrieve the nodeIDs for the source and target in parallel.
// **************************************************************************************
function getNodeIDs(data, cb) {
  async.parallel([
    function (callback){
      queryNode(data.source, function (err, sourceID) {
        if (err) return callback(err);
        return callback(null, sourceID);
      });
    },
    function (callback){
      queryNode(data.target, function (err, targetID) {
        if (err) return callback(err);
        return callback(null, targetID);
      });
    }
  ], cb);
}

// **************************************************************************************
// Query the db to see if a node exists...
// If it does, return the ID.
// If it does not exist, create it an return the ID.
// **************************************************************************************
function queryNode(data, cb) {
  var options;
  async.waterfall([
    function (callback){
      options = getOptions(data.uniq, 'NODE_MATCH');
      request.post(options, function (err, response, body) {
        if (err) return callback(err);
        if (body.data != undefined && response.statusCode === 200) {
          return callback(null, body.data);
        } else {
          return callback(new Error('NODE_MATCH: ' + response.body.message));
        }
      });
    },
    function (result, callback){
      if (result[0] != null) {
        callback(null, result[0]);
      } else {
        options = getOptions(data, 'NODE_CREATE');
        request.post(options, function (err, response, body) {
          if (err) return callback(err);
          if (body.data[0] != undefined && response.statusCode === 200) {
            return callback(null, body.data[0]);
          } else {
            return callback(new Error('NODE_CREATE: ' + response.body.message));
          }
        });
      }
    }
   ], cb);
}

// **************************************************************************************
// A function with a swtich statement to set up the headers and body of the requests 
// for each type of query that needs to be made.
// **************************************************************************************
function getOptions(d, queryType) {
  var headers = {'accept': 'application/json; charset=UTF-8'};
  var query, options = { url: dataURL + "cypher", headers: headers, json: true };

  switch(queryType) {
    case 'NODE_MATCH':
      query = "MATCH (a {uniq:'" + d + "'}) RETURN id(a)";
      options.body = {query: query, params : {} };
      break;
    case 'NODE_CREATE':
      query = "CREATE (n:" + d.label + " { props } ) RETURN id(n)";
      options.body = {query: query, params: { props: d }};
      break;
    case 'REL_MATCH':
      query = "MATCH (s {uniq:'" + d.source.uniq + "'})-[r:" + d.type + "]->(t {uniq:'"+ d.target.uniq + "'}) RETURN r;"
      options.body = {query: query, params: {} };
      break;
    case 'REL_CREATE':
      options.url = dataURL + "node/" + d.ids[0] + "/relationships";
      options.body = { to: dataURL + "node/" + d.ids[1], type: d.rel.type, data: d.rel.data };
      break;
  }
  return options;
}