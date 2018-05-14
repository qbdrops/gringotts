class GSNGenerator {
  constructor (db) {
    this.db = db;
    this.db.setGSNGenerator(this);
    this.GSN = null;
  }

  async initialize () {
    this.GSN = await this.db.loadGSN();
  }

  async dump() {
    await this.db.dumpGSN(this.GSN);
  }

  getGSN () {
    let GSN = this.GSN + 1;
    GSN = GSN.toString(16).padStart(64, '0');
    this.GSN++;
    return GSN;
  }
}

module.exports = GSNGenerator;
