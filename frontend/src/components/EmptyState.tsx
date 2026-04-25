interface EmptyStateProps {
  icon?: string
  title: string
  description?: string
}

function EmptyState({ icon = '📭', title, description }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="icon">{icon}</div>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
    </div>
  )
}

export default EmptyState
