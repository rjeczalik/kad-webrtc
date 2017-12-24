Kad WebRTC Transport
====================

A WebRTC transport adapter for [Kad](https://github.com/gordonwritescode/kad).

Setup
-----

```
npm install kad kad-webrtc
```

Usage
-----

```js
var kad = require('kad');
var WebRTCTransport = require('kad-webrtc');

var node = new kad({
  // ...
  transport: new WebRTCTransport({
    signaller: SignalServer // see examples
  })
});

node.listen(node.identity);
```

Usage from Node
---------------

If you want to use this package from Node,
you will need to manually install the `wrtc` dependency.

You can do this by running:

    npm install wrtc

The reason for this is that the `wrtc` dependency doesn't install correctly
on many platforms.
So we leave it up to the user whether they want to include it or not.

Additionally, you will need to pass a reference to `wrtc` to the transport:

```js
var kad = require('kad');
var WebRTCTransport = require('kad-webrtc');
var wrtc = require('wrtc');

var node = new Node({
  // ...
  transport: new WebRTCTransport({
    wrtc: wrtc,
    signaller: SignalServer // see examples
  })
});

node.listen(node.identity);
```

Examples
--------

To build the examples, run `npm run build-examples`.

After that, look at the READMEs in each example directory
to see how to run them.
