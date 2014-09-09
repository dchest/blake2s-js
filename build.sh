#!/bin/sh

tsc blake2s.ts && \
echo "\nif (typeof module !== 'undefined' && module.exports) module.exports = BLAKE2s;" >> blake2s.js && \
node test.js
