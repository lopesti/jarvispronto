/**
 * Rotas de billing / planos / uso + Asaas.
 */
const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const planService = require('../services/planService');
const usageService = require('../services/usageService');
const asaas = require('../services/asaasService');
const { query } = require('../models/database');
const logger = require('../utils/logger');

router.get('/plans', async (_req, res) => {
  try {
    const plans = await planService.listPlans({ publicOnly: true });
    res.json({ plans, asaasEnabled: asaas.enabled() });
  } catch (err) {
    logger.error(`[billing] listPlans: ${err.message}`);
    res.status(500).json({ error: 'Erro ao listar planos' });
  }
});

router.get('/billing/subscription', auth, async (req, res) => {
  try {
    const companyId = req.user.companyId || req.user.company_id;
    const snapshot = await usageService.getUsageSnapshot(companyId);
    res.json({ ...snapshot, asaasEnabled: asaas.enabled() });
  } catch (err) {
    logger.error(`[billing] subscription: ${err.message}`);
    res.status(500).json({ error: 'Erro ao buscar assinatura' });
  }
});

router.get('/billing/usage', auth, async (req, res) => {
  try {
    const companyId = req.user.companyId || req.user.company_id;
    const snapshot = await usageService.getUsageSnapshot(companyId);
    res.json({
      usage: snapshot.usage,
      limits: snapshot.limits,
      checks: snapshot.checks,
      planCode: snapshot.subscription?.planCode,
      status: snapshot.subscription?.status,
    });
  } catch (err) {
    logger.error(`[billing] usage: ${err.message}`);
    res.status(500).json({ error: 'Erro ao buscar uso' });
  }
});

/**
 * POST /api/billing/subscribe
 * Body: { planCode, billingCycle?, useCheckout? }
 * - Sem ASAAS_API_KEY: ativa plano localmente (dev)
 * - Com Asaas: cria customer + subscription e devolve invoiceUrl / checkout
 */
router.post('/billing/subscribe', auth, async (req, res) => {
  try {
    const companyId = req.user.companyId || req.user.company_id;
    const {
      planCode,
      billingCycle = 'monthly',
      useCheckout = false,
      cpfCnpj,
    } = req.body || {};

    if (!planCode || !['prata', 'gold', 'diamante'].includes(planCode)) {
      return res.status(400).json({ error: 'planCode inválido' });
    }
    if (!['monthly', 'yearly'].includes(billingCycle)) {
      return res.status(400).json({ error: 'billingCycle inválido' });
    }

    const plan = await planService.getPlanByCode(planCode);
    if (!plan) return res.status(404).json({ error: 'Plano não encontrado' });

    const price =
      billingCycle === 'yearly'
        ? Number(plan.price_yearly || plan.price_monthly * 10)
        : Number(plan.price_monthly);

    // ── Asaas ligado ──────────────────────────────────────
    if (asaas.enabled()) {
      const companyRow = await query(
        `SELECT c.id, c.name, u.email, u.name AS user_name
         FROM companies c
         LEFT JOIN users u ON u.company_id = c.id
         WHERE c.id = $1
         ORDER BY u.id ASC
         LIMIT 1`,
        [companyId]
      );
      const co = companyRow.rows[0] || { id: companyId, name: `Empresa ${companyId}` };

      const customer = await asaas.ensureCustomer({
        companyId,
        name: co.name || co.user_name,
        email: co.email || req.user?.email,
        cpfCnpj,
      });

      let checkoutUrl = null;
      let externalId = null;
      let invoiceUrl = null;

      if (useCheckout) {
        const checkout = await asaas.createCheckout({
          value: price,
          name: `Jarvis ${plan.name}`,
          description: `Plano ${plan.name} (${billingCycle})`,
          cycle: billingCycle,
          externalReference: `company:${companyId}:plan:${planCode}`,
          recurrent: true,
        });
        externalId = checkout.id;
        checkoutUrl =
          checkout.url ||
          checkout.checkoutUrl ||
          checkout.link ||
          null;
      } else {
        const sub = await asaas.createSubscription({
          customerId: customer.id,
          value: price,
          cycle: billingCycle,
          description: `Jarvis ${plan.name}`,
          externalReference: `company:${companyId}:plan:${planCode}`,
        });
        externalId = sub.id;
        invoiceUrl = sub.invoiceUrl || sub.paymentLink || null;
      }

      // Mantém status past_due até webhook confirmar pagamento
      await query(
        `UPDATE subscriptions
         SET status = 'canceled', cancel_at_period_end = false, updated_at = NOW()
         WHERE company_id = $1 AND status IN ('trial', 'active', 'past_due')`,
        [companyId]
      );

      const periodStart = new Date();
      const periodEnd = new Date(periodStart);
      if (billingCycle === 'yearly') periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      else periodEnd.setMonth(periodEnd.getMonth() + 1);

      const { rows } = await query(
        `INSERT INTO subscriptions (
            company_id, plan_id, status, billing_cycle,
            current_period_start, current_period_end,
            external_id, external_customer_id
         ) VALUES ($1, $2, 'past_due', $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          companyId,
          plan.id,
          billingCycle,
          periodStart,
          periodEnd,
          externalId,
          customer.id,
        ]
      );

      await query(
        `UPDATE companies SET plan_code = $2, subscription_status = 'past_due' WHERE id = $1`,
        [companyId, planCode]
      );

      await query(
        `INSERT INTO billing_events (company_id, type, payload)
         VALUES ($1, 'asaas.subscription.created', $2)`,
        [
          companyId,
          JSON.stringify({
            planCode,
            billingCycle,
            externalId,
            customerId: customer.id,
            subscriptionId: rows[0].id,
          }),
        ]
      );

      return res.json({
        message: 'Assinatura criada no Asaas — conclua o pagamento',
        status: 'past_due',
        checkoutUrl,
        invoiceUrl,
        externalId,
        customerId: customer.id,
        asaas: true,
      });
    }

    // ── Modo local (sem Asaas) ────────────────────────────
    await query(
      `UPDATE subscriptions
       SET status = 'canceled', cancel_at_period_end = false, updated_at = NOW()
       WHERE company_id = $1 AND status IN ('trial', 'active', 'past_due')`,
      [companyId]
    );

    const periodStart = new Date();
    const periodEnd = new Date(periodStart);
    if (billingCycle === 'yearly') periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    else periodEnd.setMonth(periodEnd.getMonth() + 1);

    const { rows } = await query(
      `INSERT INTO subscriptions (
          company_id, plan_id, status, billing_cycle,
          current_period_start, current_period_end
       ) VALUES ($1, $2, 'active', $3, $4, $5)
       RETURNING *`,
      [companyId, plan.id, billingCycle, periodStart, periodEnd]
    );

    await query(
      `UPDATE companies SET plan_code = $2, subscription_status = 'active' WHERE id = $1`,
      [companyId, planCode]
    );

    await query(
      `INSERT INTO billing_events (company_id, type, payload)
       VALUES ($1, 'subscription.upgraded', $2)`,
      [companyId, JSON.stringify({ planCode, billingCycle, subscriptionId: rows[0].id, local: true })]
    );

    const snapshot = await usageService.getUsageSnapshot(companyId);
    res.json({
      message: `Plano ${plan.name} ativado (modo local — configure ASAAS_API_KEY para cobrança real)`,
      subscription: snapshot.subscription,
      usage: snapshot.usage,
      checks: snapshot.checks,
      checkoutUrl: null,
      asaas: false,
    });
  } catch (err) {
    logger.error(`[billing] subscribe: ${err.message}`);
    res.status(500).json({ error: err.message || 'Erro ao alterar plano' });
  }
});

router.post('/billing/cancel', auth, async (req, res) => {
  try {
    const companyId = req.user.companyId || req.user.company_id;
    const sub = await planService.getCompanySubscription(companyId);
    if (!sub) return res.status(404).json({ error: 'Nenhuma assinatura ativa' });

    await query(
      `UPDATE subscriptions SET cancel_at_period_end = true, updated_at = NOW() WHERE id = $1`,
      [sub.id]
    );

    // Tenta cancelar no Asaas se houver external_id
    if (asaas.enabled() && sub.external_id) {
      try {
        await asaas.asaasFetch(`/subscriptions/${sub.external_id}`, {
          method: 'DELETE',
        });
      } catch (e) {
        logger.warn(`[billing] asaas cancel: ${e.message}`);
      }
    }

    await query(
      `INSERT INTO billing_events (company_id, type, payload)
       VALUES ($1, 'subscription.cancel_requested', $2)`,
      [companyId, JSON.stringify({ subscriptionId: sub.id, externalId: sub.external_id })]
    );

    res.json({
      message: 'Assinatura será cancelada ao fim do período',
      currentPeriodEnd: sub.current_period_end,
    });
  } catch (err) {
    logger.error(`[billing] cancel: ${err.message}`);
    res.status(500).json({ error: 'Erro ao cancelar' });
  }
});

/**
 * POST /api/billing/webhook
 * Asaas envia: { event, payment?, subscription?, ... }
 * Header: asaas-access-token
 */
router.post('/billing/webhook', async (req, res) => {
  try {
    if (!asaas.validateWebhookToken(req)) {
      return res.status(401).json({ error: 'Token Asaas inválido' });
    }

    const event = req.body || {};
    const eventName = event.event || event.type || 'unknown';
    logger.info(`[billing:webhook] ${eventName}`);

    await query(
      `INSERT INTO billing_events (company_id, type, payload)
       VALUES (NULL, $1, $2)`,
      [`asaas.${eventName}`, JSON.stringify(event)]
    );

    const payment = event.payment || event;
    const subscriptionObj = event.subscription;
    const externalRef =
      payment?.externalReference ||
      subscriptionObj?.externalReference ||
      '';

    // externalReference: company:123:plan:gold
    let companyId = null;
    let planCode = null;
    const m = String(externalRef).match(/company:(\d+):plan:(\w+)/);
    if (m) {
      companyId = Number(m[1]);
      planCode = m[2];
    }

    // Também resolve por external_id da subscription
    if (!companyId && (payment?.subscription || subscriptionObj?.id)) {
      const extSub = payment?.subscription || subscriptionObj?.id;
      const found = await query(
        `SELECT company_id, plan_id FROM subscriptions WHERE external_id = $1 ORDER BY id DESC LIMIT 1`,
        [extSub]
      );
      if (found.rows[0]) companyId = found.rows[0].company_id;
    }

    const paidEvents = new Set([
      'PAYMENT_RECEIVED',
      'PAYMENT_CONFIRMED',
      'PAYMENT_RECEIVED_IN_CASH',
      'CHECKOUT_PAID',
      'SUBSCRIPTION_CREATED',
    ]);
    const overdueEvents = new Set(['PAYMENT_OVERDUE', 'PAYMENT_DELETED']);
    const cancelEvents = new Set([
      'SUBSCRIPTION_DELETED',
      'SUBSCRIPTION_INACTIVATED',
      'CHECKOUT_CANCELED',
      'CHECKOUT_EXPIRED',
    ]);

    if (companyId && paidEvents.has(eventName)) {
      if (planCode) {
        const plan = await planService.getPlanByCode(planCode);
        if (plan) {
          await query(
            `UPDATE subscriptions SET plan_id = $2, updated_at = NOW()
             WHERE company_id = $1 AND status IN ('past_due', 'trial', 'active')`,
            [companyId, plan.id]
          );
          await query(
            `UPDATE companies SET plan_code = $2 WHERE id = $1`,
            [companyId, planCode]
          );
        }
      }
      await query(
        `UPDATE subscriptions
         SET status = 'active', updated_at = NOW()
         WHERE company_id = $1 AND status IN ('past_due', 'trial')`,
        [companyId]
      );
      await query(
        `UPDATE companies SET subscription_status = 'active' WHERE id = $1`,
        [companyId]
      );
      await query(
        `INSERT INTO billing_events (company_id, type, payload)
         VALUES ($1, 'subscription.activated', $2)`,
        [companyId, JSON.stringify({ eventName, planCode })]
      );
    }

    if (companyId && overdueEvents.has(eventName)) {
      await query(
        `UPDATE subscriptions SET status = 'past_due', updated_at = NOW()
         WHERE company_id = $1 AND status = 'active'`,
        [companyId]
      );
      await query(
        `UPDATE companies SET subscription_status = 'past_due' WHERE id = $1`,
        [companyId]
      );
    }

    if (companyId && cancelEvents.has(eventName)) {
      await query(
        `UPDATE subscriptions SET status = 'canceled', updated_at = NOW()
         WHERE company_id = $1 AND status IN ('active', 'past_due', 'trial')`,
        [companyId]
      );
      await query(
        `UPDATE companies SET subscription_status = 'canceled' WHERE id = $1`,
        [companyId]
      );
    }

    res.json({ received: true });
  } catch (err) {
    logger.error(`[billing] webhook: ${err.message}`);
    res.status(500).json({ error: 'webhook error' });
  }
});

module.exports = router;
