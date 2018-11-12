const axios = require('axios');
const env = require('./env');

let finalize = async () => {
  let finalizeRes = await axios.post(`http://127.0.0.1:${env.boosterPort}/finalize`);
  console.log('result:', finalizeRes.data);
};

finalize();