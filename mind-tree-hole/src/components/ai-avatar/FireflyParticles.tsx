import { useMemo } from 'react'
import { useAppStore } from '../../stores/appStore'

const PARTICLE_COUNT = 40

export default function FireflyParticles() {
  const mode = useAppStore((s) => s.mode)

  const particles = useMemo(() =>
    Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      duration: 3 + Math.random() * 6,
      delay: Math.random() * 5,
      seed: Math.random(),
      size: 3 + Math.random() * 5,
    })),
  [])

  const isMeditation = mode === 'meditation'

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {particles.map((p) => (
        <div
          key={p.id}
          className="firefly"
          style={{
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            '--duration': `${isMeditation ? p.duration * 3 : p.duration}s`,
            '--delay': `${p.delay}s`,
            '--seed': p.seed,
          } as React.CSSProperties}
        />
      ))}
    </div>
  )
}
