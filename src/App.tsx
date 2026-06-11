import React, { useEffect, useMemo, useState } from 'react'
import { Axis3d, Globe2, Moon, Orbit, Pause, Play, RotateCcw, Sparkles, Sun, Waves } from 'lucide-react'
import { UnifiedEarthView, type EarthVisualizationMode } from './components/globe/UnifiedEarthView'
import { useAppContext } from './contexts'

const MODE_KEY = 'earth-view-mode'
const SCENE_DARK_KEY = 'earth-view-scene-dark'

const MODES: Array<{
  id: EarthVisualizationMode
  label: string
  Icon: typeof Globe2
}> = [
  { id: 'galaxy', label: 'Galaxy', Icon: Sparkles },
  { id: 'spiral', label: 'Spiral', Icon: Waves },
  { id: 'orbit', label: 'Orbit', Icon: Orbit },
  { id: 'globe', label: 'Earth', Icon: Globe2 },
]

function readStoredMode(): EarthVisualizationMode {
  try {
    const stored = localStorage.getItem(MODE_KEY)
    if (stored === 'galaxy' || stored === 'spiral' || stored === 'orbit' || stored === 'globe') {
      return stored
    }
  } catch {
    // Storage can be blocked in private or restricted browsing contexts.
  }
  return 'globe'
}

function readStoredSceneDark(fallback: boolean) {
  try {
    const stored = localStorage.getItem(SCENE_DARK_KEY)
    if (stored === '1') return true
    if (stored === '0') return false
  } catch {
    // Storage can be blocked in private or restricted browsing contexts.
  }
  return fallback
}

function getBrowserTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

export default function App() {
  const { isDark } = useAppContext()
  const [mode, setMode] = useState<EarthVisualizationMode>(readStoredMode)
  const [sceneIsDark, setSceneIsDark] = useState(() => readStoredSceneDark(isDark))
  const [previewHours, setPreviewHours] = useState(0)
  const [isPreviewing, setIsPreviewing] = useState(false)
  const [orbitTiltView, setOrbitTiltView] = useState(false)
  const [resetViewKey, setResetViewKey] = useState(0)
  const timezone = useMemo(getBrowserTimezone, [])

  useEffect(() => {
    try {
      localStorage.setItem(MODE_KEY, mode)
    } catch {
      // Storage can be blocked in private or restricted browsing contexts.
    }
  }, [mode])

  useEffect(() => {
    try {
      localStorage.setItem(SCENE_DARK_KEY, sceneIsDark ? '1' : '0')
    } catch {
      // Storage can be blocked in private or restricted browsing contexts.
    }
  }, [sceneIsDark])

  useEffect(() => {
    if (!isPreviewing) return

    const durationMs = 16000
    const start = performance.now()
    let frame = 0

    const animate = (time: number) => {
      const progress = Math.min(1, (time - start) / durationMs)
      setPreviewHours(progress * 24)
      if (progress < 1) {
        frame = requestAnimationFrame(animate)
      } else {
        setIsPreviewing(false)
        setPreviewHours(0)
      }
    }

    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [isPreviewing])

  useEffect(() => {
    if (mode === 'globe') return
    setIsPreviewing(false)
    setPreviewHours(0)
  }, [mode])

  const activeMode = MODES.find((item) => item.id === mode) ?? MODES[3]
  const effectiveSceneIsDark = mode === 'galaxy' || sceneIsDark

  return (
    <main className="earth-shell">
      <section className={`earth-stage ${effectiveSceneIsDark ? 'earth-stage-dark' : 'earth-stage-light'}`} aria-label={`${activeMode.label} visualization`}>
        <UnifiedEarthView
          className="earth-canvas"
          mode={mode}
          timeOffsetHours={mode === 'globe' ? previewHours : 0}
          isDarkOverride={effectiveSceneIsDark}
          orbitTiltView={orbitTiltView}
          resetViewKey={resetViewKey}
          timezone={timezone}
        />

        <header className="earth-topbar" aria-label="Visualization controls">
          <div className="earth-brand">
            <span>Earth View</span>
            <h1>{activeMode.label}</h1>
          </div>

          <div className="earth-actions">
            <button
              type="button"
              className="earth-icon-button"
              onClick={() => setResetViewKey((key) => key + 1)}
              aria-label="Reset view"
              title="Reset view"
            >
              <RotateCcw aria-hidden="true" />
            </button>
            {mode === 'orbit' && (
              <button
                type="button"
                className={`earth-action-button ${orbitTiltView ? 'is-active' : ''}`}
                onClick={() => setOrbitTiltView((value) => !value)}
                aria-pressed={orbitTiltView}
                aria-label={orbitTiltView ? 'Turn off Tilt View' : 'Turn on Tilt View'}
                title={orbitTiltView ? 'Turn off Tilt View' : 'Turn on Tilt View'}
              >
                <Axis3d aria-hidden="true" />
                <span>Tilt View</span>
              </button>
            )}
            {mode === 'globe' && (
              <button
                type="button"
                className="earth-icon-button"
                onClick={() => {
                  setPreviewHours(0)
                  setIsPreviewing((value) => !value)
                }}
                aria-pressed={isPreviewing}
                aria-label={isPreviewing ? 'Stop 24-hour preview' : 'Start 24-hour preview'}
                title={isPreviewing ? 'Stop 24-hour preview' : 'Start 24-hour preview'}
              >
                {isPreviewing ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
              </button>
            )}
            {mode !== 'galaxy' && (
              <button
                type="button"
                className="earth-icon-button"
                onClick={() => setSceneIsDark((value) => !value)}
                aria-pressed={sceneIsDark}
                aria-label={sceneIsDark ? 'Use light 3D scene' : 'Use dark 3D scene'}
                title={sceneIsDark ? 'Use light 3D scene' : 'Use dark 3D scene'}
              >
                {sceneIsDark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
              </button>
            )}
          </div>
        </header>

        <nav className="earth-modebar" aria-label="Earth visualization modes">
          {MODES.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              className={`earth-mode-button ${mode === id ? 'is-active' : ''}`}
              onClick={() => setMode(id)}
              aria-pressed={mode === id}
              title={label}
            >
              <Icon aria-hidden="true" />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </section>
    </main>
  )
}
