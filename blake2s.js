/* Written in 2012-2014 by Dmitry Chestnykh. Public domain */
var BLAKE2s = (function() {

  var MAX_DIGEST_LENGTH = 32;
  var BLOCK_LENGTH = 64;
  var MAX_KEY_LENGTH = 32;
  var PERSONALIZATION_LENGTH = 8;
  var SALT_LENGTH = 8;

  var IV = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ]);

  function isByteArray(a) {
    var kind = Object.prototype.toString.call(a);
    return kind === '[object Uint8Array]' || kind === '[object Array]';
  }

  function checkConfig(config) {
    for (var key in config) {
      switch (key) {
      case 'key':
      case 'personalization':
      case 'salt':
        if (!isByteArray(config[key])) {
          throw new TypeError(key + ' must be a Uint8Array or an Array of bytes');
        }
        break;
      default:
        throw new Error('unexpected key in config: ' + key);
      }
    }
  }

  function load32(a, i) {
    return (a[i + 0] & 0xff) | ((a[i + 1] & 0xff) << 8) |
           ((a[i + 2] & 0xff) << 16) | ((a[i + 3] & 0xff) << 24);
  }

  function BLAKE2s(digestLength, keyOrConfig) {
    if (typeof digestLength === 'undefined')
      digestLength = MAX_DIGEST_LENGTH;

    if (digestLength <= 0 || digestLength > MAX_DIGEST_LENGTH)
      throw new Error('bad digestLength');

    this.digestLength = digestLength;

    var key, personalization, salt;
    var keyLength = 0;

    if (isByteArray(keyOrConfig)) {
      key = keyOrConfig;
      keyLength = key.length;
    } else if (typeof keyOrConfig === 'object') {
      checkConfig(keyOrConfig);

      key = keyOrConfig.key;
      keyLength = key ? key.length : 0;

      salt = keyOrConfig.salt;
      personalization = keyOrConfig.personalization;
    } else if (keyOrConfig) {
      throw new Error('unexpected key or config type');
    }

    if (keyLength > MAX_KEY_LENGTH)
      throw new Error('key is too long');
    if (salt && salt.length !== SALT_LENGTH)
      throw new Error('salt must be ' + SALT_LENGTH + ' bytes');
    if (personalization && personalization.length !== PERSONALIZATION_LENGTH)
      throw new Error('personalization must be ' + PERSONALIZATION_LENGTH + ' bytes');

    this.isFinished = false;

    // Hash state.
    this.h = new Uint32Array(IV);

    // XOR parts of parameter block into initial state.
    var param = new Uint8Array([digestLength & 0xff, keyLength, 1, 1]);
    this.h[0] ^= load32(param, 0);

    if (salt) {
      this.h[4] ^= load32(salt, 0);
      this.h[5] ^= load32(salt, 4);
    }

    if (personalization) {
      this.h[6] ^= load32(personalization, 0);
      this.h[7] ^= load32(personalization, 4);
    }

    // Buffer for data.
    this.x = new Uint8Array(BLOCK_LENGTH);
    this.nx = 0;

    // Byte counter.
    this.t0 = 0;
    this.t1 = 0;

    // Flags.
    this.f0 = 0;
    this.f1 = 0;

    // Fill buffer with key, if present.
    if (keyLength > 0) {
      for (var i = 0; i < keyLength; i++) this.x[i] = key[i];
      for (i = keyLength; i < BLOCK_LENGTH; i++) this.x[i] = 0;
      this.nx = BLOCK_LENGTH;
    }
  }

  BLAKE2s.prototype.processBlock = function(length) {
    this.t0 += length;
    if (this.t0 != this.t0 >>> 0) {
      this.t0 = 0;
      this.t1++;
    }

    var v0  = this.h[0],
        v1  = this.h[1],
        v2  = this.h[2],
        v3  = this.h[3],
        v4  = this.h[4],
        v5  = this.h[5],
        v6  = this.h[6],
        v7  = this.h[7],
        v8  = IV[0],
        v9  = IV[1],
        v10 = IV[2],
        v11 = IV[3],
        v12 = IV[4] ^ this.t0,
        v13 = IV[5] ^ this.t1,
        v14 = IV[6] ^ this.f0,
        v15 = IV[7] ^ this.f1;

    var x = this.x;
    var m0  = x[ 0] & 0xff | (x[ 1] & 0xff) << 8 | (x[ 2] & 0xff) << 16 | (x[ 3] & 0xff) << 24,
        m1  = x[ 4] & 0xff | (x[ 5] & 0xff) << 8 | (x[ 6] & 0xff) << 16 | (x[ 7] & 0xff) << 24,
        m2  = x[ 8] & 0xff | (x[ 9] & 0xff) << 8 | (x[10] & 0xff) << 16 | (x[11] & 0xff) << 24,
        m3  = x[12] & 0xff | (x[13] & 0xff) << 8 | (x[14] & 0xff) << 16 | (x[15] & 0xff) << 24,
        m4  = x[16] & 0xff | (x[17] & 0xff) << 8 | (x[18] & 0xff) << 16 | (x[19] & 0xff) << 24,
        m5  = x[20] & 0xff | (x[21] & 0xff) << 8 | (x[22] & 0xff) << 16 | (x[23] & 0xff) << 24,
        m6  = x[24] & 0xff | (x[25] & 0xff) << 8 | (x[26] & 0xff) << 16 | (x[27] & 0xff) << 24,
        m7  = x[28] & 0xff | (x[29] & 0xff) << 8 | (x[30] & 0xff) << 16 | (x[31] & 0xff) << 24,
        m8  = x[32] & 0xff | (x[33] & 0xff) << 8 | (x[34] & 0xff) << 16 | (x[35] & 0xff) << 24,
        m9  = x[36] & 0xff | (x[37] & 0xff) << 8 | (x[38] & 0xff) << 16 | (x[39] & 0xff) << 24,
        m10 = x[40] & 0xff | (x[41] & 0xff) << 8 | (x[42] & 0xff) << 16 | (x[43] & 0xff) << 24,
        m11 = x[44] & 0xff | (x[45] & 0xff) << 8 | (x[46] & 0xff) << 16 | (x[47] & 0xff) << 24,
        m12 = x[48] & 0xff | (x[49] & 0xff) << 8 | (x[50] & 0xff) << 16 | (x[51] & 0xff) << 24,
        m13 = x[52] & 0xff | (x[53] & 0xff) << 8 | (x[54] & 0xff) << 16 | (x[55] & 0xff) << 24,
        m14 = x[56] & 0xff | (x[57] & 0xff) << 8 | (x[58] & 0xff) << 16 | (x[59] & 0xff) << 24,
        m15 = x[60] & 0xff | (x[61] & 0xff) << 8 | (x[62] & 0xff) << 16 | (x[63] & 0xff) << 24;

    // Round 1.
    v0 = v0 + m0 | 0;
    v0 = v0 + v4 | 0;
    v12 ^= v0;
    v12 = v12 << (32 - 16) | v12 >>> 16;
    v8 = v8 + v12 | 0;
    v4 ^= v8;
    v4 = v4 << (32 - 12) | v4 >>> 12;
    v1 = v1 + m2 | 0;
    v1 = v1 + v5 | 0;
    v13 ^= v1;
    v13 = v13 << (32 - 16) | v13 >>> 16;
    v9 = v9 + v13 | 0;
    v5 ^= v9;
    v5 = v5 << (32 - 12) | v5 >>> 12;
    v2 = v2 + m4 | 0;
    v2 = v2 + v6 | 0;
    v14 ^= v2;
    v14 = v14 << (32 - 16) | v14 >>> 16;
    v10 = v10 + v14 | 0;
    v6 ^= v10;
    v6 = v6 << (32 - 12) | v6 >>> 12;
    v3 = v3 + m6 | 0;
    v3 = v3 + v7 | 0;
    v15 ^= v3;
    v15 = v15 << (32 - 16) | v15 >>> 16;
    v11 = v11 + v15 | 0;
    v7 ^= v11;
    v7 = v7 << (32 - 12) | v7 >>> 12;
    v2 = v2 + m5 | 0;
    v2 = v2 + v6 | 0;
    v14 ^= v2;
    v14 = v14 << (32 - 8) | v14 >>> 8;
    v10 = v10 + v14 | 0;
    v6 ^= v10;
    v6 = v6 << (32 - 7) | v6 >>> 7;
    v3 = v3 + m7 | 0;
    v3 = v3 + v7 | 0;
    v15 ^= v3;
    v15 = v15 << (32 - 8) | v15 >>> 8;
    v11 = v11 + v15 | 0;
    v7 ^= v11;
    v7 = v7 << (32 - 7) | v7 >>> 7;
    v1 = v1 + m3 | 0;
    v1 = v1 + v5 | 0;
    v13 ^= v1;
    v13 = v13 << (32 - 8) | v13 >>> 8;
    v9 = v9 + v13 | 0;
    v5 ^= v9;
    v5 = v5 << (32 - 7) | v5 >>> 7;
    v0 = v0 + m1 | 0;
    v0 = v0 + v4 | 0;
    v12 ^= v0;
    v12 = v12 << (32 - 8) | v12 >>> 8;
    v8 = v8 + v12 | 0;
    v4 ^= v8;
    v4 = v4 << (32 - 7) | v4 >>> 7;
    v0 = v0 + m8 | 0;
    v0 = v0 + v5 | 0;
    v15 ^= v0;
    v15 = v15 << (32 - 16) | v15 >>> 16;
    v10 = v10 + v15 | 0;
    v5 ^= v10;
    v5 = v5 << (32 - 12) | v5 >>> 12;
    v1 = v1 + m10 | 0;
    v1 = v1 + v6 | 0;
    v12 ^= v1;
    v12 = v12 << (32 - 16) | v12 >>> 16;
    v11 = v11 + v12 | 0;
    v6 ^= v11;
    v6 = v6 << (32 - 12) | v6 >>> 12;
    v2 = v2 + m12 | 0;
    v2 = v2 + v7 | 0;
    v13 ^= v2;
    v13 = v13 << (32 - 16) | v13 >>> 16;
    v8 = v8 + v13 | 0;
    v7 ^= v8;
    v7 = v7 << (32 - 12) | v7 >>> 12;
    v3 = v3 + m14 | 0;
    v3 = v3 + v4 | 0;
    v14 ^= v3;
    v14 = v14 << (32 - 16) | v14 >>> 16;
    v9 = v9 + v14 | 0;
    v4 ^= v9;
    v4 = v4 << (32 - 12) | v4 >>> 12;
    v2 = v2 + m13 | 0;
    v2 = v2 + v7 | 0;
    v13 ^= v2;
    v13 = v13 << (32 - 8) | v13 >>> 8;
    v8 = v8 + v13 | 0;
    v7 ^= v8;
    v7 = v7 << (32 - 7) | v7 >>> 7;
    v3 = v3 + m15 | 0;
    v3 = v3 + v4 | 0;
    v14 ^= v3;
    v14 = v14 << (32 - 8) | v14 >>> 8;
    v9 = v9 + v14 | 0;
    v4 ^= v9;
    v4 = v4 << (32 - 7) | v4 >>> 7;
    v1 = v1 + m11 | 0;
    v1 = v1 + v6 | 0;
    v12 ^= v1;
    v12 = v12 << (32 - 8) | v12 >>> 8;
    v11 = v11 + v12 | 0;
    v6 ^= v11;
    v6 = v6 << (32 - 7) | v6 >>> 7;
    v0 = v0 + m9 | 0;
    v0 = v0 + v5 | 0;
    v15 ^= v0;
    v15 = v15 << (32 - 8) | v15 >>> 8;
    v10 = v10 + v15 | 0;
    v5 ^= v10;
    v5 = v5 << (32 - 7) | v5 >>> 7;

    // Round 2.
    v0 = v0 + m14 | 0;
    v0 = v0 + v4 | 0;
    v12 ^= v0;
    v12 = v12 << (32 - 16) | v12 >>> 16;
    v8 = v8 + v12 | 0;
    v4 ^= v8;
    v4 = v4 << (32 - 12) | v4 >>> 12;
    v1 = v1 + m4 | 0;
    v1 = v1 + v5 | 0;
    v13 ^= v1;
    v13 = v13 << (32 - 16) | v13 >>> 16;
    v9 = v9 + v13 | 0;
    v5 ^= v9;
    v5 = v5 << (32 - 12) | v5 >>> 12;
    v2 = v2 + m9 | 0;
    v2 = v2 + v6 | 0;
    v14 ^= v2;
    v14 = v14 << (32 - 16) | v14 >>> 16;
    v10 = v10 + v14 | 0;
    v6 ^= v10;
    v6 = v6 << (32 - 12) | v6 >>> 12;
    v3 = v3 + m13 | 0;
    v3 = v3 + v7 | 0;
    v15 ^= v3;
    v15 = v15 << (32 - 16) | v15 >>> 16;
    v11 = v11 + v15 | 0;
    v7 ^= v11;
    v7 = v7 << (32 - 12) | v7 >>> 12;
    v2 = v2 + m15 | 0;
    v2 = v2 + v6 | 0;
    v14 ^= v2;
    v14 = v14 << (32 - 8) | v14 >>> 8;
    v10 = v10 + v14 | 0;
    v6 ^= v10;
    v6 = v6 << (32 - 7) | v6 >>> 7;
    v3 = v3 + m6 | 0;
    v3 = v3 + v7 | 0;
    v15 ^= v3;
    v15 = v15 << (32 - 8) | v15 >>> 8;
    v11 = v11 + v15 | 0;
    v7 ^= v11;
    v7 = v7 << (32 - 7) | v7 >>> 7;
    v1 = v1 + m8 | 0;
    v1 = v1 + v5 | 0;
    v13 ^= v1;
    v13 = v13 << (32 - 8) | v13 >>> 8;
    v9 = v9 + v13 | 0;
    v5 ^= v9;
    v5 = v5 << (32 - 7) | v5 >>> 7;
    v0 = v0 + m10 | 0;
    v0 = v0 + v4 | 0;
    v12 ^= v0;
    v12 = v12 << (32 - 8) | v12 >>> 8;
    v8 = v8 + v12 | 0;
    v4 ^= v8;
    v4 = v4 << (32 - 7) | v4 >>> 7;
    v0 = v0 + m1 | 0;
    v0 = v0 + v5 | 0;
    v15 ^= v0;
    v15 = v15 << (32 - 16) | v15 >>> 16;
    v10 = v10 + v15 | 0;
    v5 ^= v10;
    v5 = v5 << (32 - 12) | v5 >>> 12;
    v1 = v1 + m0 | 0;
    v1 = v1 + v6 | 0;
    v12 ^= v1;
    v12 = v12 << (32 - 16) | v12 >>> 16;
    v11 = v11 + v12 | 0;
    v6 ^= v11;
    v6 = v6 << (32 - 12) | v6 >>> 12;
    v2 = v2 + m11 | 0;
    v2 = v2 + v7 | 0;
    v13 ^= v2;
    v13 = v13 << (32 - 16) | v13 >>> 16;
    v8 = v8 + v13 | 0;
    v7 ^= v8;
    v7 = v7 << (32 - 12) | v7 >>> 12;
    v3 = v3 + m5 | 0;
    v3 = v3 + v4 | 0;
    v14 ^= v3;
    v14 = v14 << (32 - 16) | v14 >>> 16;
    v9 = v9 + v14 | 0;
    v4 ^= v9;
    v4 = v4 << (32 - 12) | v4 >>> 12;
    v2 = v2 + m7 | 0;
    v2 = v2 + v7 | 0;
    v13 ^= v2;
    v13 = v13 << (32 - 8) | v13 >>> 8;
    v8 = v8 + v13 | 0;
    v7 ^= v8;
    v7 = v7 << (32 - 7) | v7 >>> 7;
    v3 = v3 + m3 | 0;
    v3 = v3 + v4 | 0;
    v14 ^= v3;
    v14 = v14 << (32 - 8) | v14 >>> 8;
    v9 = v9 + v14 | 0;
    v4 ^= v9;
    v4 = v4 << (32 - 7) | v4 >>> 7;
    v1 = v1 + m2 | 0;
    v1 = v1 + v6 | 0;
    v12 ^= v1;
    v12 = v12 << (32 - 8) | v12 >>> 8;
    v11 = v11 + v12 | 0;
    v6 ^= v11;
    v6 = v6 << (32 - 7) | v6 >>> 7;
    v0 = v0 + m12 | 0;
    v0 = v0 + v5 | 0;
    v15 ^= v0;
    v15 = v15 << (32 - 8) | v15 >>> 8;
    v10 = v10 + v15 | 0;
    v5 ^= v10;
    v5 = v5 << (32 - 7) | v5 >>> 7;

    // Round 3.
    v0 = v0 + m11 | 0;
    v0 = v0 + v4 | 0;
    v12 ^= v0;
    v12 = v12 << (32 - 16) | v12 >>> 16;
    v8 = v8 + v12 | 0;
    v4 ^= v8;
    v4 = v4 << (32 - 12) | v4 >>> 12;
    v1 = v1 + m12 | 0;
    v1 = v1 + v5 | 0;
    v13 ^= v1;
    v13 = v13 << (32 - 16) | v13 >>> 16;
    v9 = v9 + v13 | 0;
    v5 ^= v9;
    v5 = v5 << (32 - 12) | v5 >>> 12;
    v2 = v2 + m5 | 0;
    v2 = v2 + v6 | 0;
    v14 ^= v2;
    v14 = v14 << (32 - 16) | v14 >>> 16;
    v10 = v10 + v14 | 0;
    v6 ^= v10;
    v6 = v6 << (32 - 12) | v6 >>> 12;
    v3 = v3 + m15 | 0;
    v3 = v3 + v7 | 0;
    v15 ^= v3;
    v15 = v15 << (32 - 16) | v15 >>> 16;
    v11 = v11 + v15 | 0;
    v7 ^= v11;
    v7 = v7 << (32 - 12) | v7 >>> 12;
    v2 = v2 + m2 | 0;
    v2 = v2 + v6 | 0;
    v14 ^= v2;
    v14 = v14 << (32 - 8) | v14 >>> 8;
    v10 = v10 + v14 | 0;
    v6 ^= v10;
    v6 = v6 << (32 - 7) | v6 >>> 7;
    v3 = v3 + m13 | 0;
    v3 = v3 + v7 | 0;
    v15 ^= v3;
    v15 = v15 << (32 - 8) | v15 >>> 8;
    v11 = v11 + v15 | 0;
    v7 ^= v11;
    v7 = v7 << (32 - 7) | v7 >>> 7;
    v1 = v1 + m0 | 0;
    v1 = v1 + v5 | 0;
    v13 ^= v1;
    v13 = v13 << (32 - 8) | v13 >>> 8;
    v9 = v9 + v13 | 0;
    v5 ^= v9;
    v5 = v5 << (32 - 7) | v5 >>> 7;
    v0 = v0 + m8 | 0;
    v0 = v0 + v4 | 0;
    v12 ^= v0;
    v12 = v12 << (32 - 8) | v12 >>> 8;
    v8 = v8 + v12 | 0;
    v4 ^= v8;
    v4 = v4 << (32 - 7) | v4 >>> 7;
    v0 = v0 + m10 | 0;
    v0 = v0 + v5 | 0;
    v15 ^= v0;
    v15 = v15 << (32 - 16) | v15 >>> 16;
    v10 = v10 + v15 | 0;
    v5 ^= v10;
    v5 = v5 << (32 - 12) | v5 >>> 12;
    v1 = v1 + m3 | 0;
    v1 = v1 + v6 | 0;
    v12 ^= v1;
    v12 = v12 << (32 - 16) | v12 >>> 16;
    v11 = v11 + v12 | 0;
    v6 ^= v11;
    v6 = v6 << (32 - 12) | v6 >>> 12;
    v2 = v2 + m7 | 0;
    v2 = v2 + v7 | 0;
    v13 ^= v2;
    v13 = v13 << (32 - 16) | v13 >>> 16;
    v8 = v8 + v13 | 0;
    v7 ^= v8;
    v7 = v7 << (32 - 12) | v7 >>> 12;
    v3 = v3 + m9 | 0;
    v3 = v3 + v4 | 0;
    v14 ^= v3;
    v14 = v14 << (32 - 16) | v14 >>> 16;
    v9 = v9 + v14 | 0;
    v4 ^= v9;
    v4 = v4 << (32 - 12) | v4 >>> 12;
    v2 = v2 + m1 | 0;
    v2 = v2 + v7 | 0;
    v13 ^= v2;
    v13 = v13 << (32 - 8) | v13 >>> 8;
    v8 = v8 + v13 | 0;
    v7 ^= v8;
    v7 = v7 << (32 - 7) | v7 >>> 7;
    v3 = v3 + m4 | 0;
    v3 = v3 + v4 | 0;
    v14 ^= v3;
    v14 = v14 << (32 - 8) | v14 >>> 8;
    v9 = v9 + v14 | 0;
    v4 ^= v9;
    v4 = v4 << (32 - 7) | v4 >>> 7;
    v1 = v1 + m6 | 0;
    v1 = v1 + v6 | 0;
    v12 ^= v1;
    v12 = v12 << (32 - 8) | v12 >>> 8;
    v11 = v11 + v12 | 0;
    v6 ^= v11;
    v6 = v6 << (32 - 7) | v6 >>> 7;
    v0 = v0 + m14 | 0;
    v0 = v0 + v5 | 0;
    v15 ^= v0;
    v15 = v15 << (32 - 8) | v15 >>> 8;
    v10 = v10 + v15 | 0;
    v5 ^= v10;
    v5 = v5 << (32 - 7) | v5 >>> 7;

    // Round 4.
    v0 = v0 + m7 | 0;
    v0 = v0 + v4 | 0;
    v12 ^= v0;
    v12 = v12 << (32 - 16) | v12 >>> 16;
    v8 = v8 + v12 | 0;
    v4 ^= v8;
    v4 = v4 << (32 - 12) | v4 >>> 12;
    v1 = v1 + m3 | 0;
    v1 = v1 + v5 | 0;
    v13 ^= v1;
    v13 = v13 << (32 - 16) | v13 >>> 16;
    v9 = v9 + v13 | 0;
    v5 ^= v9;
    v5 = v5 << (32 - 12) | v5 >>> 12;
    v2 = v2 + m13 | 0;
    v2 = v2 + v6 | 0;
    v14 ^= v2;
    v14 = v14 << (32 - 16) | v14 >>> 16;
    v10 = v10 + v14 | 0;
    v6 ^= v10;
    v6 = v6 << (32 - 12) | v6 >>> 12;
    v3 = v3 + m11 | 0;
    v3 = v3 + v7 | 0;
    v15 ^= v3;
    v15 = v15 << (32 - 16) | v15 >>> 16;
    v11 = v11 + v15 | 0;
    v7 ^= v11;
    v7 = v7 << (32 - 12) | v7 >>> 12;
    v2 = v2 + m12 | 0;
    v2 = v2 + v6 | 0;
    v14 ^= v2;
    v14 = v14 << (32 - 8) | v14 >>> 8;
    v10 = v10 + v14 | 0;
    v6 ^= v10;
    v6 = v6 << (32 - 7) | v6 >>> 7;
    v3 = v3 + m14 | 0;
    v3 = v3 + v7 | 0;
    v15 ^= v3;
    v15 = v15 << (32 - 8) | v15 >>> 8;
    v11 = v11 + v15 | 0;
    v7 ^= v11;
    v7 = v7 << (32 - 7) | v7 >>> 7;
    v1 = v1 + m1 | 0;
    v1 = v1 + v5 | 0;
    v13 ^= v1;
    v13 = v13 << (32 - 8) | v13 >>> 8;
    v9 = v9 + v13 | 0;
    v5 ^= v9;
    v5 = v5 << (32 - 7) | v5 >>> 7;
    v0 = v0 + m9 | 0;
    v0 = v0 + v4 | 0;
    v12 ^= v0;
    v12 = v12 << (32 - 8) | v12 >>> 8;
    v8 = v8 + v12 | 0;
    v4 ^= v8;
    v4 = v4 << (32 - 7) | v4 >>> 7;
    v0 = v0 + m2 | 0;
    v0 = v0 + v5 | 0;
    v15 ^= v0;
    v15 = v15 << (32 - 16) | v15 >>> 16;
    v10 = v10 + v15 | 0;
    v5 ^= v10;
    v5 = v5 << (32 - 12) | v5 >>> 12;
    v1 = v1 + m5 | 0;
    v1 = v1 + v6 | 0;
    v12 ^= v1;
    v12 = v12 << (32 - 16) | v12 >>> 16;
    v11 = v11 + v12 | 0;
    v6 ^= v11;
    v6 = v6 << (32 - 12) | v6 >>> 12;
    v2 = v2 + m4 | 0;
    v2 = v2 + v7 | 0;
    v13 ^= v2;
    v13 = v13 << (32 - 16) | v13 >>> 16;
    v8 = v8 + v13 | 0;
    v7 ^= v8;
    v7 = v7 << (32 - 12) | v7 >>> 12;
    v3 = v3 + m15 | 0;
    v3 = v3 + v4 | 0;
    v14 ^= v3;
    v14 = v14 << (32 - 16) | v14 >>> 16;
    v9 = v9 + v14 | 0;
    v4 ^= v9;
    v4 = v4 << (32 - 12) | v4 >>> 12;
    v2 = v2 + m0 | 0;
    v2 = v2 + v7 | 0;
    v13 ^= v2;
    v13 = v13 << (32 - 8) | v13 >>> 8;
    v8 = v8 + v13 | 0;
    v7 ^= v8;
    v7 = v7 << (32 - 7) | v7 >>> 7;
    v3 = v3 + m8 | 0;
    v3 = v3 + v4 | 0;
    v14 ^= v3;
    v14 = v14 << (32 - 8) | v14 >>> 8;
    v9 = v9 + v14 | 0;
    v4 ^= v9;
    v4 = v4 << (32 - 7) | v4 >>> 7;
    v1 = v1 + m10 | 0;
    v1 = v1 + v6 | 0;
    v12 ^= v1;
    v12 = v12 << (32 - 8) | v12 >>> 8;
    v11 = v11 + v12 | 0;
    v6 ^= v11;
    v6 = v6 << (32 - 7) | v6 >>> 7;
    v0 = v0 + m6 | 0;
    v0 = v0 + v5 | 0;
    v15 ^= v0;
    v15 = v15 << (32 - 8) | v15 >>> 8;
    v10 = v10 + v15 | 0;
    v5 ^= v10;
    v5 = v5 << (32 - 7) | v5 >>> 7;

    // Round 5.
    v0 = v0 + m9 | 0;
    v0 = v0 + v4 | 0;
    v12 ^= v0;
    v12 = v12 << (32 - 16) | v12 >>> 16;
    v8 = v8 + v12 | 0;
    v4 ^= v8;
    v4 = v4 << (32 - 12) | v4 >>> 12;
    v1 = v1 + m5 | 0;
    v1 = v1 + v5 | 0;
    v13 ^= v1;
    v13 = v13 << (32 - 16) | v13 >>> 16;
    v9 = v9 + v13 | 0;
    v5 ^= v9;
    v5 = v5 << (32 - 12) | v5 >>> 12;
    v2 = v2 + m2 | 0;
    v2 = v2 + v6 | 0;
    v14 ^= v2;
    v14 = v14 << (32 - 16) | v14 >>> 16;
    v10 = v10 + v14 | 0;
    v6 ^= v10;
    v6 = v6 << (32 - 12) | v6 >>> 12;
    v3 = v3 + m10 | 0;
    v3 = v3 + v7 | 0;
    v15 ^= v3;
    v15 = v15 << (32 - 16) | v15 >>> 16;
    v11 = v11 + v15 | 0;
    v7 ^= v11;
    v7 = v7 << (32 - 12) | v7 >>> 12;
    v2 = v2 + m4 | 0;
    v2 = v2 + v6 | 0;
    v14 ^= v2;
    v14 = v14 << (32 - 8) | v14 >>> 8;
    v10 = v10 + v14 | 0;
    v6 ^= v10;
    v6 = v6 << (32 - 7) | v6 >>> 7;
    v3 = v3 + m15 | 0;
    v3 = v3 + v7 | 0;
    v15 ^= v3;
    v15 = v15 << (32 - 8) | v15 >>> 8;
    v11 = v11 + v15 | 0;
    v7 ^= v11;
    v7 = v7 << (32 - 7) | v7 >>> 7;
    v1 = v1 + m7 | 0;
    v1 = v1 + v5 | 0;
    v13 ^= v1;
    v13 = v13 << (32 - 8) | v13 >>> 8;
    v9 = v9 + v13 | 0;
    v5 ^= v9;
    v5 = v5 << (32 - 7) | v5 >>> 7;
    v0 = v0 + m0 | 0;
    v0 = v0 + v4 | 0;
    v12 ^= v0;
    v12 = v12 << (32 - 8) | v12 >>> 8;
    v8 = v8 + v12 | 0;
    v4 ^= v8;
    v4 = v4 << (32 - 7) | v4 >>> 7;
    v0 = v0 + m14 | 0;
    v0 = v0 + v5 | 0;
    v15 ^= v0;
    v15 = v15 << (32 - 16) | v15 >>> 16;
    v10 = v10 + v15 | 0;
    v5 ^= v10;
    v5 = v5 << (32 - 12) | v5 >>> 12;
    v1 = v1 + m11 | 0;
    v1 = v1 + v6 | 0;
    v12 ^= v1;
    v12 = v12 << (32 - 16) | v12 >>> 16;
    v11 = v11 + v12 | 0;
    v6 ^= v11;
    v6 = v6 << (32 - 12) | v6 >>> 12;
    v2 = v2 + m6 | 0;
    v2 = v2 + v7 | 0;
    v13 ^= v2;
    v13 = v13 << (32 - 16) | v13 >>> 16;
    v8 = v8 + v13 | 0;
    v7 ^= v8;
    v7 = v7 << (32 - 12) | v7 >>> 12;
    v3 = v3 + m3 | 0;
    v3 = v3 + v4 | 0;
    v14 ^= v3;
    v14 = v14 << (32 - 16) | v14 >>> 16;
    v9 = v9 + v14 | 0;
    v4 ^= v9;
    v4 = v4 << (32 - 12) | v4 >>> 12;
    v2 = v2 + m8 | 0;
    v2 = v2 + v7 | 0;
    v13 ^= v2;
    v13 = v13 << (32 - 8) | v13 >>> 8;
    v8 = v8 + v13 | 0;
    v7 ^= v8;
    v7 = v7 << (32 - 7) | v7 >>> 7;
    v3 = v3 + m13 | 0;
    v3 = v3 + v4 | 0;
    v14 ^= v3;
    v14 = v14 << (32 - 8) | v14 >>> 8;
    v9 = v9 + v14 | 0;
    v4 ^= v9;
    v4 = v4 << (32 - 7) | v4 >>> 7;
    v1 = v1 + m12 | 0;
    v1 = v1 + v6 | 0;
    v12 ^= v1;
    v12 = v12 << (32 - 8) | v12 >>> 8;
    v11 = v11 + v12 | 0;
    v6 ^= v11;
    v6 = v6 << (32 - 7) | v6 >>> 7;
    v0 = v0 + m1 | 0;
    v0 = v0 + v5 | 0;
    v15 ^= v0;
    v15 = v15 << (32 - 8) | v15 >>> 8;
    v10 = v10 + v15 | 0;
    v5 ^= v10;
    v5 = v5 << (32 - 7) | v5 >>> 7;

    // Round 6.
    v0 = v0 + m2 | 0;
    v0 = v0 + v4 | 0;
    v12 ^= v0;
    v12 = v12 << (32 - 16) | v12 >>> 16;
    v8 = v8 + v12 | 0;
    v4 ^= v8;
    v4 = v4 << (32 - 12) | v4 >>> 12;
    v1 = v1 + m6 | 0;
    v1 = v1 + v5 | 0;
    v13 ^= v1;
    v13 = v13 << (32 - 16) | v13 >>> 16;
    v9 = v9 + v13 | 0;
    v5 ^= v9;
    v5 = v5 << (32 - 12) | v5 >>> 12;
    v2 = v2 + m0 | 0;
    v2 = v2 + v6 | 0;
    v14 ^= v2;
    v14 = v14 << (32 - 16) | v14 >>> 16;
    v10 = v10 + v14 | 0;
    v6 ^= v10;
    v6 = v6 << (32 - 12) | v6 >>> 12;
    v3 = v3 + m8 | 0;
    v3 = v3 + v7 | 0;
    v15 ^= v3;
    v15 = v15 << (32 - 16) | v15 >>> 16;
    v11 = v11 + v15 | 0;
    v7 ^= v11;
    v7 = v7 << (32 - 12) | v7 >>> 12;
    v2 = v2 + m11 | 0;
    v2 = v2 + v6 | 0;
    v14 ^= v2;
    v14 = v14 << (32 - 8) | v14 >>> 8;
    v10 = v10 + v14 | 0;
    v6 ^= v10;
    v6 = v6 << (32 - 7) | v6 >>> 7;
    v3 = v3 + m3 | 0;
    v3 = v3 + v7 | 0;
    v15 ^= v3;
    v15 = v15 << (32 - 8) | v15 >>> 8;
    v11 = v11 + v15 | 0;
    v7 ^= v11;
    v7 = v7 << (32 - 7) | v7 >>> 7;
    v1 = v1 + m10 | 0;
    v1 = v1 + v5 | 0;
    v13 ^= v1;
    v13 = v13 << (32 - 8) | v13 >>> 8;
    v9 = v9 + v13 | 0;
    v5 ^= v9;
    v5 = v5 << (32 - 7) | v5 >>> 7;
    v0 = v0 + m12 | 0;
    v0 = v0 + v4 | 0;
    v12 ^= v0;
    v12 = v12 << (32 - 8) | v12 >>> 8;
    v8 = v8 + v12 | 0;
    v4 ^= v8;
    v4 = v4 << (32 - 7) | v4 >>> 7;
    v0 = v0 + m4 | 0;
    v0 = v0 + v5 | 0;
    v15 ^= v0;
    v15 = v15 << (32 - 16) | v15 >>> 16;
    v10 = v10 + v15 | 0;
    v5 ^= v10;
    v5 = v5 << (32 - 12) | v5 >>> 12;
    v1 = v1 + m7 | 0;
    v1 = v1 + v6 | 0;
    v12 ^= v1;
    v12 = v12 << (32 - 16) | v12 >>> 16;
    v11 = v11 + v12 | 0;
    v6 ^= v11;
    v6 = v6 << (32 - 12) | v6 >>> 12;
    v2 = v2 + m15 | 0;
    v2 = v2 + v7 | 0;
    v13 ^= v2;
    v13 = v13 << (32 - 16) | v13 >>> 16;
    v8 = v8 + v13 | 0;
    v7 ^= v8;
    v7 = v7 << (32 - 12) | v7 >>> 12;
    v3 = v3 + m1 | 0;
    v3 = v3 + v4 | 0;
    v14 ^= v3;
    v14 = v14 << (32 - 16) | v14 >>> 16;
    v9 = v9 + v14 | 0;
    v4 ^= v9;
    v4 = v4 << (32 - 12) | v4 >>> 12;
    v2 = v2 + m14 | 0;
    v2 = v2 + v7 | 0;
    v13 ^= v2;
    v13 = v13 << (32 - 8) | v13 >>> 8;
    v8 = v8 + v13 | 0;
    v7 ^= v8;
    v7 = v7 << (32 - 7) | v7 >>> 7;
    v3 = v3 + m9 | 0;
    v3 = v3 + v4 | 0;
    v14 ^= v3;
    v14 = v14 << (32 - 8) | v14 >>> 8;
    v9 = v9 + v14 | 0;
    v4 ^= v9;
    v4 = v4 << (32 - 7) | v4 >>> 7;
    v1 = v1 + m5 | 0;
    v1 = v1 + v6 | 0;
    v12 ^= v1;
    v12 = v12 << (32 - 8) | v12 >>> 8;
    v11 = v11 + v12 | 0;
    v6 ^= v11;
    v6 = v6 << (32 - 7) | v6 >>> 7;
    v0 = v0 + m13 | 0;
    v0 = v0 + v5 | 0;
    v15 ^= v0;
    v15 = v15 << (32 - 8) | v15 >>> 8;
    v10 = v10 + v15 | 0;
    v5 ^= v10;
    v5 = v5 << (32 - 7) | v5 >>> 7;

    // Round 7.
    v0 = v0 + m12 | 0;
    v0 = v0 + v4 | 0;
    v12 ^= v0;
    v12 = v12 << (32 - 16) | v12 >>> 16;
    v8 = v8 + v12 | 0;
    v4 ^= v8;
    v4 = v4 << (32 - 12) | v4 >>> 12;
    v1 = v1 + m1 | 0;
    v1 = v1 + v5 | 0;
    v13 ^= v1;
    v13 = v13 << (32 - 16) | v13 >>> 16;
    v9 = v9 + v13 | 0;
    v5 ^= v9;
    v5 = v5 << (32 - 12) | v5 >>> 12;
    v2 = v2 + m14 | 0;
    v2 = v2 + v6 | 0;
    v14 ^= v2;
    v14 = v14 << (32 - 16) | v14 >>> 16;
    v10 = v10 + v14 | 0;
    v6 ^= v10;
    v6 = v6 << (32 - 12) | v6 >>> 12;
    v3 = v3 + m4 | 0;
    v3 = v3 + v7 | 0;
    v15 ^= v3;
    v15 = v15 << (32 - 16) | v15 >>> 16;
    v11 = v11 + v15 | 0;
    v7 ^= v11;
    v7 = v7 << (32 - 12) | v7 >>> 12;
    v2 = v2 + m13 | 0;
    v2 = v2 + v6 | 0;
    v14 ^= v2;
    v14 = v14 << (32 - 8) | v14 >>> 8;
    v10 = v10 + v14 | 0;
    v6 ^= v10;
    v6 = v6 << (32 - 7) | v6 >>> 7;
    v3 = v3 + m10 | 0;
    v3 = v3 + v7 | 0;
    v15 ^= v3;
    v15 = v15 << (32 - 8) | v15 >>> 8;
    v11 = v11 + v15 | 0;
    v7 ^= v11;
    v7 = v7 << (32 - 7) | v7 >>> 7;
    v1 = v1 + m15 | 0;
    v1 = v1 + v5 | 0;
    v13 ^= v1;
    v13 = v13 << (32 - 8) | v13 >>> 8;
    v9 = v9 + v13 | 0;
    v5 ^= v9;
    v5 = v5 << (32 - 7) | v5 >>> 7;
    v0 = v0 + m5 | 0;
    v0 = v0 + v4 | 0;
    v12 ^= v0;
    v12 = v12 << (32 - 8) | v12 >>> 8;
    v8 = v8 + v12 | 0;
    v4 ^= v8;
    v4 = v4 << (32 - 7) | v4 >>> 7;
    v0 = v0 + m0 | 0;
    v0 = v0 + v5 | 0;
    v15 ^= v0;
    v15 = v15 << (32 - 16) | v15 >>> 16;
    v10 = v10 + v15 | 0;
    v5 ^= v10;
    v5 = v5 << (32 - 12) | v5 >>> 12;
    v1 = v1 + m6 | 0;
    v1 = v1 + v6 | 0;
    v12 ^= v1;
    v12 = v12 << (32 - 16) | v12 >>> 16;
    v11 = v11 + v12 | 0;
    v6 ^= v11;
    v6 = v6 << (32 - 12) | v6 >>> 12;
    v2 = v2 + m9 | 0;
    v2 = v2 + v7 | 0;
    v13 ^= v2;
    v13 = v13 << (32 - 16) | v13 >>> 16;
    v8 = v8 + v13 | 0;
    v7 ^= v8;
    v7 = v7 << (32 - 12) | v7 >>> 12;
    v3 = v3 + m8 | 0;
    v3 = v3 + v4 | 0;
    v14 ^= v3;
    v14 = v14 << (32 - 16) | v14 >>> 16;
    v9 = v9 + v14 | 0;
    v4 ^= v9;
    v4 = v4 << (32 - 12) | v4 >>> 12;
    v2 = v2 + m2 | 0;
    v2 = v2 + v7 | 0;
    v13 ^= v2;
    v13 = v13 << (32 - 8) | v13 >>> 8;
    v8 = v8 + v13 | 0;
    v7 ^= v8;
    v7 = v7 << (32 - 7) | v7 >>> 7;
    v3 = v3 + m11 | 0;
    v3 = v3 + v4 | 0;
    v14 ^= v3;
    v14 = v14 << (32 - 8) | v14 >>> 8;
    v9 = v9 + v14 | 0;
    v4 ^= v9;
    v4 = v4 << (32 - 7) | v4 >>> 7;
    v1 = v1 + m3 | 0;
    v1 = v1 + v6 | 0;
    v12 ^= v1;
    v12 = v12 << (32 - 8) | v12 >>> 8;
    v11 = v11 + v12 | 0;
    v6 ^= v11;
    v6 = v6 << (32 - 7) | v6 >>> 7;
    v0 = v0 + m7 | 0;
    v0 = v0 + v5 | 0;
    v15 ^= v0;
    v15 = v15 << (32 - 8) | v15 >>> 8;
    v10 = v10 + v15 | 0;
    v5 ^= v10;
    v5 = v5 << (32 - 7) | v5 >>> 7;

    // Round 8.
    v0 = v0 + m13 | 0;
    v0 = v0 + v4 | 0;
    v12 ^= v0;
    v12 = v12 << (32 - 16) | v12 >>> 16;
    v8 = v8 + v12 | 0;
    v4 ^= v8;
    v4 = v4 << (32 - 12) | v4 >>> 12;
    v1 = v1 + m7 | 0;
    v1 = v1 + v5 | 0;
    v13 ^= v1;
    v13 = v13 << (32 - 16) | v13 >>> 16;
    v9 = v9 + v13 | 0;
    v5 ^= v9;
    v5 = v5 << (32 - 12) | v5 >>> 12;
    v2 = v2 + m12 | 0;
    v2 = v2 + v6 | 0;
    v14 ^= v2;
    v14 = v14 << (32 - 16) | v14 >>> 16;
    v10 = v10 + v14 | 0;
    v6 ^= v10;
    v6 = v6 << (32 - 12) | v6 >>> 12;
    v3 = v3 + m3 | 0;
    v3 = v3 + v7 | 0;
    v15 ^= v3;
    v15 = v15 << (32 - 16) | v15 >>> 16;
    v11 = v11 + v15 | 0;
    v7 ^= v11;
    v7 = v7 << (32 - 12) | v7 >>> 12;
    v2 = v2 + m1 | 0;
    v2 = v2 + v6 | 0;
    v14 ^= v2;
    v14 = v14 << (32 - 8) | v14 >>> 8;
    v10 = v10 + v14 | 0;
    v6 ^= v10;
    v6 = v6 << (32 - 7) | v6 >>> 7;
    v3 = v3 + m9 | 0;
    v3 = v3 + v7 | 0;
    v15 ^= v3;
    v15 = v15 << (32 - 8) | v15 >>> 8;
    v11 = v11 + v15 | 0;
    v7 ^= v11;
    v7 = v7 << (32 - 7) | v7 >>> 7;
    v1 = v1 + m14 | 0;
    v1 = v1 + v5 | 0;
    v13 ^= v1;
    v13 = v13 << (32 - 8) | v13 >>> 8;
    v9 = v9 + v13 | 0;
    v5 ^= v9;
    v5 = v5 << (32 - 7) | v5 >>> 7;
    v0 = v0 + m11 | 0;
    v0 = v0 + v4 | 0;
    v12 ^= v0;
    v12 = v12 << (32 - 8) | v12 >>> 8;
    v8 = v8 + v12 | 0;
    v4 ^= v8;
    v4 = v4 << (32 - 7) | v4 >>> 7;
    v0 = v0 + m5 | 0;
    v0 = v0 + v5 | 0;
    v15 ^= v0;
    v15 = v15 << (32 - 16) | v15 >>> 16;
    v10 = v10 + v15 | 0;
    v5 ^= v10;
    v5 = v5 << (32 - 12) | v5 >>> 12;
    v1 = v1 + m15 | 0;
    v1 = v1 + v6 | 0;
    v12 ^= v1;
    v12 = v12 << (32 - 16) | v12 >>> 16;
    v11 = v11 + v12 | 0;
    v6 ^= v11;
    v6 = v6 << (32 - 12) | v6 >>> 12;
    v2 = v2 + m8 | 0;
    v2 = v2 + v7 | 0;
    v13 ^= v2;
    v13 = v13 << (32 - 16) | v13 >>> 16;
    v8 = v8 + v13 | 0;
    v7 ^= v8;
    v7 = v7 << (32 - 12) | v7 >>> 12;
    v3 = v3 + m2 | 0;
    v3 = v3 + v4 | 0;
    v14 ^= v3;
    v14 = v14 << (32 - 16) | v14 >>> 16;
    v9 = v9 + v14 | 0;
    v4 ^= v9;
    v4 = v4 << (32 - 12) | v4 >>> 12;
    v2 = v2 + m6 | 0;
    v2 = v2 + v7 | 0;
    v13 ^= v2;
    v13 = v13 << (32 - 8) | v13 >>> 8;
    v8 = v8 + v13 | 0;
    v7 ^= v8;
    v7 = v7 << (32 - 7) | v7 >>> 7;
    v3 = v3 + m10 | 0;
    v3 = v3 + v4 | 0;
    v14 ^= v3;
    v14 = v14 << (32 - 8) | v14 >>> 8;
    v9 = v9 + v14 | 0;
    v4 ^= v9;
    v4 = v4 << (32 - 7) | v4 >>> 7;
    v1 = v1 + m4 | 0;
    v1 = v1 + v6 | 0;
    v12 ^= v1;
    v12 = v12 << (32 - 8) | v12 >>> 8;
    v11 = v11 + v12 | 0;
    v6 ^= v11;
    v6 = v6 << (32 - 7) | v6 >>> 7;
    v0 = v0 + m0 | 0;
    v0 = v0 + v5 | 0;
    v15 ^= v0;
    v15 = v15 << (32 - 8) | v15 >>> 8;
    v10 = v10 + v15 | 0;
    v5 ^= v10;
    v5 = v5 << (32 - 7) | v5 >>> 7;

    // Round 9.
    v0 = v0 + m6 | 0;
    v0 = v0 + v4 | 0;
    v12 ^= v0;
    v12 = v12 << (32 - 16) | v12 >>> 16;
    v8 = v8 + v12 | 0;
    v4 ^= v8;
    v4 = v4 << (32 - 12) | v4 >>> 12;
    v1 = v1 + m14 | 0;
    v1 = v1 + v5 | 0;
    v13 ^= v1;
    v13 = v13 << (32 - 16) | v13 >>> 16;
    v9 = v9 + v13 | 0;
    v5 ^= v9;
    v5 = v5 << (32 - 12) | v5 >>> 12;
    v2 = v2 + m11 | 0;
    v2 = v2 + v6 | 0;
    v14 ^= v2;
    v14 = v14 << (32 - 16) | v14 >>> 16;
    v10 = v10 + v14 | 0;
    v6 ^= v10;
    v6 = v6 << (32 - 12) | v6 >>> 12;
    v3 = v3 + m0 | 0;
    v3 = v3 + v7 | 0;
    v15 ^= v3;
    v15 = v15 << (32 - 16) | v15 >>> 16;
    v11 = v11 + v15 | 0;
    v7 ^= v11;
    v7 = v7 << (32 - 12) | v7 >>> 12;
    v2 = v2 + m3 | 0;
    v2 = v2 + v6 | 0;
    v14 ^= v2;
    v14 = v14 << (32 - 8) | v14 >>> 8;
    v10 = v10 + v14 | 0;
    v6 ^= v10;
    v6 = v6 << (32 - 7) | v6 >>> 7;
    v3 = v3 + m8 | 0;
    v3 = v3 + v7 | 0;
    v15 ^= v3;
    v15 = v15 << (32 - 8) | v15 >>> 8;
    v11 = v11 + v15 | 0;
    v7 ^= v11;
    v7 = v7 << (32 - 7) | v7 >>> 7;
    v1 = v1 + m9 | 0;
    v1 = v1 + v5 | 0;
    v13 ^= v1;
    v13 = v13 << (32 - 8) | v13 >>> 8;
    v9 = v9 + v13 | 0;
    v5 ^= v9;
    v5 = v5 << (32 - 7) | v5 >>> 7;
    v0 = v0 + m15 | 0;
    v0 = v0 + v4 | 0;
    v12 ^= v0;
    v12 = v12 << (32 - 8) | v12 >>> 8;
    v8 = v8 + v12 | 0;
    v4 ^= v8;
    v4 = v4 << (32 - 7) | v4 >>> 7;
    v0 = v0 + m12 | 0;
    v0 = v0 + v5 | 0;
    v15 ^= v0;
    v15 = v15 << (32 - 16) | v15 >>> 16;
    v10 = v10 + v15 | 0;
    v5 ^= v10;
    v5 = v5 << (32 - 12) | v5 >>> 12;
    v1 = v1 + m13 | 0;
    v1 = v1 + v6 | 0;
    v12 ^= v1;
    v12 = v12 << (32 - 16) | v12 >>> 16;
    v11 = v11 + v12 | 0;
    v6 ^= v11;
    v6 = v6 << (32 - 12) | v6 >>> 12;
    v2 = v2 + m1 | 0;
    v2 = v2 + v7 | 0;
    v13 ^= v2;
    v13 = v13 << (32 - 16) | v13 >>> 16;
    v8 = v8 + v13 | 0;
    v7 ^= v8;
    v7 = v7 << (32 - 12) | v7 >>> 12;
    v3 = v3 + m10 | 0;
    v3 = v3 + v4 | 0;
    v14 ^= v3;
    v14 = v14 << (32 - 16) | v14 >>> 16;
    v9 = v9 + v14 | 0;
    v4 ^= v9;
    v4 = v4 << (32 - 12) | v4 >>> 12;
    v2 = v2 + m4 | 0;
    v2 = v2 + v7 | 0;
    v13 ^= v2;
    v13 = v13 << (32 - 8) | v13 >>> 8;
    v8 = v8 + v13 | 0;
    v7 ^= v8;
    v7 = v7 << (32 - 7) | v7 >>> 7;
    v3 = v3 + m5 | 0;
    v3 = v3 + v4 | 0;
    v14 ^= v3;
    v14 = v14 << (32 - 8) | v14 >>> 8;
    v9 = v9 + v14 | 0;
    v4 ^= v9;
    v4 = v4 << (32 - 7) | v4 >>> 7;
    v1 = v1 + m7 | 0;
    v1 = v1 + v6 | 0;
    v12 ^= v1;
    v12 = v12 << (32 - 8) | v12 >>> 8;
    v11 = v11 + v12 | 0;
    v6 ^= v11;
    v6 = v6 << (32 - 7) | v6 >>> 7;
    v0 = v0 + m2 | 0;
    v0 = v0 + v5 | 0;
    v15 ^= v0;
    v15 = v15 << (32 - 8) | v15 >>> 8;
    v10 = v10 + v15 | 0;
    v5 ^= v10;
    v5 = v5 << (32 - 7) | v5 >>> 7;

    // Round 10.
    v0 = v0 + m10 | 0;
    v0 = v0 + v4 | 0;
    v12 ^= v0;
    v12 = v12 << (32 - 16) | v12 >>> 16;
    v8 = v8 + v12 | 0;
    v4 ^= v8;
    v4 = v4 << (32 - 12) | v4 >>> 12;
    v1 = v1 + m8 | 0;
    v1 = v1 + v5 | 0;
    v13 ^= v1;
    v13 = v13 << (32 - 16) | v13 >>> 16;
    v9 = v9 + v13 | 0;
    v5 ^= v9;
    v5 = v5 << (32 - 12) | v5 >>> 12;
    v2 = v2 + m7 | 0;
    v2 = v2 + v6 | 0;
    v14 ^= v2;
    v14 = v14 << (32 - 16) | v14 >>> 16;
    v10 = v10 + v14 | 0;
    v6 ^= v10;
    v6 = v6 << (32 - 12) | v6 >>> 12;
    v3 = v3 + m1 | 0;
    v3 = v3 + v7 | 0;
    v15 ^= v3;
    v15 = v15 << (32 - 16) | v15 >>> 16;
    v11 = v11 + v15 | 0;
    v7 ^= v11;
    v7 = v7 << (32 - 12) | v7 >>> 12;
    v2 = v2 + m6 | 0;
    v2 = v2 + v6 | 0;
    v14 ^= v2;
    v14 = v14 << (32 - 8) | v14 >>> 8;
    v10 = v10 + v14 | 0;
    v6 ^= v10;
    v6 = v6 << (32 - 7) | v6 >>> 7;
    v3 = v3 + m5 | 0;
    v3 = v3 + v7 | 0;
    v15 ^= v3;
    v15 = v15 << (32 - 8) | v15 >>> 8;
    v11 = v11 + v15 | 0;
    v7 ^= v11;
    v7 = v7 << (32 - 7) | v7 >>> 7;
    v1 = v1 + m4 | 0;
    v1 = v1 + v5 | 0;
    v13 ^= v1;
    v13 = v13 << (32 - 8) | v13 >>> 8;
    v9 = v9 + v13 | 0;
    v5 ^= v9;
    v5 = v5 << (32 - 7) | v5 >>> 7;
    v0 = v0 + m2 | 0;
    v0 = v0 + v4 | 0;
    v12 ^= v0;
    v12 = v12 << (32 - 8) | v12 >>> 8;
    v8 = v8 + v12 | 0;
    v4 ^= v8;
    v4 = v4 << (32 - 7) | v4 >>> 7;
    v0 = v0 + m15 | 0;
    v0 = v0 + v5 | 0;
    v15 ^= v0;
    v15 = v15 << (32 - 16) | v15 >>> 16;
    v10 = v10 + v15 | 0;
    v5 ^= v10;
    v5 = v5 << (32 - 12) | v5 >>> 12;
    v1 = v1 + m9 | 0;
    v1 = v1 + v6 | 0;
    v12 ^= v1;
    v12 = v12 << (32 - 16) | v12 >>> 16;
    v11 = v11 + v12 | 0;
    v6 ^= v11;
    v6 = v6 << (32 - 12) | v6 >>> 12;
    v2 = v2 + m3 | 0;
    v2 = v2 + v7 | 0;
    v13 ^= v2;
    v13 = v13 << (32 - 16) | v13 >>> 16;
    v8 = v8 + v13 | 0;
    v7 ^= v8;
    v7 = v7 << (32 - 12) | v7 >>> 12;
    v3 = v3 + m13 | 0;
    v3 = v3 + v4 | 0;
    v14 ^= v3;
    v14 = v14 << (32 - 16) | v14 >>> 16;
    v9 = v9 + v14 | 0;
    v4 ^= v9;
    v4 = v4 << (32 - 12) | v4 >>> 12;
    v2 = v2 + m12 | 0;
    v2 = v2 + v7 | 0;
    v13 ^= v2;
    v13 = v13 << (32 - 8) | v13 >>> 8;
    v8 = v8 + v13 | 0;
    v7 ^= v8;
    v7 = v7 << (32 - 7) | v7 >>> 7;
    v3 = v3 + m0 | 0;
    v3 = v3 + v4 | 0;
    v14 ^= v3;
    v14 = v14 << (32 - 8) | v14 >>> 8;
    v9 = v9 + v14 | 0;
    v4 ^= v9;
    v4 = v4 << (32 - 7) | v4 >>> 7;
    v1 = v1 + m14 | 0;
    v1 = v1 + v6 | 0;
    v12 ^= v1;
    v12 = v12 << (32 - 8) | v12 >>> 8;
    v11 = v11 + v12 | 0;
    v6 ^= v11;
    v6 = v6 << (32 - 7) | v6 >>> 7;
    v0 = v0 + m11 | 0;
    v0 = v0 + v5 | 0;
    v15 ^= v0;
    v15 = v15 << (32 - 8) | v15 >>> 8;
    v10 = v10 + v15 | 0;
    v5 ^= v10;
    v5 = v5 << (32 - 7) | v5 >>> 7;

    this.h[0] ^= v0 ^ v8;
    this.h[1] ^= v1 ^ v9;
    this.h[2] ^= v2 ^ v10;
    this.h[3] ^= v3 ^ v11;
    this.h[4] ^= v4 ^ v12;
    this.h[5] ^= v5 ^ v13;
    this.h[6] ^= v6 ^ v14;
    this.h[7] ^= v7 ^ v15;
  };

  BLAKE2s.prototype.update = function(p, offset, length) {
    if (typeof p === 'string')
      throw new TypeError('update() accepts Uint8Array or an Array of bytes');
    if (this.isFinished)
      throw new Error('update() after calling digest()');

    if (typeof offset === 'undefined') { offset = 0; }
    if (typeof length === 'undefined') { length = p.length - offset; }

    if (length === 0) return this;


    var i, left = 64 - this.nx;

    // Finish buffer.
    if (length > left) {
      for (i = 0; i < left; i++) {
        this.x[this.nx + i] = p[offset + i];
      }
      this.processBlock(64);
      offset += left;
      length -= left;
      this.nx = 0;
    }

    // Process message blocks.
    while (length > 64) {
      for (i = 0; i < 64; i++) {
        this.x[i] = p[offset + i];
      }
      this.processBlock(64);
      offset += 64;
      length -= 64;
      this.nx = 0;
    }

    // Copy leftovers to buffer.
    for (i = 0; i < length; i++) {
      this.x[this.nx + i] = p[offset + i];
    }
    this.nx += length;

    return this;
  };

  BLAKE2s.prototype.digest = function() {
    var i;

    if (this.isFinished) return this.result;

    for (i = this.nx; i < 64; i++) this.x[i] = 0;

    // Set last block flag.
    this.f0 = 0xffffffff;

    //TODO in tree mode, set f1 to 0xffffffff.
    this.processBlock(this.nx);

    var d = new Uint8Array(32);
    for (i = 0; i < 8; i++) {
      var h = this.h[i];
      d[i * 4 + 0] = (h >>> 0) & 0xff;
      d[i * 4 + 1] = (h >>> 8) & 0xff;
      d[i * 4 + 2] = (h >>> 16) & 0xff;
      d[i * 4 + 3] = (h >>> 24) & 0xff;
    }
    this.result = new Uint8Array(d.subarray(0, this.digestLength));
    this.isFinished = true;
    return this.result;
  };

  BLAKE2s.prototype.hexDigest = function() {
    var hex = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'];
    var out = [];
    var d = this.digest();
    for (var i = 0; i < d.length; i++) {
      out.push(hex[(d[i] >> 4) & 0xf]);
      out.push(hex[d[i] & 0xf]);
    }
    return out.join('');
  };

  BLAKE2s.digestLength = MAX_DIGEST_LENGTH;
  BLAKE2s.blockLength = BLOCK_LENGTH;
  BLAKE2s.keyLength = MAX_KEY_LENGTH;
  BLAKE2s.saltLength = SALT_LENGTH;
  BLAKE2s.personalizationLength = PERSONALIZATION_LENGTH;

  return BLAKE2s;

})();

if (typeof module !== 'undefined' && module.exports) module.exports = BLAKE2s;
