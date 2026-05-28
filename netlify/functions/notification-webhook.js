import { adminClient, json } from './_shared.js';

// Receives Supabase Database Webhook payloads for new expenses & settlements
// and inserts in-app notifications for every group member except the actor.
//
// Configure in Supabase Dashboard → Database → Webhooks:
//   - Table: expenses → INSERT
//   - Table: settlements → INSERT
// Endpoint: https://<your-site>/.netlify/functions/notification-webhook
// Header: x-webhook-secret: <SUPABASE_WEBHOOK_SECRET>
export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  const secret = process.env.SUPABASE_WEBHOOK_SECRET;
  if (secret) {
    const provided = event.headers?.['x-webhook-secret'] || event.headers?.['X-Webhook-Secret'];
    if (provided !== secret) return json(401, { error: 'invalid secret' });
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { error: 'invalid json' });
  }

  const { table, type, record } = payload;
  if (type !== 'INSERT' || !record) return json(200, { skipped: true });

  const admin = adminClient();

  try {
    if (table === 'expenses') {
      const { data: members } = await admin
        .from('group_members')
        .select('user_id')
        .eq('group_id', record.group_id);
      const { data: group } = await admin
        .from('groups')
        .select('name')
        .eq('id', record.group_id)
        .single();
      const { data: payer } = await admin
        .from('profiles')
        .select('full_name')
        .eq('id', record.paid_by)
        .maybeSingle();

      const rows = (members ?? [])
        .filter((m) => m.user_id !== record.paid_by)
        .map((m) => ({
          user_id: m.user_id,
          type: 'expense_added',
          message: `${payer?.full_name || 'Someone'} added "${record.title}" in ${group?.name || 'a group'}`,
          related_group_id: record.group_id,
        }));
      if (rows.length) await admin.from('notifications').insert(rows);
      return json(200, { inserted: rows.length });
    }

    if (table === 'settlements') {
      const { data: group } = await admin
        .from('groups')
        .select('name')
        .eq('id', record.group_id)
        .single();
      const { data: payer } = await admin
        .from('profiles')
        .select('full_name')
        .eq('id', record.from_user_id)
        .maybeSingle();

      await admin.from('notifications').insert({
        user_id: record.to_user_id,
        type: 'settled_up',
        message: `${payer?.full_name || 'Someone'} paid you in ${group?.name || 'a group'}`,
        related_group_id: record.group_id,
      });
      return json(200, { inserted: 1 });
    }

    return json(200, { skipped: true });
  } catch (err) {
    return json(500, { error: err.message });
  }
};
