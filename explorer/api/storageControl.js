const env = require('../../env');
const StorageManager = require('../../storage-manager');
const Booster = require('../../abi/Booster.json');
const Web3 = require('web3');

class StorageControl {
  constructor() {
    this.web3 = new Web3(env.web3Url);
    this.booster = new this.web3.eth.Contract(Booster.abi, env.contractAddress);
    this.storage = new StorageManager(this.web3);

    this.getBasicInfo = this.getBasicInfo.bind(this);
    this.getAssetList = this.getAssetList.bind(this);
    this.getBalance = this.getBalance.bind(this);
  }

  init() {
    return Promise.resolve();
  }

  async getBasicInfo (req, res) {
    res.json(
      {
        contractAddress: env.contractAddress,
        serverAddress: env.serverAddress,
        boosterName: 'No One'
      });
  }

  async getAssetList (req, res) {
    const results = await this.storage.getAssetList();
    res.json(results);
  }

  async getBalance (req, res) {
    const address = req.params.address;
    const id = req.params.id;
    console.log(req.params);
    const results = await this.storage.getBalance(address, id);
    console.log(results);
    res.json(results);
  }
} 

module.exports = StorageControl;
