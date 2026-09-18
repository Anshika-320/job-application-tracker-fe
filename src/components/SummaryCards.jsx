export function SummaryCards({ total, interviewing, offers }) {
  const cards = [
    { key: 'total', label: 'Total applications', value: total },
    { key: 'interviewing', label: 'In interview stage', value: interviewing },
    { key: 'offers', label: 'Offers received', value: offers },
  ]

  return (
    <dl className="summary-grid">
      {cards.map((card) => (
        <div key={card.key} className="summary-card">
          <dt>{card.label}</dt>
          <dd>{card.value}</dd>
        </div>
      ))}
    </dl>
  )
}
