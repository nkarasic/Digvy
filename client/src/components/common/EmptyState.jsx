export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {Icon && <Icon size={48} className="text-slate-300 mb-4" />}
      <h3 className="text-lg font-medium text-slate-600 mb-1">{title}</h3>
      {description && <p className="text-sm text-slate-400 mb-4">{description}</p>}
      {action}
    </div>
  );
}
