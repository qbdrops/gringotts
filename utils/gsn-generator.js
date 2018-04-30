class GSNGenerator {
  constructor (chain) {
    this.chain = chain;
    this.lock = false;
    this.chain.get('GSN', (err, exsitedGSN) => {
      if (err) {
        this.chain.put('GSN', 0);
        this.gsn = 0;
      } else {
        this.gsn = parseInt(exsitedGSN);
      }
    });
  }

  _increment () {
    let gsn = this.gsn + 1;
    this.gsn++;
    this.chain.put('GSN', gsn);
    return gsn;
  }

  _getGSN () {
    if (!this.lock) {
      this.lock = true;
      let gsn = this._increment();
      gsn = gsn.toString(16).padStart(64, '0');
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
