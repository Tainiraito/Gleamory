import type { AccidentalPreference, FretboardMode, NoteDisplayDurationMs, TuningPreset } from '@/lib/guitarFretboard/types'
import { TUNING_PRESETS } from '@/lib/guitarFretboard/tuning'

interface TuningSettingsProps {
  tuningId: TuningPreset['id']
  accidental: AccidentalPreference
  mode: FretboardMode
  noteDisplayMs: NoteDisplayDurationMs
  onTuningChange: (id: TuningPreset['id']) => void
  onAccidentalChange: (accidental: AccidentalPreference) => void
  onModeChange: (mode: FretboardMode) => void
  onNoteDisplayChange: (duration: NoteDisplayDurationMs) => void
}

const noteDisplayOptions: Array<{ value: string; label: string; duration: NoteDisplayDurationMs }> = [
  { value: 'persist', label: '持续显示，右键取消', duration: null },
  { value: 'hidden', label: '不显示点击音名', duration: 0 },
  { value: '1000', label: '1 秒后淡出', duration: 1000 },
  { value: '3000', label: '3 秒后淡出', duration: 3000 },
  { value: '5000', label: '5 秒后淡出', duration: 5000 },
]

interface SettingButtonGroupProps<T extends string> {
  label: string
  options: Array<{ value: T; label: string }>
  value: T
  onChange: (value: T) => void
}

function SettingButtonGroup<T extends string>({ label, options, value, onChange }: SettingButtonGroupProps<T>) {
  return (
    <div className="fretboard-button-group" role="group" aria-label={label}>
      <span>{label}</span>
      <div>
        {options.map((option) => (
          <button key={option.value} type="button" aria-pressed={option.value === value} onClick={() => onChange(option.value)}>
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function valueFromDuration(duration: NoteDisplayDurationMs): string {
  return noteDisplayOptions.find((option) => option.duration === duration)?.value ?? 'persist'
}

function durationFromValue(value: string): NoteDisplayDurationMs {
  return noteDisplayOptions.find((option) => option.value === value)?.duration ?? null
}

export function TuningSettings({
  tuningId,
  accidental,
  mode,
  noteDisplayMs,
  onTuningChange,
  onAccidentalChange,
  onModeChange,
  onNoteDisplayChange,
}: TuningSettingsProps) {
  return (
    <div className="fretboard-settings-grid">
      <SettingButtonGroup
        label="调弦预设"
        options={TUNING_PRESETS.map((preset) => ({ value: preset.id, label: preset.name }))}
        value={tuningId}
        onChange={(id) => onTuningChange(id as TuningPreset['id'])}
      />
      <SettingButtonGroup
        label="升降号"
        options={[
          { value: 'sharp', label: '升号优先' },
          { value: 'flat', label: '降号优先' },
        ]}
        value={accidental}
        onChange={(value) => onAccidentalChange(value as AccidentalPreference)}
      />
      <SettingButtonGroup
        label="显示模式"
        options={[
          { value: 'hidden', label: '隐藏答案' },
          { value: 'all', label: '全部音名' },
          { value: 'natural', label: '自然音' },
          { value: 'target', label: '指定音' },
        ]}
        value={mode}
        onChange={(value) => onModeChange(value as FretboardMode)}
      />
      <SettingButtonGroup
        label="点击音名显示"
        options={noteDisplayOptions.map((option) => ({ value: option.value, label: option.label }))}
        value={valueFromDuration(noteDisplayMs)}
        onChange={(value) => onNoteDisplayChange(durationFromValue(value))}
      />
    </div>
  )
}
