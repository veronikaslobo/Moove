import { useEffect, useRef, useState } from 'react'

type SportOption = { slug: string; label: string }

type SportFilterProps = {
  options: SportOption[]
  selected: string[] // empty = every sport is shown
  onChange: (selected: string[]) => void
}

// A button that opens a checklist, so several sports can be picked at once.
function SportFilter({ options, selected, onChange }: SportFilterProps) {
  const [isOpen, setIsOpen] = useState(false)
  const filterRef = useRef<HTMLDivElement>(null)

  // Close the list when the user clicks anywhere outside it.
  useEffect(() => {
    if (!isOpen) return
    function closeIfOutside(event: MouseEvent) {
      if (!filterRef.current?.contains(event.target as Node)) setIsOpen(false)
    }
    document.addEventListener('mousedown', closeIfOutside)
    return () => document.removeEventListener('mousedown', closeIfOutside)
  }, [isOpen])

  function toggle(slug: string) {
    if (selected.includes(slug)) {
      onChange(selected.filter((current) => current !== slug))
    } else {
      onChange([...selected, slug])
    }
  }

  // Button text: "All sports", "Tennis", or "3 sports".
  let buttonLabel = 'All sports'
  if (selected.length === 1) {
    buttonLabel = options.find((option) => option.slug === selected[0])?.label ?? '1 sport'
  } else if (selected.length > 1) {
    buttonLabel = `${selected.length} sports`
  }

  return (
    <div className="sport-filter" ref={filterRef}>
      <button
        className={selected.length > 0 ? 'sport-filter-button active' : 'sport-filter-button'}
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
      >
        {buttonLabel} ▾
      </button>

      {isOpen && (
        <div className="sport-filter-panel">
          <div className="sport-filter-list">
            {options.map((option) => (
              <label key={option.slug}>
                <input
                  type="checkbox"
                  checked={selected.includes(option.slug)}
                  onChange={() => toggle(option.slug)}
                />
                {option.label}
              </label>
            ))}
          </div>
          <div className="sport-filter-actions">
            <button onClick={() => onChange([])}>Show all</button>
            <button className="primary" onClick={() => setIsOpen(false)}>
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default SportFilter
