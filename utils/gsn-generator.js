class GSNGenerator {
  constructor (db) {
    this.db = db;
    this.gsn = 0;
    this.lock = false;
  }

  _increment () {
    return ++this.gsn;
  }

  _getGSN () {
    if (!this.lock) {
      return this._increment();
    } else {
      return false;
    }
  }

  getGSN () {
    return new Promise ((resolve) => {
      if (!this.lock) {
        resolve(this._getGSN());
      } else {
        let timerId = setInterval(() => {
          let gsn = this._getGSN();
          if (gsn !== false) {
            resolve(gsn);
            clearInterval(timerId);
          }
        }, 50);
      }
    });
  }
}

module.exports = GSNGenerator;
