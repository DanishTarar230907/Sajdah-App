const { getDefaultConfig } = require('expo/metro-config');

const defaultConfig = getDefaultConfig(__dirname);

// Add support for resolving .cjs (CommonJS) files used extensively by Firebase JS SDK
defaultConfig.resolver.sourceExts.push('cjs');

// Disable unstable package exports which interfere with Firebase's internal component registrations
defaultConfig.resolver.unstable_enablePackageExports = false;

module.exports = defaultConfig;
