var fs =      require('fs'),
    async =   require('async'),
    request = require('request');

var dataURL = '';
var q = async.queue(runTask, 1); // You will duplicate nodes if you change the "1" here!

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

q.drain = function() { console.log('Finished.'); };

exports.insert = function (inputFile, url) {
  dataURL = url;
  fs.readFile(inputFile, 'utf-8', function (err, data) {
    if (err) throw err;
    var relations = JSON.parse(data);
    relations.forEach(function (relation) {
      q.push(relation);
    });
  });
}

function checkRelationExists(d, callback) {
  var options = getOptions(d, 'REL_MATCH');
  request.post(options, function (err, response, body) {
    if (err) throw err;
    if (response.statusCode === 200) {
      return callback(null, body.data[0] == null ? false: true);
    } else {
      return callback(new Error("EXISTS: " + options.body.query));
    }
  });
}

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
          return callback(new Error('RELATE: '+ response.body.message ));
        }
      });
    },
  ], cb);
}

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
          return callback(new Error('FIND: '+ response.body.message));
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
            return callback(new Error('CREATE: '+ response.body.message));
          }
        });
      }
    }
   ], cb);
}

function getOptions(d, type) {
  var headers = {'accept': 'application/json; charset=UTF-8'};
  var query, options = { url: dataURL + "cypher", headers: headers, json: true };

  switch(type) {
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