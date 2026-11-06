type SettingsInfoProps = {
  title: string
  body: string
}

/** Kept so existing sections can pass a note. The title is the label. */
export function SettingsInfo({ title, body }: SettingsInfoProps) {
  void title
  void body
  return null
}
