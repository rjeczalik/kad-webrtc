'use strict';

var expect = require('chai').expect;
var hat = require('hat');
var sinon = require('sinon');
var constants = require('kad').constants;
var WebRTCTransport = require('../lib/transport');
var Message = require('kad').Message;
var wrtc = require('wrtc');
var SimplePeer = require('simple-peer');
var EventEmitter = require('events').EventEmitter;

describe('Transports/WebRTC', function() {

  describe('@constructor', function() {

    it('should create an instance with the `new` keyword', function() {
      var signaller = new EventEmitter();
      var opts = { signaller: signaller, wrtc: wrtc };
      var transport = new WebRTCTransport(opts);
      expect(transport).to.be.instanceOf(WebRTCTransport);
    });

    it('should throw without options', function() {
      expect(function() {
        new WebRTCTransport();
      }).to.throw(Error, 'Invalid options were supplied');
    });

    it('should throw without signaller', function() {
      expect(function() {
        new WebRTCTransport({ wrtc: wrtc });
      }).to.throw(Error, 'Invalid signaller was supplied');
    });
  });

  describe('#listen', function() {

    it('should bind to the signaller', function() {
      var signaller = new EventEmitter();
      var addListener = sinon.stub(signaller, 'addListener');
      var opts = { signaller: signaller, wrtc: wrtc };
      var transport = new WebRTCTransport(opts);
      transport.listen('identity');
      expect(addListener.callCount).to.equal(1);
      expect(addListener.calledWith('identity', transport._signalHandler)).to.equal(true);
    });
  })

  describe('#_onSignal', function() {

    it('should create a new peer', function(done) {
      var signaller = new EventEmitter();
      var handshakeID = hat();
      var opts = { signaller: signaller, wrtc: wrtc };
      var transport = new WebRTCTransport(opts);
      transport.listen('identity');
      var neighbor = new SimplePeer({ wrtc: wrtc, initiator: true });
      neighbor.on('signal', function(signal) {
        var message = { signal: signal, handshakeID: handshakeID, sender: 'b' };
        transport._onSignal(message);
        var peerCount = Object.keys(transport._peers).length;
        expect(peerCount).to.equal(1);
        neighbor.destroy();
        done();
      });
    });

    it('should signal a new peer', function() {
      var signaller = new EventEmitter();
      var handshakeID = hat();
      var opts = { signaller: signaller, wrtc: wrtc };
      var transport = new WebRTCTransport(opts);
      transport.listen('identity');
      var signalStub = sinon.stub();
      sinon.stub(transport, '_createPeer', function() {
        return { once: sinon.stub(), signal: signalStub };
      });
      transport._onSignal({ signal: 'test', handshakeID: handshakeID, sender: 'b' });
      expect(signalStub.calledWith('test')).to.equal(true);
    });

    it('should signal an existing peer', function() {
      var signaller = new EventEmitter();
      var handshakeID = hat();
      var opts = { signaller: signaller, wrtc: wrtc };
      var transport = new WebRTCTransport(opts);
      transport.listen('identity');
      transport._createPeer('a', handshakeID, true);
      var peer = transport._peers[handshakeID];
      var signalStub = sinon.stub(peer, 'signal');
      var signal = '';
      transport._onSignal({ signal: signal, handshakeID: handshakeID, sender: 'b' });
      expect(signalStub.calledWith(signal)).to.equal(true);
    });
  });

  describe('#_createPeer', function() {

    it('should forward the peer\'s signals to the signaller', function(done) {
      var signaller = new EventEmitter();
      var opts = { signaller: signaller, wrtc: wrtc };
      var transport = new WebRTCTransport(opts);
      transport.listen('identity');
      var handshakeID = hat();
      var peer = transport._createPeer('b', handshakeID, true);
      signaller.once('b', function(message) {
        expect(message.sender).to.equal('identity');
        expect(message.handshakeID).to.equal(handshakeID);
        done();
      });
    });

    it('should remove the peer\'s listeners when closed', function() {
      var signaller = new EventEmitter();
      var opts = { signaller: signaller, wrtc: wrtc };
      var transport = new WebRTCTransport(opts);
      transport.listen('identity');
      var handshakeID = hat();
      var peer = transport._createPeer('b', handshakeID, true);

      // Set up some event listeners
      peer.on('data', expect.fail);
      peer.on('signal', expect.fail);
      peer.on('error', expect.fail);

      // This should remove the event listeners
      peer.emit('close');

      // Make sure the event listeners are removed
      peer.emit('data');
      peer.emit('signal');

      // If error has no event listeners, EventEmitter will throw.
      // So let's just add a stub.
      peer.on('error', sinon.stub());
      peer.emit('error');
    });

    it('should add the peer to the collection', function() {
      var signaller = new EventEmitter();
      var opts = { signaller: signaller, wrtc: wrtc };
      var transport = new WebRTCTransport(opts);
      transport.listen('identity');
      var handshakeID = hat();
      var peer = transport._createPeer('b', handshakeID, true);
      expect(transport._peers[handshakeID]).to.equal(peer);
    });
  });

  describe('#close', function() {

    it('should destroy the underlying peers', function() {
      var signaller = new EventEmitter();
      var handshakeID = hat();
      var opts = { signaller: signaller, wrtc: wrtc };
      var transport = new WebRTCTransport(opts);
      transport.listen('identity');
      transport._createPeer('identity', handshakeID, true);
      var peer = transport._peers[handshakeID];
      var destroy = sinon.stub(peer, 'destroy');
      transport.close();
      expect(destroy.callCount).to.equal(1);
      expect(transport._peers).to.deep.equal({});
    });

    it('should clean up the peers', function() {
      var signaller = new EventEmitter();
      var opts = { signaller: signaller, wrtc: wrtc };
      var transport = new WebRTCTransport(opts);
      transport.listen('identity');
      var peer = transport._createPeer();
      transport.close();
      expect(peer.destroyed).to.equal(true);
      expect(transport._peers).to.deep.equal({});
    });

    it('should unsusbcribe from the signaller', function() {
      var signaller = new EventEmitter();
      var handshakeID = hat();
      var opts = { signaller: signaller, wrtc: wrtc };
      var transport = new WebRTCTransport(opts);
      transport.listen('identity');
      var removeListener = sinon.stub(signaller, 'removeListener');
      transport._createPeer('identity', handshakeID, true);
      transport.close();
      expect(removeListener.callCount).to.equal(1);
      expect(removeListener.calledWith('identity', transport._signalHandler)).to.equal(true);
    });
  });
});
