class GSNGenerator {
  constructor (chain) {
    this.chain = chain;
    this.lock = false;
    this.chain.get('GSN', (err, exsitedGSN) => {
      if (err) {
        if (err.type == 'NotFoundError') {
          this.chain.put('GSN', 0);
          this.gsn = 0;
        } else {
          throw new Error('Can not fetch GSN from db.');
        }
      } else {
        this.gsn = parseInt(exsitedGSN);
      }
    });
  }

  _getGSN (leveldbTransaction = null) {
    if (!this.lock) {
      this.lock = true;
      let gsn = this.gsn + 1;
      leveldbTransaction.put('GSN', gsn);
      gsn = gsn.toString(16).padStart(64, '0');
      this.gsn++;
      this.lock = false;
      return gsn;
    } else {
      return false;
    }
  }

  getGSN (leveldbTransaction = null) {
    return new Promise ((resolve) => {
      let gsn = this._getGSN(leveldbTransaction);
      if (gsn) {
        resolve(gsn);
      } else {
        let timerId = setInterval(() => {
          gsn = this._getGSN(leveldbTransaction);
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
