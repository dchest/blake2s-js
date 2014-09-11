BLAKE2s implementation in JavaScript
====================================

BLAKE2 is a fast and secure cryptographic hash function.

This is a pure JavaScript implementation of its 32-bit variant,
BLAKE2s (currently without tree mode support).

* [BLAKE2s-js Demo](https://dchest.github.io/blake2s-js/)
* [BLAKE2 Website](https://blake2.net)

[![Build Status](https://travis-ci.org/dchest/blake2s-js.svg?branch=master)
](https://travis-ci.org/dchest/blake2s-js)


Installation
------------

Via NPM:

    $ npm install blake2s-js

Via Bower:

    $ bower install blake2s-js


or just download `blake2s.min.js`.


Usage
-----

### new BLAKE2s(digestLength, key)

Creates a new instance of BLAKE2s hash with the given length of digest (default
and maximum 32) and an optional secret key (a `Uint8Array` or `Array` of
bytes).

#### .update(data[, offset, length])

Updates the hash with data (a `Uint8Array` or `Array` of bytes).  starting at
the given `offset` (optional, defaults to 0) and consuming the given `length`
(optional, defaults to the length of `data` minus `offset`).

#### .digest()

Returns a `Uint8Array` with the digest of consumed data. Further updates will
throw error. Repeat calls of `digest()` will return the same digest.


#### .hexDigest()

Like `digest()`, but returns a hex-encoded string.


#### BLAKE2s.digestLength = 32

Maximum digest length.


#### BLAKE2s.blockLength = 64

Block size of the hash function.


#### BLAKE2s.keyLength = 32

Maximum key length.


Example
-------

```javascript
var h = new BLAKE2s(32);
h.update(new Uint8Array([1,2,3]));
h.hexDigest();  // returns string with hex digest
h.digest();     // returns Uint8Array

// Keyed:
var key = new Uint8Array(32);
window.crypto.getRandomValues(key);
var h = new BLAKE2s(32, key);
...
```



Public domain dedication
------------------------

Written in 2012-2014 by Dmitry Chestnykh.

To the extent possible under law, the author have dedicated all copyright
and related and neighboring rights to this software to the public domain
worldwide. This software is distributed without any warranty.
<http://creativecommons.org/publicdomain/zero/1.0/>
