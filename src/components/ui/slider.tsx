import { Slider as SliderPrimitive } from '@base-ui/react/slider'

import { cn } from '@/lib/utils'

type SliderProps = SliderPrimitive.Root.Props & {
  thumbAriaLabels?: readonly string[]
  getThumbAriaValueText?: (formattedValue: string, value: number, index: number) => string
}

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  'aria-label': ariaLabel,
  thumbAriaLabels,
  getThumbAriaValueText,
  ...props
}: SliderProps) {
  const _values = Array.isArray(value)
    ? value
    : Array.isArray(defaultValue)
      ? defaultValue
      : [min, max]
  const rootAriaLabel = ariaLabel

  return (
    <SliderPrimitive.Root
      className={cn(
        'data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full',
        className,
      )}
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      aria-label={ariaLabel}
      thumbAlignment="edge"
      {...props}
    >
      <SliderPrimitive.Control className="relative flex w-full touch-none items-center select-none data-disabled:opacity-50 data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-40 data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col">
        <SliderPrimitive.Track
          data-slot="slider-track"
          className="relative grow overflow-hidden rounded-full bg-[var(--control-track)] select-none data-[orientation=horizontal]:h-1.5 data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1.5"
        >
          <SliderPrimitive.Indicator
            data-slot="slider-range"
            className="bg-[var(--control-track-active)] select-none data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full"
          />
        </SliderPrimitive.Track>
        {Array.from({ length: _values.length }, (_, index) => (
          <SliderPrimitive.Thumb
            data-slot="slider-thumb"
            key={index}
            index={index}
            getAriaLabel={(thumbIndex) =>
              thumbAriaLabels?.[thumbIndex] ??
              (_values.length === 1 && typeof rootAriaLabel === 'string'
                ? rootAriaLabel
                : `滑块 ${thumbIndex + 1}`)
            }
            getAriaValueText={getThumbAriaValueText}
            className="relative block size-4 shrink-0 rounded-full border-2 border-[var(--control-track-active)] bg-[var(--control-thumb)] shadow-[0_1px_3px_rgba(44,42,48,0.22)] transition-[box-shadow,transform] select-none after:absolute after:-inset-2 hover:shadow-[0_0_0_4px_var(--accent-subtle)] focus-visible:shadow-[0_0_0_4px_var(--accent-subtle)] focus-visible:outline-hidden active:scale-95 disabled:pointer-events-none disabled:opacity-50"
          />
        ))}
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  )
}

export { Slider }
