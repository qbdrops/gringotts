var Express = require('express');

let app = Express();

app.get('/', (req, res) => {
    res.send('hello world!');
});

app.listen(8080, () => {
    console.log('server running http://localhost:8080');
});