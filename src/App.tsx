import React, { useEffect, useMemo, useState } from 'react'
import { Globe2, Moon, Orbit, Pause, Play, Sparkles, Sun, Waves } from 'lucide-react'
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
  const { isDark, theme, toggleTheme } = useAppContext()
  const [mode, setMode] = useState<EarthVisualizationMode>(readStoredMode)
  const [sceneIsDark, setSceneIsDark] = useState(() => readStoredSceneDark(isDark))
  const [previewHours, setPreviewHours] = useState(0)
  const [isPreviewing, setIsPreviewing] = useState(false)
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

  return (
    <main className="earth-shell">
      <section className={`earth-stage ${sceneIsDark ? 'earth-stage-dark' : 'earth-stage-light'}`} aria-label={`${activeMode.label} visualization`}>
        <UnifiedEarthView
          className="earth-canvas"
          mode={mode}
          timeOffsetHours={mode === 'globe' ? previewHours : 0}
          isDarkOverride={sceneIsDark}
          timezone={timezone}
        />

        <header className="earth-topbar" aria-label="Visualization controls">
          <div className="earth-brand">
            <span>Earth View</span>
            <h1>{activeMode.label}</h1>
          </div>

          <div className="earth-actions">
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
            <button
              type="button"
              className="earth-theme-button"
              onClick={toggleTheme}
              aria-label={`Switch site theme from ${theme}`}
              title={`Switch site theme from ${theme}`}
            >
              Theme
            </button>
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
