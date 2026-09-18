export function StateMessage({ tone = 'neutral', title, children, action }) {
  return (
    <div className={`state-message state-${tone}`} role={tone === 'error' ? 'alert' : undefined}>
      <h3>{title}</h3>
      {children ? <p>{children}</p> : null}
      {action ?? null}
    </div>
  )
}
