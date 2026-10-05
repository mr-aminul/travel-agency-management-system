type BarListItem = {
  key: string
  label: string
  value: number
  display?: string
}

type BarListProps = {
  items: BarListItem[]
  max?: number
}

export function BarList({ items, max }: BarListProps) {
  const ceiling = max ?? Math.max(...items.map((item) => item.value), 1)
  return (
    <ul className="pd-dash-bars">
      {items.map((item) => {
        const percent = Math.round((item.value / ceiling) * 100)
        return (
          <li key={item.key} className="pd-dash-bars__row">
            <span className="pd-dash-bars__label">{item.label}</span>
            <span className="pd-dash-bars__track">
              <span
                className="pd-dash-bars__fill"
                style={{ width: `${percent}%` }}
              />
            </span>
            <span className="pd-dash-bars__value">
              {item.display ?? String(item.value)}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
