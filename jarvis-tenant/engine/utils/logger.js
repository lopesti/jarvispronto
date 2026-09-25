const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };

function shouldLog(level) {
  return (LEVELS[level] ?? 99) <= (LEVELS[LOG_LEVEL] ?? 2);
}

function format(level, ...args) {
  const ts = new Date().toISOString();
  return `[${ts}] [${level.toUpperCase()}] ${args.join(' ')}`;
}

const logger = {
  error: (...args) => shouldLog('error') && console.error(format('error', ...args)),
  warn: (...args) => shouldLog('warn') && console.warn(format('warn', ...args)),
  info: (...args) => shouldLog('info') && console.log(format('info', ...args)),
  debug: (...args) => shouldLog('debug') && console.log(format('debug', ...args)),
};

module.exports = logger;
