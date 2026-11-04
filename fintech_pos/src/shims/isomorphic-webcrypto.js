// Shim for isomorphic-webcrypto in React Native / Expo environment
const getRandomValues = (typedArray) => {
  if (typeof globalThis !== 'undefined' && globalThis.crypto && typeof globalThis.crypto.getRandomValues === 'function') {
    return globalThis.crypto.getRandomValues(typedArray);
  }
  for (let i = 0; i < typedArray.length; i++) {
    typedArray[i] = Math.floor(Math.random() * 256);
  }
  return typedArray;
};

const subtle = (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.subtle) || {};

const webcrypto = {
  ensureSecure: () => {},
  getRandomValues,
  subtle,
};

module.exports = webcrypto;
module.exports.default = webcrypto;
