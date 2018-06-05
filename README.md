# Gringotts

Gringotts plays a role in providing transaction processing and data storage. Furthermore, it is designed to build Indexed Merkle Trees and distribute receipts for security purposes of BOLT protocol.

## How to start

Before starting a Gringotts node, you need to configure environment setting.
Copy the env file and edit it to fit your environment.

```
cp env.js.example env.js
```

There are some settings you need to edit.

1. `web3Host`: Ethereum full node host.
2. `web3Port`: Ethereum full node API port.
3. `serverAddress`: Your privileged address, it would be the only address that can produce a **stage** onto the main chain.
4. `contractAddress`: The sidechain contract address for governance of BOLT protocol. Please look up the [BOLT contracts project](https://github.com/BOLT-Protocol/contracts/tree/master/gringotts).
5. `boosterPort`: Http port of Gringotts.
6. `production`: You need to configure database connection if you use PostgreSQL as your database.

```javascript
let env = {
  web3Host: '127.0.0.1',
  web3Port: '8545',
  serverAddress: '',
  contractAddress: '',
  boosterPort: '3000',
  production: {
    username: '',
    password: '',
    database: '',
    host: '127.0.0.1',
    dialect: 'postgres',
    logging: true
  }
};
```

### Database migration

If you choose PostgreSQL as your database you should do the database migration first.

```
npm run pgmigrate
```

Let's get started!

```
npm start
```

## Sending your first light transaction

Please look up the [nodejs version SDK](https://github.com/BOLT-Protocol/wizard_nodejs) for sending transactions from client side and accepting transactions from server side.

## A demo project

You can find a [example backend project](https://github.com/BOLT-Protocol/wizard_nodejs_demo) that uses our [nodejs version SDK](https://github.com/BOLT-Protocol/wizard_nodejs) and collaberates with Gringotts.

## To understand BOLT protocol

You can learn the concepts of [BOLT protocol](https://github.com/BOLT-Protocol/wiki/blob/master/yellow_paper_eng.md) including security analysis, how BOLT protocol deal with the performance issues and user experience problems of public blockchains.
