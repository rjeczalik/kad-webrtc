/**
* @module kad-webrtc/transport
*/

'use strict';

var assert = require('assert');
var hat = require('hat');
var SimplePeer = require('simple-peer');
const { Duplex: DuplexStream } = require('stream');


/**
 * Represents a transport adapter over WebRTC
 */
class WebRTCTransport extends DuplexStream {

  /**
  * @constructor
  * @param {object} contact
  * @param {object} options
  */
  constructor(options) {
    super({ objectMode: true });

    assert(typeof options === 'object', 'Invalid options were supplied');
    assert(
      typeof options.signaller === 'object',
      'Invalid signaller was supplied'
    );

    this._signaller = options.signaller;
    this._wrtc = options.wrtc;
  }

  /**
  * Setup WebRTC transport
  */
  listen(identity) {
    this._identity = identity.toString('hex');
    this._peers = {};
    this._signalHandler = this._onSignal.bind(this);
    this._signaller.addListener(this._identity, this._signalHandler);
  };

  /**
  * Handle a message sent through `_signaller` from another peer
  * #_onSignal
  * @param {object} signallerMessage
  */
  _onSignal(signallerMessage) {
    var self = this;
    var signal = signallerMessage.signal;
    var sender = signallerMessage.sender;
    var handshakeID = signallerMessage.handshakeID;
    var peer = this._peers[signallerMessage.handshakeID];
    if(!peer) {
      peer = this._createPeer(sender, handshakeID, false);
      peer.once('data', function(data) {
        var buffer = new Buffer(data);
        self.push(buffer);
        peer.destroy();
      });
    }
    peer.signal(signal);
  };

  /**
   * Implements the writable interface
   * @private
   */
  _write([id, buffer, target], encoding, callback) {
    let [identity, ] = target;
    var self = this;
    var handshakeID = hat();
    var newPeer = this._createPeer(identity, handshakeID, true);
    newPeer.once('connect', function() {
      newPeer.send(buffer);
      setTimeout(function() {
        newPeer.destroy();
      }, 1000);
    });
    callback();
  };

  /**
  * Initialize a WebRTC peer and store it in `_peers`
  * #_createPeer
  * @param {string} nick
  * @param {string} handshakeID
  * @param {boolean} initiator
  */
  _createPeer(identity, handshakeID, initiator) {
    var self = this;
    var peer = new SimplePeer({ wrtc: this._wrtc, initiator: initiator });
    peer.on('signal', function(signal) {
      self._signaller.emit(identity, {
        sender: self._identity,
        handshakeID: handshakeID,
        signal: signal
      });
    });
    peer.once('close', function() {
      peer.removeAllListeners('data');
      peer.removeAllListeners('signal');
      peer.removeAllListeners('error');
      delete self._peers[handshakeID];
    });
    this._peers[handshakeID] = peer;
    return peer;
  };

  /**
  * Close the underlying socket
  * #close
  */
  close() {
    var self = this;
    Object.keys(this._peers).forEach(function(handshakeID) {
      self._peers[handshakeID].destroy();
    });
    this._peers = {};
    this._signaller.removeListener(this._identity, this._signalHandler);
  };

  _read() {}
}

module.exports = WebRTCTransport;
