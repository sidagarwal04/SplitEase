import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from './Modal.jsx';
import { useCreateGroup } from '../hooks/useGroups.js';
import toast from 'react-hot-toast';

const EMOJIS = ['🏠', '🎉', '✈️', '🍕', '🏖️', '🎬', '🛒', '☕', '🚗', '🎁', '💼', '🏔️'];

export default function CreateGroupModal({ open, onClose }) {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('💸');
  const [description, setDescription] = useState('');
  const create = useCreateGroup();
  const navigate = useNavigate();

  const reset = () => {
    setName('');
    setEmoji('💸');
    setDescription('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      const group = await create.mutateAsync({ name: name.trim(), emoji, description: description.trim() });
      toast.success('Group created');
      reset();
      onClose?.();
      navigate(`/groups/${group.id}`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose?.();
      }}
      title="New group"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Pick an icon</label>
          <div className="flex flex-wrap gap-2">
            {EMOJIS.map((e) => (
              <button
                type="button"
                key={e}
                onClick={() => setEmoji(e)}
                className={`h-10 w-10 rounded-xl border text-xl grid place-items-center transition ${
                  emoji === e
                    ? 'border-accent bg-accent/10'
                    : 'border-border hover:border-border-strong bg-bg-subtle/60'
                }`}
              >
                {e}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="label">Group name</label>
          <input
            autoFocus
            className="input"
            placeholder="Goa trip, Roomies, Lunch crew…"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
          />
        </div>
        <div>
          <label className="label">Description (optional)</label>
          <input
            className="input"
            placeholder="What's this group about?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={140}
          />
        </div>
        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
          <button
            type="submit"
            disabled={!name.trim() || create.isPending}
            className="btn-primary flex-1"
          >
            {create.isPending ? 'Creating…' : 'Create group'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
