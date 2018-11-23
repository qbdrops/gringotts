const express = require('express');
const http = require('http');
// const https = require('https');
const bodyParser = require('body-parser');
var cors = require('cors');
const apiRoutes = require('./lib/routes');
const apiSocket = require('./lib/socket');
const readConfig = require('./lib/readConfig');

let port;
const app = express();  

// const httpsOption = {};


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());


// https.createServer(httpsOption, app)
//     .listen(port, () => {
//         console.log(`explorer is running on port ${port}`);
//     })
readConfig()
  .then((cfg) => {
    port = cfg.port;
    return apiRoutes(app);
    // return apiSocket(app);
  })
  .then(() => {
    const server = http.createServer(app);
    apiSocket(server);
    server.listen(port, () => {
      console.log(`explorer is running on port ${port}`);
    });
  });


  



