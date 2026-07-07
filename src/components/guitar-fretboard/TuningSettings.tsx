import type { AccidentalPreference, FretboardMode, TuningPreset } from '@/lib/guitarFretboard/types'
import { TUNING_PRESETS } from '@/lib/guitarFretboard/tuning'

interface TuningSettingsProps {
  tuningId: TuningPreset['id']
  accidental: AccidentalPreference
  mode: FretboardMode
  onTuningChange: (id: TuningPreset['id']) => void
  onAccidentalChange: (accidental: AccidentalPreference) => void
  onModeChange: (mode: FretboardMode) => void
}

export function TuningSettings({ tuningId, accidental, mode, onTuningChange, onAccidentalChange, onModeChange }: TuningSettingsProps) {
  return (
    <div className="fretboard-settings-grid">
      <label className="fretboard-field">
        <span>调弦预设</span>
        <select value={tuningId} onChange={(event) => onTuningChange(event.target.value as TuningPreset['id'])}>
          {TUNING_PRESETS.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.name}
            </option>
          ))}
        </select>
      </label>

      <label className="fretboard-field">
        <span>升降号</span>
        <select value={accidental} onChange={(event) => onAccidentalChange(event.target.value as AccidentalPreference)}>
          <option value="sharp">升号优先</option>
          <option value="flat">降号优先</option>
        </select>
      </label>

      <label className="fretboard-field">
        <span>显示模式</span>
        <select value={mode} onChange={(event) => onModeChange(event.target.value as FretboardMode)}>
          <option value="hidden">隐藏答案</option>
          <option value="all">全部音名</option>
          <option value="natural">自然音</option>
          <option value="target">指定音</option>
        </select>
      </label>
    </div>
  )
}
