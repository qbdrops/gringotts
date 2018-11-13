const fs = require('fs');
const path = require('path');
const toml = require('toml');
const { promisify } = require('util');
const cfg = path.resolve(__dirname, '../config.toml');

const readConfig = () => {
  return new Promise((resolve) => {
    const readFile = promisify(fs.readFile);
    return readFile(cfg)
      .then((data) => { 
        resolve(toml.parse(data));
      });
  });
  
};

module.exports = readConfig;