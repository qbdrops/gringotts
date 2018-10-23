let axios = require('axios');

let attach = async () => {
  let attachRes = await axios.post('http://127.0.0.1:3000/attach');
  console.log('result:', attachRes.data);
}

attach();
