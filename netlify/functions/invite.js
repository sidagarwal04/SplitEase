import { adminClient, authUser, json } from './_shared.js';

// POST /api/invite
// Body: { email, groupId, groupName }
// - If a profile with this email exists, the user is added straight to the group.
// - Otherwise, an invite email is sent via Resend.
export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  try {
    const { user, admin } = await authUser(event);
    const { email, groupId, groupName } = JSON.parse(event.body || '{}');
    if (!email || !groupId) return json(400, { error: 'email and groupId required' });

    // Caller must be a member of the target group
    const { data: caller } = await admin
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .maybeSingle();
    if (!caller) return json(403, { error: 'Not a member' });

    const normalized = email.trim().toLowerCase();

    const { data: existingProfile } = await admin
      .from('profiles')
      .select('id, full_name, email, avatar_url')
      .ilike('email', normalized)
      .maybeSingle();

    if (existingProfile) {
      // Already a member?
      const { data: existingMember } = await admin
        .from('group_members')
        .select('id')
        .eq('group_id', groupId)
        .eq('user_id', existingProfile.id)
        .maybeSingle();
      if (existingMember) {
        return json(200, { added: true, alreadyMember: true, profile: existingProfile });
      }

      const { error } = await admin.from('group_members').insert({
        group_id: groupId,
        user_id: existingProfile.id,
        role: 'member',
      });
      if (error) throw error;

      // Best-effort notification
      await admin.from('notifications').insert({
        user_id: existingProfile.id,
        type: 'group_invite',
        message: `You were added to "${groupName ?? 'a group'}"`,
        related_group_id: groupId,
      });

      return json(200, { added: true, profile: existingProfile });
    }

    // Not on OweNow yet — record a pending invite so the new-user trigger
    // auto-joins them when they sign up, then send the invite email.
    const { error: pendingErr } = await admin
      .from('pending_invites')
      .upsert(
        { email: normalized, group_id: groupId, invited_by: user.id },
        { onConflict: 'email,group_id' }
      );
    if (pendingErr) throw pendingErr;

    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM_EMAIL || 'OweNow <onboarding@resend.dev>';
    const appUrl = process.env.VITE_APP_URL || 'https://owenow.app';

    if (!apiKey) {
      return json(200, {
        added: false,
        pending: true,
        emailSent: false,
        warning: 'RESEND_API_KEY not configured; invite recorded but email not sent.',
      });
    }

    const html = inviteEmail({
      groupName,
      inviterName: user.user_metadata?.full_name || user.email,
      inviteeEmail: normalized,
      appUrl,
    });

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from,
        to: [normalized],
        subject: `You've been invited to ${groupName ?? 'a group'} on OweNow`,
        html,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Resend error: ${text}`);
    }

    return json(200, { added: false, pending: true, emailSent: true });
  } catch (err) {
    return json(err.status || 500, { error: err.message });
  }
};

function inviteEmail({ groupName, inviterName, inviteeEmail, appUrl }) {
  return `<!doctype html>
<html><body style="background:#0A0F1E;color:#E6EAF2;font-family:Inter,system-ui,sans-serif;margin:0;padding:32px;">
  <div style="max-width:480px;margin:auto;background:#111A33;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:32px;">
    <div style="font-size:28px;font-weight:800;background:linear-gradient(135deg,#00D4AA,#6366F1);-webkit-background-clip:text;color:transparent;">OweNow</div>
    <h2 style="margin-top:24px;">You've been invited!</h2>
    <p style="color:#8A93A6;line-height:1.5;">
      <strong style="color:#fff;">${escapeHtml(inviterName)}</strong> invited you to join the group
      <strong style="color:#fff;">"${escapeHtml(groupName ?? 'a group')}"</strong> on OweNow — the simplest way to split expenses with friends.
    </p>
    <a href="${appUrl}" style="display:inline-block;margin-top:24px;background:#00D4AA;color:#0A0F1E;padding:12px 24px;border-radius:12px;text-decoration:none;font-weight:600;">
      Join group
    </a>
    <p style="color:#8A93A6;line-height:1.5;margin-top:24px;font-size:14px;">
      Sign up with <strong style="color:#fff;">${escapeHtml(inviteeEmail ?? 'this email')}</strong> and you'll be added to the group automatically. Using a different email? Ask ${escapeHtml(inviterName)} to invite that one instead.
    </p>
    <p style="color:#5C667D;font-size:12px;margin-top:32px;">
      If you didn't expect this, you can safely ignore this email.
    </p>
  </div>
</body></html>`;
}

function escapeHtml(s = '') {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
