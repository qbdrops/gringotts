const fs = require('fs');
const path = require('path');
const toml = require('toml');
const { promisify } = require('util');
const cfg = path.resolve(__dirname, '../config.toml');

const routeSet = (app) => {
  console.log('init routes');
  const Apis = [];
  return new Promise((resolve, reject) => {
    const readFile = promisify(fs.readFile);

    readFile(cfg)
      .then((data) => {
        const routes = toml.parse(data).api.pathname;
        let instance;
        const csArr = [];
        for(let route of routes) {
          const args = route.split('|').map((v) => v.trim());
          const entity = args[2].split('.');
          
          if (Apis.indexOf(entity[0]) < 0) {
            Apis.push(entity[0]);
            const api = require(`../api/${entity[0]}`);
            instance = new api();
            csArr.push(instance);
          }
          app[args[0].toLowerCase()](args[1], instance[entity[1]]);
        }
        return Promise.all(csArr.map(v => v.init()));
      })
      .then(() => {
        resolve(app);
      })
      .catch(err => reject(err));
  });
};

module.exports = routeSet;
