class test {

  constructor()
  {}

  init()
  {
    console.log('test init');
    return Promise.resolve();
  }

  exec(req, res)
  {
    res.json({
      result: 1,
      message: 'dat get',
      data: [
        { a: 1, b: 2 },
        { a: 2, b: 3 }
      ]
    });
  }

  test(req, res) {
    res.json('123');
  }
}

module.exports = test;
