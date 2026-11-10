/**
 * O-04: logger JSON via pino (request-id / companyId quando disponíveis).
 */
const pino = require('pino');

const isProd = process.env.NODE_ENV === 'production';
const level = process.env.LOG_LEVEL || (isProd ? 'info' : 'debug');

const logger = pino({
  level,
  base: { service: process.env.SERVICE_NAME || 'jarvis-api' },
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level(label) {
      return { level: label };
    },
  },
  ...(isProd
    ? {}
    : {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'SYS:standard', ignore: 'pid,hostname' },
        },
      }),
});

/** Compat: logger.info('msg') e logger.info({ reqId }, 'msg') */
function wrap(method) {
  return function (...args) {
    if (args.length === 0) return logger[method]('');
    if (typeof args[0] === 'object' && args[0] !== null && !Array.isArray(args[0])) {
      return logger[method](...args);
    }
    const msg = args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
    return logger[method](msg);
  };
}

module.exports = {
  error: wrap('error'),
  warn: wrap('warn'),
  info: wrap('info'),
  debug: wrap('debug'),
  child: (bindings) => logger.child(bindings),
  raw: logger,
};
