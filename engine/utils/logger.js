const pino = require('pino');

const isProd = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';
const level = process.env.LOG_LEVEL || (isProd ? 'info' : 'debug');

const logger = pino({
  level,
  base: {
    service: process.env.SERVICE_NAME || 'jarvis-api'
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level(label) {
      return { level: label };
    }
  },
  ...(!isProd && !isTest
    ? {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname'
          }
        }
      }
    : {})
});

module.exports = logger;
