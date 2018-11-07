const Gazer = require('../api/gazer');
const socketSet = (app) => {
  return new Promise((resolve, reject) => {
    const gazer = new Gazer();
    gazer.init()
      .then(() => {
        resolve(app);
      });
  });
    
};

module.exports = socketSet;
