import { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import EngineScene, { componentMeta, defaultVisibility, type AnnotationMode, type CameraMode, type ComponentKey, type VisibilityState } from './EngineScene'
import { NORMAL_PLAYBACK_RATIO } from './motion'

type CasingMode = 'solid' | 'transparent'

const clamp = (value: number, minimum: number, maximum: number) => Math.min(maximum, Math.max(minimum, value))

const visibilityLabels: Record<ComponentKey, string> = {
  casing: 'Casing',
  frame: 'Frame',
  cylinders: 'Cylinders',
  pistons: 'Pistons',
  rods: 'Rods',
  crank: 'Crank',
  stator: 'Stator',
  magnets: 'Magnets',
}

function useEngineScrollProgress(isMobile: boolean) {
  const progressRef = useRef(0)
  const modelScaleRef = useRef(isMobile ? 0.3 : 0.34)
  const modelOffsetYRef = useRef(isMobile ? -0.3 : 0)

  useEffect(() => {
    const stage = document.getElementById('engine-sequence')
    if (!stage) return undefined
    let frame = 0
    const measure = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const travel = Math.max(stage.offsetHeight - window.innerHeight, 1)
        const progress = clamp(-stage.getBoundingClientRect().top / travel, 0, 1)
        const modelScale = isMobile ? 0.3 + progress * 0.32 : 0.34 + progress * 0.74
        const modelOffsetY = isMobile ? -0.3 + progress * 0.15 : 0
        progressRef.current = progress
        modelScaleRef.current = modelScale
        modelOffsetYRef.current = modelOffsetY
        stage.style.setProperty('--scroll-progress', progress.toFixed(5))
        stage.style.setProperty('--engine-model-scale', modelScale.toFixed(5))
        stage.style.setProperty('--engine-model-offset-y', modelOffsetY.toFixed(5))
        // Finish the hero fade before the secondary caption enters the same copy area.
        stage.style.setProperty('--engine-hero-opacity', clamp(1 - progress * 2.5, 0, 1).toFixed(4))
        stage.style.setProperty('--engine-hero-shift', `${(progress * -18).toFixed(2)}px`)
        stage.style.setProperty('--engine-caption-opacity', clamp((progress - 0.4) * 3, 0, 1).toFixed(4))
        stage.style.setProperty('--engine-cue-opacity', (1 - progress).toFixed(4))
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
  }, [isMobile])

  return { progressRef, modelScaleRef, modelOffsetYRef }
}

export default function StandaloneViewer() {
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 720px)').matches)
  const { progressRef, modelScaleRef, modelOffsetYRef } = useEngineScrollProgress(isMobile)
  const [rpm, setRpm] = useState(2800)
  const [playing, setPlaying] = useState(() => !window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [slowMotion, setSlowMotion] = useState(false)
  const [explodeAmount, setExplodeAmount] = useState(0)
  const [caseOpenAmount, setCaseOpenAmount] = useState(0)
  const [casingMode, setCasingMode] = useState<CasingMode>('transparent')
  const [sectionOn, setSectionOn] = useState(false)
  const [electromagnetic, setElectromagnetic] = useState(true)
  const [autoOrbit, setAutoOrbit] = useState(false)
  const [wheelZoom, setWheelZoom] = useState(false)
  const [zoomLevel, setZoomLevel] = useState(0)
  const [cameraMode, setCameraMode] = useState<CameraMode>('hero')
  const [annotationMode, setAnnotationMode] = useState<AnnotationMode>('overview')
  const [annotationsEnabled, setAnnotationsEnabled] = useState(true)
  const [visible, setVisible] = useState<VisibilityState>(() => ({ ...defaultVisibility }))
  const [selectedComponent, setSelectedComponent] = useState<ComponentKey>()
  const [resetSignal, setResetSignal] = useState(0)
  const [viewerSlide, setViewerSlide] = useState<'model' | 'controls'>('model')

  useEffect(() => {
    const media = window.matchMedia('(max-width: 720px)')
    const update = (event: MediaQueryListEvent) => setIsMobile(event.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  const visualRps = playing && explodeAmount < 0.01 ? rpm / 60 * NORMAL_PLAYBACK_RATIO * (slowMotion ? 0.1 : 1) : 0
  const selectedMeta = selectedComponent ? componentMeta[selectedComponent] : undefined
  const visibleCount = (Object.keys(visible) as ComponentKey[]).filter(key => visible[key]).length

  const resetView = () => {
    setCameraMode('hero')
    setZoomLevel(0)
    setAutoOrbit(false)
    setResetSignal(value => value + 1)
  }
  const resetAssembly = () => setExplodeAmount(0)
  const resetCase = () => setCaseOpenAmount(0)
  const selectCamera = (mode: CameraMode) => {
    setCameraMode(mode)
    setZoomLevel(0)
  }
  const toggleVisibility = (key: ComponentKey) => {
    setVisible(previous => ({ ...previous, [key]: !previous[key] }))
    if (selectedComponent === key && visible[key]) setSelectedComponent(undefined)
  }

  useEffect(() => {
    if (selectedComponent && !visible[selectedComponent]) setSelectedComponent(undefined)
  }, [selectedComponent, visible])

  return <div className="engine-stage-app" data-viewer-slide={viewerSlide}>
    <EngineScene
      className="engine-stage-canvas"
      playing={playing}
      rpm={rpm}
      slowMotion={slowMotion}
      exploded={explodeAmount > 0.28}
      explodeAmount={explodeAmount}
      electromagnetic={electromagnetic}
      visible={visible}
      cameraMode={cameraMode}
      annotationMode={annotationMode}
      annotationsEnabled={annotationsEnabled}
      selectedComponent={selectedComponent}
      onSelect={setSelectedComponent}
      cutaway
      casingMode={casingMode}
      caseOpenAmount={caseOpenAmount}
      longitudinalSection={sectionOn}
      autoOrbit={autoOrbit}
      resetSignal={resetSignal}
      modelScaleRef={modelScaleRef}
      modelOffsetYRef={modelOffsetYRef}
      zoomLevel={zoomLevel}
      allowWheelZoom={wheelZoom}
    />

    <div className="engine-view-tabs" role="group" aria-label="Engine viewer slides">
      <button type="button" aria-pressed={viewerSlide === 'model'} aria-controls="engine-model-viewport" onClick={() => setViewerSlide('model')}>01 / MODEL VIEW</button>
      <button type="button" aria-pressed={viewerSlide === 'controls'} aria-controls="engine-control-dock" onClick={() => setViewerSlide('controls')}>02 / SYSTEM CONTROLS</button>
    </div>

    <div className="scroll-rail" aria-hidden="true"><span /></div>
    <div className="hero-copy">
      <p className="eyebrow"><span className="signal-dot" /> POWERTRAIN STUDY / 01</p>
      <h1>DUALFORCE<br /><span>350</span></h1>
      <p className="hero-deck">An inline twin.<br />A dual-energy research concept.</p>
      <a className="text-link" href="3d-engine.html">EXPLORE THE ENGINE <span aria-hidden="true">↗</span></a>
    </div>

    <div className="scroll-caption">
      <span className="eyebrow">348 CC / INLINE-2</span>
      <p>Two energy paths.<br />One provisional powertrain.</p>
    </div>

    <div className="scene-edge-note"><span>REFERENCE-INSPIRED / PROVISIONAL MODEL</span><span>DRAG TO ROTATE</span></div>

    <div id="engine-control-dock" className="engine-control-dock" aria-label="Engine model controls">
      <div className="dock-status">
        <div>
          <span className="dock-label"><i className={playing && electromagnetic ? 'signal-dot is-on' : 'signal-dot'} /> ENGINE SIMULATION</span>
          <span className="dock-cadence"><b>{visualRps.toFixed(2)}</b> <small>VISUAL REV/S</small></span>
        </div>
        <button type="button" className="dock-reset" onClick={resetView} aria-label="Reset camera view">RESET VIEW</button>
      </div>

      <div className="engine-control-groups">
        <details className="control-group" open>
          <summary>VIEW / MOTION</summary>
          <div className="control-group-body">
            <div className="control-row camera-presets" aria-label="Camera presets">
              <span className="control-label">CAMERA</span>
              {(['hero', 'front', 'side', 'detail'] as CameraMode[]).map(mode => <button key={mode} type="button" onClick={() => selectCamera(mode)} aria-pressed={cameraMode === mode}>{mode.toUpperCase()}</button>)}
            </div>
            <div className="control-row">
              <button type="button" onClick={() => setAutoOrbit(value => !value)} aria-pressed={autoOrbit}>AUTO-ORBIT</button>
              <button type="button" onClick={() => setWheelZoom(value => !value)} aria-pressed={wheelZoom} aria-label="Toggle wheel zoom mode">WHEEL ZOOM</button>
              <div className="zoom-actions" aria-label="Camera zoom controls">
                <button type="button" onClick={() => setZoomLevel(value => value - 1)} aria-label="Zoom out">−</button>
                <button type="button" onClick={() => setZoomLevel(value => value + 1)} aria-label="Zoom in">+</button>
              </div>
            </div>
            <p className="control-help">{wheelZoom ? 'Wheel controls the camera; turn this off to return the wheel to page scroll.' : 'Wheel scrolls the page; drag to rotate and pinch to zoom.'}</p>
            <div className="control-row">
              <button type="button" className="control-main" onClick={() => setPlaying(value => !value)} aria-pressed={playing}>{playing ? 'PAUSE' : 'PLAY'}</button>
              <button type="button" onClick={() => setSlowMotion(value => !value)} aria-pressed={slowMotion}>10% SLOW</button>
              <div className="rpm-row">
                <label htmlFor="rpm-reference">RPM reference <output htmlFor="rpm-reference">{rpm.toLocaleString('en-US')}</output></label>
                <input id="rpm-reference" type="range" min="400" max="7200" step="100" value={rpm} onChange={event => setRpm(Number(event.currentTarget.value))} aria-label="RPM reference, visual cadence only" />
                <span className="rpm-hint">400–7,200 / visual cadence only</span>
              </div>
            </div>
          </div>
        </details>

        <details className="control-group">
          <summary>ASSEMBLY / CASING</summary>
          <div className="control-group-body">
            <div className="slider-row">
              <label htmlFor="explode-amount">EXPLODE <output htmlFor="explode-amount">{Math.round(explodeAmount * 100)}%</output></label>
              <input id="explode-amount" type="range" min="0" max="1" step="0.01" value={explodeAmount} onChange={event => setExplodeAmount(Number(event.currentTarget.value))} aria-label="Continuous exploded assembly amount" />
              <div className="control-row"><button type="button" onClick={() => setExplodeAmount(0)} aria-pressed={explodeAmount < 0.01}>ASSEMBLED</button><button type="button" onClick={() => setExplodeAmount(1)} aria-pressed={explodeAmount > 0.99}>EXPLODED</button><button type="button" onClick={resetAssembly}>RESET ASSEMBLY</button></div>
            </div>
            <div className="slider-row">
              <label htmlFor="case-opening">CASE OPENING <output htmlFor="case-opening">{Math.round(caseOpenAmount * 100)}%</output></label>
              <input id="case-opening" type="range" min="0" max="1" step="0.01" value={caseOpenAmount} onChange={event => setCaseOpenAmount(Number(event.currentTarget.value))} aria-label="Continuous longitudinal casing opening amount" />
              <div className="control-row"><button type="button" onClick={resetCase} aria-pressed={caseOpenAmount < 0.01}>CLOSED</button><button type="button" onClick={() => setCaseOpenAmount(1)} aria-pressed={caseOpenAmount > 0.99}>OPEN</button></div>
            </div>
            <div className="control-row option-row" aria-label="Casing appearance">
              <span className="control-label">CASING</span>
              <button type="button" onClick={() => setCasingMode('solid')} aria-pressed={casingMode === 'solid'}>SOLID</button>
              <button type="button" onClick={() => setCasingMode('transparent')} aria-pressed={casingMode === 'transparent'}>TRANSPARENT</button>
              <button type="button" onClick={() => setSectionOn(value => !value)} aria-pressed={sectionOn}>LONGITUDINAL SECTION</button>
            </div>
          </div>
        </details>

        <details className="control-group">
          <summary>ANNOTATIONS / COMPONENTS</summary>
          <div className="control-group-body">
            <div className="control-row option-row">
              <button type="button" onClick={() => setAnnotationsEnabled(value => !value)} aria-pressed={annotationsEnabled}>ANNOTATIONS</button>
              {(['overview', 'detailed', 'exploded'] as AnnotationMode[]).map(mode => <button key={mode} type="button" onClick={() => setAnnotationMode(mode)} aria-pressed={annotationMode === mode}>{mode.toUpperCase()}</button>)}
            </div>
            <div className="selected-readout" role="status" aria-live="polite">
              <span>SELECTED COMPONENT</span>
              <strong>{selectedMeta?.label ?? 'None — click a projected label or model part'}</strong>
              {selectedMeta && <small>{selectedMeta.description}</small>}
            </div>
            <div className="visibility-heading"><span>VISIBLE COMPONENTS</span><output>{visibleCount} / 8</output></div>
            <div className="visibility-grid" aria-label="Component visibility">
              {(Object.keys(visibilityLabels) as ComponentKey[]).map(key => <button key={key} type="button" onClick={() => toggleVisibility(key)} aria-pressed={visible[key]} aria-label={`${visibilityLabels[key]} visibility`}>{visible[key] ? '●' : '○'} {visibilityLabels[key]}</button>)}
            </div>
            <div className="control-row">
              <button type="button" onClick={() => setElectromagnetic(value => !value)} aria-pressed={electromagnetic}>COIL ACTIVITY</button>
              <span className="control-help inline-help">Copper activity is a proposed visual layer.</span>
            </div>
          </div>
        </details>
      </div>
    </div>

    <div className="scroll-cue" aria-hidden="true"><span>SCROLL TO REVEAL</span><i /></div>
  </div>
}

const host = document.getElementById('engine-viewer-root')
if (host) createRoot(host).render(<StandaloneViewer />)
