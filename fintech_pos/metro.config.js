const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

config.resolver.extraNodeModules = {
  'react-native': path.resolve(__dirname, 'node_modules/react-native-web'),
  'isomorphic-webcrypto': path.resolve(__dirname, 'src/shims/isomorphic-webcrypto.js'),
};

const defaultResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.startsWith('isomorphic-webcrypto')) {
    return {
      filePath: path.resolve(__dirname, 'src/shims/isomorphic-webcrypto.js'),
      type: 'sourceFile',
    };
  }
  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
