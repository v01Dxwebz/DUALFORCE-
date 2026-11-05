import { type CSSProperties, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import EngineScene, { defaultVisibility } from './EngineScene'
import { NORMAL_PLAYBACK_RATIO } from './motion'

const clamp = (value: number, minimum: number, maximum: number) => Math.min(maximum, Math.max(minimum, value))

function useEngineScrollProgress() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const stage = document.getElementById('engine-sequence')
    if (!stage) return
    let frame = 0
    const measure = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const travel = Math.max(stage.offsetHeight - window.innerHeight, 1)
        const next = clamp(-stage.getBoundingClientRect().top / travel, 0, 1)
        setProgress(previous => Math.abs(previous - next) > 0.002 ? next : previous)
      })
    }
    window.addEventListener('scroll', measure, { passive: true })
    window.addEventListener('resize', measure)
    const observer = new ResizeObserver(measure)
    observer.observe(stage)
    measure()
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', measure)
      window.removeEventListener('resize', measure)
      observer.disconnect()
    }
  }, [])

  return progress
}

export default function StandaloneViewer() {
  const progress = useEngineScrollProgress()
  const [rpm, setRpm] = useState(2800)
  const [playing, setPlaying] = useState(() => !window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [caseOpen, setCaseOpen] = useState(false)
  const [sectionOn, setSectionOn] = useState(false)
  const [exploded, setExploded] = useState(false)
  const [electromagnetic, setElectromagnetic] = useState(true)
  const [zoomLevel, setZoomLevel] = useState(0)
  const [resetSignal, setResetSignal] = useState(0)
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 720px)').matches)
  const modelScale = isMobile ? 0.23 + progress * 0.27 : 0.22 + progress * 0.86
  const modelOffsetX = 0
  const modelOffsetY = isMobile ? -0.3 + progress * 0.15 : 0
  const visualRps = playing && !exploded ? rpm / 60 * NORMAL_PLAYBACK_RATIO : 0

  useEffect(() => {
    const media = window.matchMedia('(max-width: 720px)')
    const update = (event: MediaQueryListEvent) => setIsMobile(event.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  const resetView = () => {
    setZoomLevel(0)
    setResetSignal(value => value + 1)
  }

  return <div className="engine-stage-app" style={{ '--scroll-progress': progress } as CSSProperties}>
    <EngineScene
      className="engine-stage-canvas"
      playing={playing}
      rpm={rpm}
      exploded={exploded}
      explodeAmount={exploded ? 1 : 0}
      electromagnetic={electromagnetic}
      visible={defaultVisibility}
      cameraMode="hero"
      annotationsEnabled={false}
      cutaway={true}
      caseOpenAmount={caseOpen ? 1 : 0}
      longitudinalSection={sectionOn}
      resetSignal={resetSignal}
      modelScale={modelScale}
      modelOffsetX={modelOffsetX}
      modelOffsetY={modelOffsetY}
      zoomLevel={zoomLevel}
      allowWheelZoom={false}
    />

    <div className="scroll-rail" aria-hidden="true"><span /></div>
    <div className="hero-copy" style={{ opacity: clamp(1 - progress * 1.55, 0, 1), transform: `translateY(${progress * -18}px)` }}>
      <p className="eyebrow"><span className="signal-dot" /> POWERTRAIN STUDY / 01</p>
      <h1>DUALFORCE<br /><span>350</span></h1>
      <p className="hero-deck">An inline twin.<br />A dual-energy research concept.</p>
      <a className="text-link" href="3d-engine.html">EXPLORE THE ENGINE <span aria-hidden="true">↗</span></a>
    </div>

    <div className="scroll-caption" style={{ opacity: clamp((progress - 0.28) * 3.2, 0, 1) }}>
      <span className="eyebrow">348 CC / INLINE-2</span>
      <p>Two energy paths.<br />One provisional powertrain.</p>
    </div>

    <div className="scene-edge-note"><span>REFERENCE-INSPIRED / PROVISIONAL MODEL</span><span>DRAG TO ROTATE</span></div>

    <div className="engine-control-dock" aria-label="Engine model controls">
      <div className="dock-status">
        <span className="dock-label"><i className={playing && electromagnetic ? 'signal-dot is-on' : 'signal-dot'} /> ENGINE SIMULATION</span>
        <span className="dock-cadence"><b>{visualRps.toFixed(2)}</b> <small>VISUAL REV/S</small></span>
      </div>
      <div className="rpm-row">
        <label htmlFor="rpm-reference">RPM reference <output htmlFor="rpm-reference">{rpm.toLocaleString('en-US')}</output></label>
        <input id="rpm-reference" type="range" min="400" max="7200" step="100" value={rpm} onChange={event => setRpm(Number(event.currentTarget.value))} aria-label="RPM reference setting" />
        <span className="rpm-hint">Visual cadence only</span>
      </div>
      <div className="control-actions">
        <button type="button" className="control-main" onClick={() => setPlaying(value => !value)} aria-pressed={playing}>{playing ? 'PAUSE' : 'PLAY'}</button>
        <button type="button" onClick={() => setCaseOpen(value => !value)} aria-pressed={caseOpen}>{caseOpen ? 'CLOSE CASE' : 'OPEN CASE'}</button>
        <button type="button" onClick={() => setSectionOn(value => !value)} aria-pressed={sectionOn}>SECTION</button>
        <button type="button" onClick={() => setExploded(value => !value)} aria-pressed={exploded}>{exploded ? 'ASSEMBLE' : 'EXPLODE'}</button>
        <button type="button" onClick={() => setElectromagnetic(value => !value)} aria-pressed={electromagnetic}>COIL ACTIVITY</button>
        <div className="zoom-actions" aria-label="Camera controls">
          <button type="button" onClick={() => setZoomLevel(value => value - 1)} aria-label="Zoom out">−</button>
          <button type="button" onClick={() => setZoomLevel(value => value + 1)} aria-label="Zoom in">+</button>
          <button type="button" onClick={resetView} aria-label="Reset camera">RESET VIEW</button>
        </div>
      </div>
    </div>

    <div className="scroll-cue" style={{ opacity: 1 - progress }} aria-hidden="true">
      <span>SCROLL TO REVEAL</span><i />
    </div>
  </div>
}

const host = document.getElementById('engine-viewer-root')
if (host) createRoot(host).render(<StandaloneViewer />)
