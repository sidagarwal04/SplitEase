export default function EmptyState({ icon, title, message, action }) {
  return (
    <div className="card p-8 flex flex-col items-center text-center">
      {icon && (
        <div className="h-14 w-14 rounded-2xl bg-accent/10 text-accent grid place-items-center mb-4">
          {icon}
        </div>
      )}
      <h3 className="heading text-lg mb-1">{title}</h3>
      {message && <p className="text-text-muted text-sm max-w-sm">{message}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
