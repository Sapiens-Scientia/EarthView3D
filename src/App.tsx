import React, { useEffect, useMemo, useState } from 'react'
import { Axis3d, ChevronLeft, ChevronRight, Globe2, Layers2, Moon, Orbit, RotateCcw, Sparkles, Sun, Waves } from 'lucide-react'
import { GALAXY_TIMELINE_EVENTS, UnifiedEarthView, type EarthVisualizationMode } from './components/globe/UnifiedEarthView'
import { useAppContext } from './contexts'

const MODE_KEY = 'earth-view-mode'
const SCENE_DARK_KEY = 'earth-view-scene-dark'
const DAY_MS = 24 * 60 * 60 * 1000
const YEAR_MS = 365 * DAY_MS

type PreviewMode = 'day' | 'year-no-spin' | 'year-spin' | 'sun-year'

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

function formatEventBrowserYear(yearMa: string) {
  return yearMa.replace(' Ma', ' Million Years Old')
}

export default function App() {
  const { isDark } = useAppContext()
  const [mode, setMode] = useState<EarthVisualizationMode>(readStoredMode)
  const [sceneIsDark, setSceneIsDark] = useState(() => readStoredSceneDark(isDark))
  const [previewMode, setPreviewMode] = useState<PreviewMode | null>(null)
  const [dateOffsetMs, setDateOffsetMs] = useState(0)
  const [rotationOffsetMs, setRotationOffsetMs] = useState(0)
  const [sunOrbitProgress, setSunOrbitProgress] = useState(0)
  const [orbitTiltView, setOrbitTiltView] = useState(false)
  const [orbitTiltStripsVisible, setOrbitTiltStripsVisible] = useState(true)
  const [resetViewKey, setResetViewKey] = useState(0)
  const [selectedGalaxyEventKey, setSelectedGalaxyEventKey] = useState(() => {
    return GALAXY_TIMELINE_EVENTS.find((event) => event.group === 'present')?.key ?? GALAXY_TIMELINE_EVENTS[0]?.key ?? ''
  })
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

    const durationMs = previewMode === 'day' ? 16000 : previewMode === 'year-spin' ? 96000 : 48000
    const start = performance.now()
    let frame = 0

    const animate = (time: number) => {
      const progress = Math.min(1, (time - start) / durationMs)
      if (previewMode === 'sun-year') {
        setDateOffsetMs(0)
        setRotationOffsetMs(0)
        setSunOrbitProgress(progress)
      } else {
        const offsetMs = previewMode === 'day' ? progress * DAY_MS : progress * YEAR_MS
        setDateOffsetMs(offsetMs)
        setRotationOffsetMs(previewMode === 'year-no-spin' ? 0 : offsetMs)
        setSunOrbitProgress(0)
      }
      if (progress < 1) {
        frame = requestAnimationFrame(animate)
      } else {
        setPreviewMode(null)
        setDateOffsetMs(0)
        setRotationOffsetMs(0)
        setSunOrbitProgress(0)
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
    setSunOrbitProgress(0)
  }, [mode])

  const togglePreview = (nextMode: PreviewMode) => {
    setDateOffsetMs(0)
    setRotationOffsetMs(0)
    setSunOrbitProgress(0)
    setPreviewMode((current) => current === nextMode ? null : nextMode)
  }

  const activeMode = MODES.find((item) => item.id === mode) ?? MODES[3]
  const effectiveSceneIsDark = mode === 'galaxy' || sceneIsDark
  const displayedGalaxyEvents = useMemo(() => [...GALAXY_TIMELINE_EVENTS].reverse(), [])
  const selectedGalaxyEventIndex = GALAXY_TIMELINE_EVENTS.findIndex((event) => event.key === selectedGalaxyEventKey)
  const selectedGalaxyEvent = GALAXY_TIMELINE_EVENTS[selectedGalaxyEventIndex] ?? GALAXY_TIMELINE_EVENTS[0]
  const displayedGalaxyEventIndex = displayedGalaxyEvents.findIndex((event) => event.key === selectedGalaxyEventKey)
  const selectGalaxyEventAt = (nextIndex: number) => {
    const boundedIndex = (nextIndex + GALAXY_TIMELINE_EVENTS.length) % GALAXY_TIMELINE_EVENTS.length
    setSelectedGalaxyEventKey(GALAXY_TIMELINE_EVENTS[boundedIndex].key)
  }

  return (
    <main className="earth-shell">
      <section className={`earth-stage ${effectiveSceneIsDark ? 'earth-stage-dark' : 'earth-stage-light'}`} aria-label={`${activeMode.label} visualization`}>
        <UnifiedEarthView
          className="earth-canvas"
          mode={mode}
          dateOffsetMs={mode === 'globe' ? dateOffsetMs : 0}
          rotationOffsetMs={mode === 'globe' ? rotationOffsetMs : 0}
          sunOrbitProgress={mode === 'globe' ? sunOrbitProgress : 0}
          sunOrbitActive={mode === 'globe' && previewMode === 'sun-year'}
          isDarkOverride={effectiveSceneIsDark}
          orbitTiltView={orbitTiltView}
          orbitTiltStripsVisible={orbitTiltStripsVisible}
          resetViewKey={resetViewKey}
          selectedGalaxyEventKey={mode === 'galaxy' ? selectedGalaxyEventKey : null}
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
            {mode === 'orbit' && (
              <button
                type="button"
                className={`earth-action-button ${orbitTiltStripsVisible ? 'is-active' : ''}`}
                onClick={() => setOrbitTiltStripsVisible((value) => !value)}
                aria-pressed={orbitTiltStripsVisible}
                aria-label={orbitTiltStripsVisible ? 'Hide tilt reference strips' : 'Show tilt reference strips'}
                title={orbitTiltStripsVisible ? 'Hide tilt reference strips' : 'Show tilt reference strips'}
              >
                <Layers2 aria-hidden="true" />
                <span>Strips</span>
              </button>
            )}
            {mode === 'globe' && (
              <>
                <button
                  type="button"
                  className={`earth-action-button earth-animation-button ${previewMode === 'day' ? 'is-active' : ''}`}
                  onClick={() => togglePreview('day')}
                  aria-pressed={previewMode === 'day'}
                  aria-label={previewMode === 'day' ? 'Stop 24-hour animation' : 'Animate 24 hours'}
                  title={previewMode === 'day' ? 'Stop 24-hour animation' : 'Animate 24 hours'}
                >
                  <span>{previewMode === 'day' ? 'Stop 24h' : '24 Hours'}</span>
                </button>
                <button
                  type="button"
                  className={`earth-action-button earth-animation-button ${previewMode === 'year-no-spin' ? 'is-active' : ''}`}
                  onClick={() => togglePreview('year-no-spin')}
                  aria-pressed={previewMode === 'year-no-spin'}
                  aria-label={previewMode === 'year-no-spin' ? 'Stop 1-year animation without Earth rotation' : 'Animate 1 year without Earth rotation'}
                  title={previewMode === 'year-no-spin' ? 'Stop 1-year animation without Earth rotation' : 'Animate 1 year without Earth rotation'}
                >
                  <span>{previewMode === 'year-no-spin' ? 'Stop Year' : '1 Year'}</span>
                </button>
                <button
                  type="button"
                  className={`earth-action-button earth-animation-button ${previewMode === 'year-spin' ? 'is-active' : ''}`}
                  onClick={() => togglePreview('year-spin')}
                  aria-pressed={previewMode === 'year-spin'}
                  aria-label={previewMode === 'year-spin' ? 'Stop 1-year animation with daily rotations' : 'Animate 1 year with daily rotations'}
                  title={previewMode === 'year-spin' ? 'Stop 1-year animation with daily rotations' : 'Animate 1 year with daily rotations'}
                >
                  <span>{previewMode === 'year-spin' ? 'Stop Spin' : 'Year + Spin'}</span>
                </button>
                <button
                  type="button"
                  className={`earth-action-button earth-animation-button ${previewMode === 'sun-year' ? 'is-active' : ''}`}
                  onClick={() => togglePreview('sun-year')}
                  aria-pressed={previewMode === 'sun-year'}
                  aria-label={previewMode === 'sun-year' ? 'Stop sun direction year animation' : 'Animate sun direction through one year'}
                  title={previewMode === 'sun-year' ? 'Stop sun direction year animation' : 'Animate sun direction through one year'}
                >
                  <span>{previewMode === 'sun-year' ? 'Stop Sun' : 'Sun Year'}</span>
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

        {mode === 'galaxy' && selectedGalaxyEvent && (
          <aside className="earth-event-browser" aria-label="Earth Event Browser">
            <div className="earth-event-browser-header">
              <span>Earth Event Browser</span>
              <strong>{displayedGalaxyEventIndex + 1} / {displayedGalaxyEvents.length}</strong>
            </div>

            <label className="earth-event-select-label" htmlFor="earth-event-select">Timeline event</label>
            <select
              id="earth-event-select"
              className="earth-event-select"
              value={selectedGalaxyEvent.key}
              onChange={(event) => setSelectedGalaxyEventKey(event.target.value)}
            >
              {displayedGalaxyEvents.map((event) => (
                <option key={event.key} value={event.key}>
                  {event.label}
                </option>
              ))}
            </select>

            <div className="earth-event-stepper" aria-label="Browse timeline events">
              <button type="button" onClick={() => selectGalaxyEventAt(selectedGalaxyEventIndex - 1)} aria-label="Previous timeline event" title="Previous event">
                <ChevronLeft aria-hidden="true" />
              </button>
              <button type="button" onClick={() => selectGalaxyEventAt(selectedGalaxyEventIndex + 1)} aria-label="Next timeline event" title="Next event">
                <ChevronRight aria-hidden="true" />
              </button>
            </div>

            <div className="earth-event-detail" style={{ '--event-color': selectedGalaxyEvent.color } as React.CSSProperties}>
              <div className="earth-event-color" aria-hidden="true" />
              <h2>{selectedGalaxyEvent.label}</h2>
              <p className="earth-event-year">{formatEventBrowserYear(selectedGalaxyEvent.yearMa)}</p>
              <p className="earth-event-description">{selectedGalaxyEvent.description}</p>
            </div>

            <div className="earth-gts-glossary" aria-label="Geologic time scale nomenclature">
              <h3>Geologic Time Scale nomenclature</h3>
              <p>Eon &gt; Era &gt; Period &gt; Epoch</p>
              <dl>
                <div>
                  <dt>Eon</dt>
                  <dd>Largest named span of geologic time.</dd>
                </div>
                <div>
                  <dt>Era</dt>
                  <dd>Major subdivision within an eon.</dd>
                </div>
                <div>
                  <dt>Period</dt>
                  <dd>Subdivision within an era.</dd>
                </div>
                <div>
                  <dt>Epoch</dt>
                  <dd>Finer subdivision within a period.</dd>
                </div>
              </dl>
            </div>
          </aside>
        )}

      </section>
    </main>
  )
}
