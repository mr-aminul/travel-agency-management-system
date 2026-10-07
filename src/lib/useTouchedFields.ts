import { useCallback, useState } from 'react'

/** Track which fields have been blurred / submitted so errors can show early. */
export function useTouchedFields<Field extends string>() {
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({})
  const [triedSubmit, setTriedSubmit] = useState(false)

  const markTouched = useCallback((field: Field) => {
    setTouched((current) =>
      current[field] ? current : { ...current, [field]: true },
    )
  }, [])

  const markAllTouched = useCallback((fields: Field[]) => {
    setTriedSubmit(true)
    setTouched((current) => {
      const next = { ...current }
      for (const field of fields) next[field] = true
      return next
    })
  }, [])

  const showError = useCallback(
    (field: Field) => triedSubmit || Boolean(touched[field]),
    [triedSubmit, touched],
  )

  const blur = useCallback(
    (field: Field) => () => {
      markTouched(field)
    },
    [markTouched],
  )

  return {
    touched,
    triedSubmit,
    markTouched,
    markAllTouched,
    showError,
    blur,
  }
}
