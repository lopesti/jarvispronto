/**
 * Hub in-process para notificações em tempo real (SSE).
 * Cada tenant (companyId) tem um set de respostas HTTP abertas.
 */
const { EventEmitter } = require('events');
const logger = require('../utils/logger');

const bus = new EventEmitter();
bus.setMaxListeners(200);

/** @type {Map<number, Set<import('express').Response>>} */
const streams = new Map();

function addStream(companyId, res) {
  const id = Number(companyId);
  if (!streams.has(id)) streams.set(id, new Set());
  streams.get(id).add(res);
}

function removeStream(companyId, res) {
  const id = Number(companyId);
  const set = streams.get(id);
  if (!set) return;
  set.delete(res);
  if (set.size === 0) streams.delete(id);
}

/**
 * Publica notificação para todos os SSE do tenant + emit genérico.
 * @param {number} companyId
 * @param {object} notification — row ou payload { id, type, title, body, ... }
 */
function publish(companyId, notification) {
  const id = Number(companyId);
  if (!id || !notification) return;

  const payload = {
    ...notification,
    company_id: notification.company_id || id,
  };

  bus.emit('notification', payload);
  bus.emit(`company:${id}`, payload);

  const set = streams.get(id);
  if (!set || set.size === 0) return;

  const data = `event: notification\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const res of set) {
    try {
      res.write(data);
    } catch (err) {
      logger.warn(`[notif-hub] write fail: ${err.message}`);
      set.delete(res);
    }
  }
}

function streamCount(companyId) {
  return streams.get(Number(companyId))?.size || 0;
}

module.exports = {
  bus,
  addStream,
  removeStream,
  publish,
  streamCount,
};
