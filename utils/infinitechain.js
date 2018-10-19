const env = require('../env');
const wizard = require('wizard_nodejs');
const axios = require('axios');
const InfinitechainBuilder = wizard.InfinitechainBuilder;
const Types = wizard.Types;

class Infinitechain {
  constructor () {
    this.infinitechain = new InfinitechainBuilder()
      .setNodeUrl(`http://0.0.0.0:${env.boosterPort}`)
      .setWeb3Url(env.web3Url)
      .setSignerKey(env.signerKey)
      .setStorage('memory')
      .build();
  }

  async sendLightTx (from, to, assetID, value, fee, metadata) {
    try {
      let remittanceData = {
        from: from,
        to: to,
        assetID: assetID,
        value: value,
        fee: fee
      };
      metadata = Object.assign({
        client: ''
      }, metadata);
      let lightTx = await this.infinitechain.client.makeLightTx(Types.remittance, remittanceData, metadata);
      let receipt = await axios.post(`${env.serverUrl}/pay`, lightTx.toJson());
      return receipt;
    } catch(e) {
      throw e;
    }
  }
}

module.exports = Infinitechain;