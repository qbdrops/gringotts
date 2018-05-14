class GSNGenerator {
  constructor (db) {
    this.db = db;
    this.lock = false;
    this.GSN = null;
  }

  async initialize () {
    this.GSN = await this.db.loadGSN();
  }

  async dump() {
    await this.db.dumpGSN(this.GSN);
  }

  _getGSN () {
    if (!this.lock) {
      this.lock = true;
      let GSN = this.GSN + 1;
      GSN = GSN.toString(16).padStart(64, '0');
      this.GSN++;
      this.lock = false;
      return GSN;
    } else {
      return false;
    }
  }

  getGSN () {
    return new Promise ((resolve) => {
      let GSN = this._getGSN();
      if (GSN) {
        resolve(GSN);
      } else {
        let timerId = setInterval(() => {
          GSN = this._getGSN();
          if (GSN !== false) {
            resolve(GSN);
            clearInterval(timerId);
          }
        }, 50);
      }
    });
  }
}

module.exports = GSNGenerator;
