import { useAppStore } from '../../stores/appStore'
import { MODE_LABELS } from '../../types'
import type { AppMode } from '../../types'

const MODES: AppMode[] = ['companion', 'guidance', 'meditation', 'daily-power']

export default function ModeSwitchBar() {
  const mode = useAppStore((s) => s.mode)
  const setMode = useAppStore((s) => s.setMode)

  return (
    <div className="absolute top-6 left-0 right-0 z-20 px-4">
      <div className="flex justify-center">
        <div className="flex bg-black/30 backdrop-blur-md rounded-full p-1 gap-0.5 border border-white/5">
          {MODES.map((m) => {
            const isActive = mode === m
            return (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`
                  px-3 py-1.5 rounded-full text-xs font-medium
                  transition-all duration-300 whitespace-nowrap
                  ${isActive
                    ? 'bg-amber-500/30 text-amber-200 shadow-[0_0_10px_rgba(245,158,75,0.3)]'
                    : 'text-white/40 hover:text-white/70 hover:bg-white/5'
                  }
                `}
              >
                {MODE_LABELS[m]}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
