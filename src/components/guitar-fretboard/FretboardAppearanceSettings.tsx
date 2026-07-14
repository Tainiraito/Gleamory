import type { CSSProperties } from 'react'
import { FRETBOARD_APPEARANCE_PRESETS } from '@/lib/guitarFretboard/appearance'
import type { FretboardAppearanceId } from '@/lib/guitarFretboard/types'

interface FretboardAppearanceSettingsProps {
  value: FretboardAppearanceId
  onChange: (value: FretboardAppearanceId) => void
}

export function FretboardAppearanceSettings({ value, onChange }: FretboardAppearanceSettingsProps) {
  return (
    <div className="fretboard-appearance-setting-row">
      <span>指板外观</span>
      <div className="fretboard-appearance-settings" role="group" aria-label="指板外观">
        {FRETBOARD_APPEARANCE_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            aria-label={`${preset.name}：${preset.description}`}
            aria-pressed={value === preset.id}
            onClick={() => onChange(preset.id)}
          >
            <span
              className="fretboard-appearance-preview"
              data-appearance={preset.id}
              style={{
                '--preview-board': preset.preview.board,
                '--preview-fret': preset.preview.fret,
                '--preview-wound-string': preset.preview.woundString,
                '--preview-plain-string': preset.preview.plainString,
              } as CSSProperties}
              aria-hidden="true"
            >
              <i className="fretboard-appearance-preview-fret" />
              <i className="fretboard-appearance-preview-string wound" />
              <i className="fretboard-appearance-preview-string plain" />
            </span>
            <strong>{preset.name}</strong>
            <small>{preset.description}</small>
          </button>
        ))}
      </div>
    </div>
  )
}
