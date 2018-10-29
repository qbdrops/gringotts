const socketio = require('socket.io');

let stageHeight = 0;
class Stage {
  constructor({ stage, status, lTxs, timestamp }) {
    this.stage = stage || ++stageHeight;
    this.status = status? 'Finalized' : 'Challenge Period';
    this.lTxs = lTxs || Math.ceil(Math.random() * 100);
    this.timestamp = timestamp || new Date().getTime();
  }

  toJSON() {
    const now = new Date().getTime();
    return {
      stage: this.stage,
      status: this.status,
      lTxs: this.lTxs,
      ago: Math.floor((now - this.timestamp) / 1000)
    };
  }
}

class LightTransaction {
  constructor({ lTxs, type, value, timestamp }) {
    this.lTxs = lTxs || `0x${new Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`;
    this.type = type || 'Remittance';
    this.value = value || Math.ceil(Math.random() * 10000) / 100;
    this.timestamp = timestamp || new Date().getTime();
  }

  toJSON() {
    const now = new Date().getTime();
    return {
      lTxs: this.lTxs,
      type: this.type,
      value: this.value,
      ago: Math.floor((now - this.timestamp) / 1000)
    };
  }
}

class SocketServer {
  constructor() {
    
  }

  init({ server }) {
    this.io = socketio(server);
    this.register({
      event: 'connection',
      action: (socket) => {}
    })

    this.stages = new Array(5).fill(0).map(() => new Stage({}));
    this.lightTransactions = new Array(20).fill(0).map(() => new LightTransaction({}));

    setInterval(() => {
      this.stages = new Array(5).fill(0).map(() => new Stage({}));
      this.lightTransactions = new Array(20).fill(0).map(() => new LightTransaction({}));
      this.broadcastAll();
    }, 5000);
  }

  register({ event, action }) {
    this.io.on(event, action);
  }

  addlTx(lTx) {
    this.lightTransactions.push(new LightTransaction(lTx));
    this.broadcastLightTransactions();
  }
  addStage(stage) {
    this.stages.push(new Stage(stage));
    this.broadcastStages();
  }
  broadcastAll() {
    this.broadcastStages();
    this.broadcastLightTransactions();
  }
  broadcastStages() {
    this.io.emit('stages', this.stages.map(v => v.toJSON()));
  }
  broadcastLightTransactions() {
    this.io.emit('lTxs', this.lightTransactions.map(v => v.toJSON()));
  }
}

module.exports = SocketServer;