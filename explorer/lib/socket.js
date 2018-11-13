const Gazer = require('../api/gazer');

const socketSet = (app) => {
  return new Promise(async(resolve, reject) => {
    const gazer = new Gazer(app);
    gazer.init()
      .then(() => {
        resolve(app);
      });
  });
    
};

module.exports = socketSet;
