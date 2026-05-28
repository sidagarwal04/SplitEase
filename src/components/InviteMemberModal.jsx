import { useState } from 'react';
import Modal from './Modal.jsx';
import { useInviteMember } from '../hooks/useGroups.js';
import toast from 'react-hot-toast';

export default function InviteMemberModal({ open, onClose, group }) {
  const [email, setEmail] = useState('');
  const invite = useInviteMember(group?.id);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed.includes('@')) {
      toast.error('Enter a valid email');
      return;
    }
    try {
      const result = await invite.mutateAsync({ email: trimmed, groupName: group?.name });
      if (result.added) {
        toast.success(`${result.profile?.full_name || trimmed} added to the group`);
      } else {
        toast.success(`Invite email sent to ${trimmed}`);
      }
      setEmail('');
      onClose?.();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Invite to group">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-text-muted">
          We'll add them straight to the group if they already have a SplitEase account, otherwise we'll send them an invite email.
        </p>
        <div>
          <label className="label">Email</label>
          <input
            autoFocus
            className="input"
            type="email"
            placeholder="friend@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-ghost flex-1">
            Cancel
          </button>
          <button
            type="submit"
            disabled={!email.includes('@') || invite.isPending}
            className="btn-primary flex-1"
          >
            {invite.isPending ? 'Sending…' : 'Send invite'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
