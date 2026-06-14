import React, { useEffect, useMemo, useState } from 'react'
import { Axis3d, Calendar, CalendarClock, Clock3, Globe2, Moon, Orbit, Pause, RotateCcw, Sparkles, Sun, Waves } from 'lucide-react'
import { UnifiedEarthView, type EarthVisualizationMode } from './components/globe/UnifiedEarthView'
import { useAppContext } from './contexts'

const MODE_KEY = 'earth-view-mode'
const SCENE_DARK_KEY = 'earth-view-scene-dark'
const DAY_MS = 24 * 60 * 60 * 1000
const YEAR_MS = 365 * DAY_MS

type PreviewMode = 'day' | 'year-no-spin' | 'year-spin'

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
  const [previewMode, setPreviewMode] = useState<PreviewMode | null>(null)
  const [dateOffsetMs, setDateOffsetMs] = useState(0)
  const [rotationOffsetMs, setRotationOffsetMs] = useState(0)
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
    if (!previewMode) return

    const durationMs = previewMode === 'day' ? 16000 : previewMode === 'year-no-spin' ? 48000 : 96000
    const start = performance.now()
    let frame = 0

    const animate = (time: number) => {
      const progress = Math.min(1, (time - start) / durationMs)
      const offsetMs = previewMode === 'day' ? progress * DAY_MS : progress * YEAR_MS
      setDateOffsetMs(offsetMs)
      setRotationOffsetMs(previewMode === 'year-no-spin' ? 0 : offsetMs)
      if (progress < 1) {
        frame = requestAnimationFrame(animate)
      } else {
        setPreviewMode(null)
        setDateOffsetMs(0)
        setRotationOffsetMs(0)
      }
    }

    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [previewMode])

  useEffect(() => {
    if (mode === 'globe') return
    setPreviewMode(null)
    setDateOffsetMs(0)
    setRotationOffsetMs(0)
  }, [mode])

  const togglePreview = (nextMode: PreviewMode) => {
    setDateOffsetMs(0)
    setRotationOffsetMs(0)
    setPreviewMode((current) => current === nextMode ? null : nextMode)
  }

  const activeMode = MODES.find((item) => item.id === mode) ?? MODES[3]
  const effectiveSceneIsDark = mode === 'galaxy' || sceneIsDark

  return (
    <main className="earth-shell">
      <section className={`earth-stage ${effectiveSceneIsDark ? 'earth-stage-dark' : 'earth-stage-light'}`} aria-label={`${activeMode.label} visualization`}>
        <UnifiedEarthView
          className="earth-canvas"
          mode={mode}
          dateOffsetMs={mode === 'globe' ? dateOffsetMs : 0}
          rotationOffsetMs={mode === 'globe' ? rotationOffsetMs : 0}
          isDarkOverride={effectiveSceneIsDark}
          orbitTiltView={orbitTiltView}
          resetViewKey={resetViewKey}
          timezone={timezone}
          timezoneRingScale={0.72}
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
              <>
                <button
                  type="button"
                  className={`earth-icon-button ${previewMode === 'day' ? 'is-active' : ''}`}
                  onClick={() => togglePreview('day')}
                  aria-pressed={previewMode === 'day'}
                  aria-label={previewMode === 'day' ? 'Stop 24-hour animation' : 'Animate 24 hours'}
                  title={previewMode === 'day' ? 'Stop 24-hour animation' : 'Animate 24 hours'}
                >
                  {previewMode === 'day' ? <Pause aria-hidden="true" /> : <Clock3 aria-hidden="true" />}
                </button>
                <button
                  type="button"
                  className={`earth-icon-button ${previewMode === 'year-no-spin' ? 'is-active' : ''}`}
                  onClick={() => togglePreview('year-no-spin')}
                  aria-pressed={previewMode === 'year-no-spin'}
                  aria-label={previewMode === 'year-no-spin' ? 'Stop 1-year animation without Earth rotation' : 'Animate 1 year without Earth rotation'}
                  title={previewMode === 'year-no-spin' ? 'Stop 1-year animation without Earth rotation' : 'Animate 1 year without Earth rotation'}
                >
                  {previewMode === 'year-no-spin' ? <Pause aria-hidden="true" /> : <Calendar aria-hidden="true" />}
                </button>
                <button
                  type="button"
                  className={`earth-icon-button ${previewMode === 'year-spin' ? 'is-active' : ''}`}
                  onClick={() => togglePreview('year-spin')}
                  aria-pressed={previewMode === 'year-spin'}
                  aria-label={previewMode === 'year-spin' ? 'Stop 1-year animation with daily rotations' : 'Animate 1 year with daily rotations'}
                  title={previewMode === 'year-spin' ? 'Stop 1-year animation with daily rotations' : 'Animate 1 year with daily rotations'}
                >
                  {previewMode === 'year-spin' ? <Pause aria-hidden="true" /> : <CalendarClock aria-hidden="true" />}
                </button>
              </>
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
