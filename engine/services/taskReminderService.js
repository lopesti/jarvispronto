/**
 * Cron: detecta tarefas de follow-up atrasadas e cria notificações no painel.
 * Env:
 *   TASK_REMINDER_CRON   — default "*/10 * * * *" (a cada 10 min)
 *   TASK_REMINDER_ENABLED — "0" desliga
 */
const cron = require('node-cron');
const { query } = require('../models/database');
const logger = require('../utils/logger');
const pushService = require('./pushService');
const { publish } = require('./notificationHub');

let started = false;

async function processOverdueTasks() {
  // Tarefas open com due_at no passado e ainda não notificadas nas últimas 24h
  const { rows: tasks } = await query(
    `SELECT t.id, t.company_id, t.phone, t.title, t.due_at, t.assigned_to, t.priority
     FROM lead_tasks t
     WHERE t.status = 'open'
       AND t.due_at IS NOT NULL
       AND t.due_at < NOW()
       AND (
         t.last_overdue_notified_at IS NULL
         OR t.last_overdue_notified_at < NOW() - INTERVAL '24 hours'
       )
     ORDER BY t.due_at ASC
     LIMIT 100`
  );

  if (!tasks.length) {
    logger.info('[task-reminder] nenhuma tarefa atrasada nova');
    return { notified: 0 };
  }

  let notified = 0;
  for (const t of tasks) {
    const phoneLabel = String(t.phone || '')
      .replace('@s.whatsapp.net', '')
      .replace(/^(instagram|facebook):/, '');
    const dueLabel = t.due_at
      ? new Date(t.due_at).toLocaleString('pt-BR')
      : '';

    const notifInsert = await query(
      `INSERT INTO notifications (company_id, user_id, type, title, body, payload)
       VALUES ($1, $2, 'task.overdue', $3, $4, $5)
       RETURNING *`,
      [
        t.company_id,
        t.assigned_to || null,
        'Follow-up atrasado',
        `"${t.title}" · lead ${phoneLabel} · prazo ${dueLabel}`,
        JSON.stringify({
          taskId: t.id,
          phone: t.phone,
          title: t.title,
          due_at: t.due_at,
          priority: t.priority,
        }),
      ]
    );
    if (notifInsert.rows[0]) {
      try {
        publish(t.company_id, notifInsert.rows[0]);
      } catch (_) {}
    }

    await query(
      `UPDATE lead_tasks
       SET last_overdue_notified_at = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [t.id]
    );

    try {
      await pushService.sendPushToCompany(t.company_id, {
        title: 'Follow-up atrasado',
        body: `"${t.title}" · lead ${phoneLabel}`,
        url: '/tasks',
        tag: `task-overdue-${t.id}`,
        type: 'task.overdue',
      });
    } catch (pushErr) {
      logger.warn(`[task-reminder] push: ${pushErr.message}`);
    }

    // evento de auditoria
    try {
      await query(
        `INSERT INTO billing_events (company_id, type, payload)
         VALUES ($1, 'task.overdue', $2)`,
        [
          t.company_id,
          JSON.stringify({ taskId: t.id, phone: t.phone, title: t.title }),
        ]
      );
    } catch (_) {
      /* billing_events pode não existir em deploys antigos */
    }

    notified += 1;
  }

  logger.info(`[task-reminder] ${notified} notificação(ões) de tarefa atrasada`);
  return { notified };
}

function startTaskReminderCron() {
  if (started) return;
  if (process.env.TASK_REMINDER_ENABLED === '0') {
    logger.info('[task-reminder] desabilitado (TASK_REMINDER_ENABLED=0)');
    return;
  }

  const expr = process.env.TASK_REMINDER_CRON || '*/10 * * * *';
  if (!cron.validate(expr)) {
    logger.error(`[task-reminder] cron inválido: ${expr}`);
    return;
  }

  cron.schedule(expr, () => {
    processOverdueTasks().catch((err) =>
      logger.error(`[task-reminder] falha: ${err.message}`)
    );
  });

  started = true;
  logger.info(`[task-reminder] cron ativo (${expr})`);

  // rodada inicial após 15s (não atrasa o boot)
  setTimeout(() => {
    processOverdueTasks().catch((err) =>
      logger.error(`[task-reminder] rodada inicial: ${err.message}`)
    );
  }, 15000);
}

module.exports = { startTaskReminderCron, processOverdueTasks };
