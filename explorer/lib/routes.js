const fs = require('fs');
const path = require('path');
const toml = require('toml');
const { promisify } = require('util');
const cfg = path.resolve(__dirname, '../config.toml');

const readConfig = require('./readConfig');

const routeSet = (app) => {
  console.log('init routes');
  const Apis = [];
  return new Promise(async(resolve, reject) => {
    // const readFile = promisify(fs.readFile);
    const config = await readConfig();
    const routes = config.api.pathname;
    let instance;
    const csArr = [];
    for(let route of routes) {
      const args = route.split('|').map((v) => v.trim());
      const entity = args[2].split('.');
      
      if (Apis.indexOf(entity[0]) <= -1) {
        Apis.push(entity[0]);
        const api = require(`../api/${entity[0]}`);
        instance = new api(app);
        csArr.push(instance);
      }
      app[args[0].toLowerCase()](
        args[1],
        instance[entity[1]]
      );
    }
    Promise.all(csArr.map(v => v.init()))
      .then(() => {
        resolve(app);
      })
      .catch(err => reject(err));
  });
};

module.exports = routeSet;
