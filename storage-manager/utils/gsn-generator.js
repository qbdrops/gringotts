class GSNGenerator {
  constructor (storage) {
    this.storage = storage;
    this.GSN = null;
  }

  async initialize () {
    this.GSN = await this.storage.loadGSN();
  }

  async dump() {
    await this.storage.dumpGSN(this.GSN);
  }

  getGSN () {
    let GSN = this.GSN + 1;
    GSN = GSN.toString(16).padStart(64, '0');
    this.GSN++;
    return GSN;
  }
}

module.exports = GSNGenerator;
