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
      this.lock = true;
      let gsn = this._increment();
      this.lock = false;
      return gsn;
    } else {
      return false;
    }
  }

  getGSN () {
    return new Promise ((resolve) => {
      let gsn = this._getGSN();
      if (gsn) {
        resolve(gsn);
      } else {
        let timerId = setInterval(() => {
          gsn = this._getGSN();
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
