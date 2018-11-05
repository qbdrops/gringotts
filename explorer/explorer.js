const express = require('express');
// const https = require('https');
const bodyParser = require('body-parser');
const apiRoutes = require('./lib/routes');

const port = 3002;
const app = express();

// const httpsOption = {};


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// https.createServer(httpsOption, app)
//     .listen(port, () => {
//         console.log(`explorer is running on port ${port}`);
//     })
apiRoutes(app)
  .then((server) => {
    server.listen(port, () => {
      console.log(`explorer is running on port ${port}`);
    });
  });




