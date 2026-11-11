const { createRequestHandler } = require('expo-server/adapter/vercel');

declare const __dirname: string;

module.exports = createRequestHandler({
  build: require('path').join(__dirname, '../dist/server'),
});
