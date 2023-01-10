const config = require("./config");
const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')
const adapter = new FileSync(config.DB_LOCATION ? config.DB_LOCATION : 'db.json')
const db = low(adapter);
db.defaults({ runs: []})
  .write();
module.exports = db;
