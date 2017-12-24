'use strict';

const bunyan = require('bunyan');
const levelup = require('levelup');
const memdown = require('memdown');
const kad = require('kad');

const wrtc = require('wrtc');
const EventEmitter = require('events').EventEmitter;
const signaller = new EventEmitter();

module.exports = function(numNodes, Transport) {

  const nodes = [];

  const logger = bunyan.createLogger({
    levels: ['fatal'],
    name: 'node-kademlia'
  });
  const storage = levelup('node-kademlia', {
    db: memdown
  });

  function createNode() {
    let transport = new Transport({
      signaller,
      wrtc
    });
    let contact = {};

    return kad({
      transport: transport,
      contact: contact,
      storage: storage,
      logger: logger
    });
  }

  for (let i = 0; i < numNodes; i++) {
    nodes.push(createNode());
  }

  return nodes;
};
