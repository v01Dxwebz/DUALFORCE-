import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { createMechanicalEngine, type ComponentKey } from './model'
import { advanceShaftPhase, INSPECTION_RATE, NORMAL_PLAYBACK_RATIO, rpmToVisualAngularVelocity } from './motion'

export type { ComponentKey } from './model'
export type CameraMode = 'hero' | 'front' | 'side' | 'detail'
export type AnnotationMode = 'overview' | 'detailed' | 'exploded'
export type VisibilityState = Record<ComponentKey, boolean>
export type CasingMode = 'solid' | 'transparent'

export const defaultVisibility: VisibilityState = {
  casing: true, frame: true, cylinders: true, pistons: true, rods: true, crank: true, stator: true, magnets: true,
}
export const componentMeta: Record<ComponentKey, { label: string; description: string }> = {
  casing: { label: 'Lower aluminium crankcase', description: 'Closed lower case ends beneath the exposed twin coils; inspect its long side by swinging open the shaft-parallel access door.' },
  frame: { label: 'Internal support frame', description: 'Silver cross-plates, vertical tie rods, diagonal braces, bolted pedestals and fixed bearing housings.' },
  cylinders: { label: 'Twin cylinder pack', description: 'Close-set inline bores, annular end caps and bolted mounting deck, reconstructed from the reference views.' },
  pistons: { label: '4032 aluminium pistons', description: 'Ringed piston skirts, wrist pins and ceramic-coated crowns follow a fixed-length slider-crank demonstration.' },
  rods: { label: 'Forged 4340 rods', description: 'Detailed small-end and bolted big-end assemblies remain connected to their piston and crank pins without stretching.' },
  crank: { label: 'Crank / flywheel / bearings', description: 'Machined silver flywheel, crank webs, journals and bearing assemblies. Housings stay fixed; shaft and inner races rotate.' },
  stator: { label: 'Copper stator windings', description: 'Continuous closely packed copper helices, brass bobbin caps, retention rods and routed leads; electromagnetic operation remains proposed.' },
  magnets: { label: 'Magnetic elements', description: 'Piston-associated magnetic teeth are a provisional visual layer, not confirmed alignment or magnetic-force validation.' },
}

const cameraPresets: Record<CameraMode, [number, number, number]> = {
  hero: [1.35, 1.65, 7.35], front: [0, 0.95, 7.2], side: [7.4, 1.1, 0.2], detail: [3.4, 2.2, 5.1],
}
const labels: { key: ComponentKey; text: string; detail: string; mode: AnnotationMode; point: [number, number, number] }[] = [
  { key: 'stator', text: 'CONTINUOUS COPPER WINDING', detail: 'Tightly packed helix / brass bobbin', mode: 'overview', point: [-0.64, 0.85, 0.46] },
  { key: 'crank', text: 'MACHINED FLYWHEEL', detail: 'Silver face / shared output shaft', mode: 'overview', point: [1.68, -0.45, 0.3] },
  { key: 'casing', text: 'LOWER CRANKCASE', detail: 'Full case / lengthwise opening', mode: 'overview', point: [1.28, -0.6, 0.6] },
  { key: 'cylinders', text: 'TWIN BORE / MOUNTING DECK', detail: 'Reference-based / not production CAD', mode: 'detailed', point: [0.64, 0.27, 0.48] },
  { key: 'pistons', text: 'PISTON / WRIST PIN', detail: 'Fixed-length slider-crank travel', mode: 'detailed', point: [0.64, 0.6, 0.22] },
  { key: 'rods', text: 'BOLTED CONNECTING ROD', detail: 'No elastic scaling / connected pins', mode: 'detailed', point: [0.64, -0.1, 0.22] },
  { key: 'frame', text: 'FIXED BEARING PEDESTAL', detail: 'Rigid support / stationary outer race', mode: 'detailed', point: [0.34, -0.45, 0.22] },
  { key: 'crank', text: 'ROTATING INNER RACE', detail: 'Shaft-mounted rolling assembly', mode: 'detailed', point: [0.34, -0.45, 0.14] },
  { key: 'stator', text: 'BOBBIN / ROUTED COPPER LEAD', detail: 'No unsupported electrical rating', mode: 'exploded', point: [0.64, 1.13, 0.47] },
  { key: 'magnets', text: 'MAGNETIC TEETH', detail: 'Proposed piston-associated element', mode: 'exploded', point: [-0.64, 0.58, 0.37] },
]

type NumericRef = { current: number }

type EngineSceneProps = {
  className?: string; autoOrbit?: boolean; playing: boolean; rpm: number;
  exploded: boolean; explodeAmount: number; electromagnetic: boolean;
  visible: VisibilityState; cameraMode: CameraMode; annotationMode?: AnnotationMode;
  annotationsEnabled?: boolean; selectedComponent?: ComponentKey; cutaway?: boolean;
  casingMode?: CasingMode; caseOpenAmount?: number; longitudinalSection?: boolean; slowMotion?: boolean;
  resetSignal?: number; onSelect?: (component: ComponentKey) => void;
  modelScale?: number; modelScaleRef?: NumericRef; modelOffsetX?: number; modelOffsetY?: number; modelOffsetYRef?: NumericRef; zoomLevel?: number; allowWheelZoom?: boolean;
}

export default function EngineScene(props: EngineSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const labelRefs = useRef<(HTMLButtonElement | null)[]>([])
  const activityRefs = useRef<(HTMLElement | null)[]>([])
  const stateRef = useRef(props)
  const [status, setStatus] = useState<'loading' | 'ready' | 'unavailable'>('loading')
  useEffect(() => { stateRef.current = props })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' })
    } catch {
      setStatus('unavailable')
      return
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 0.94
    renderer.localClippingEnabled = true
    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#e8ece7')
    const pmrem = new THREE.PMREMGenerator(renderer)
    const room = new RoomEnvironment()
    const environment = pmrem.fromScene(room, 0.025)
    scene.environment = environment.texture
    scene.environmentIntensity = 0.72
    room.dispose()
    pmrem.dispose()
    const key = new THREE.DirectionalLight(0xfff4e5, 2.5)
    key.position.set(-3, 6, 5)
    scene.add(key)
    const fill = new THREE.DirectionalLight(0xdce5ef, 1.25)
    fill.position.set(4, 2, -4)
    scene.add(fill, new THREE.HemisphereLight(0xffffff, 0x73777b, 0.9))
    const root = new THREE.Group()
    scene.add(root)
    const model = createMechanicalEngine(root)
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 60)
    camera.position.set(...cameraPresets[stateRef.current.cameraMode])
    const orbit = new OrbitControls(camera, canvas)
    canvas.style.touchAction = 'pan-y'
    orbit.target.set(0, 0.12, 0)
    orbit.enableDamping = true
    orbit.dampingFactor = 0.075
    orbit.enablePan = false
    orbit.minDistance = 3.8
    orbit.maxDistance = 12
    orbit.autoRotateSpeed = 0.4
    orbit.zoomSpeed = 0.75
    orbit.update()
    const resize = () => {
      const width = Math.max(canvas.clientWidth, 1)
      const height = Math.max(canvas.clientHeight, 1)
      renderer.setSize(width, height, false)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
    }
    const sizeObserver = new ResizeObserver(resize)
    sizeObserver.observe(canvas)
    resize()
    let inViewport = true
    let pageHidden = document.hidden
    let frame = 0
    let previousTime = 0
    const canRender = () => inViewport && !pageHidden
    const cancelLoop = () => {
      if (frame) cancelAnimationFrame(frame)
      frame = 0
    }
    let render: (time: number) => void
    const schedule = () => {
      if (canRender() && !frame) frame = requestAnimationFrame(render)
    }
    const resumeLoop = () => {
      if (!canRender()) return
      previousTime = performance.now()
      schedule()
    }
    const pauseLoop = () => {
      cancelLoop()
      previousTime = 0
    }
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      inViewport = entry.isIntersecting
      if (inViewport) resumeLoop(); else pauseLoop()
    }, { rootMargin: '0px' })
    intersectionObserver.observe(canvas)
    const onVisibilityChange = () => {
      pageHidden = document.hidden
      if (pageHidden) pauseLoop(); else resumeLoop()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    const raycaster = new THREE.Raycaster()
    const pointer = new THREE.Vector2()
    const getComponent = (object: THREE.Object3D): ComponentKey | undefined => {
      let current: THREE.Object3D | null = object
      let component: ComponentKey | undefined
      while (current && current !== root) {
        if (!current.visible) return undefined
        component ??= current.userData.component as ComponentKey | undefined
        current = current.parent
      }
      return component
    }
    let pointerStart = { x: 0, y: 0 }
    const onPointerDown = (event: PointerEvent) => { pointerStart = { x: event.clientX, y: event.clientY } }
    const onPointerUp = (event: PointerEvent) => {
      if (Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) > 5) return
      const bounds = canvas.getBoundingClientRect()
      pointer.set((event.clientX - bounds.left) / bounds.width * 2 - 1, -(event.clientY - bounds.top) / bounds.height * 2 + 1)
      raycaster.setFromCamera(pointer, camera)
      for (const hit of raycaster.intersectObjects(root.children, true)) {
        const component = getComponent(hit.object)
        if (!component || (component === 'casing' && stateRef.current.cutaway)) continue
        stateRef.current.onSelect?.(component)
        break
      }
    }
    // OrbitControls uses one enableZoom switch for wheel and pinch. Keep its
    // pinch path available, while capture-blocking only wheel handling when
    // the user has deliberately returned the wheel to page scrolling.
    const onWheelMode = (event: WheelEvent) => {
      if (!stateRef.current.allowWheelZoom) event.stopImmediatePropagation()
    }
    canvas.addEventListener('pointerdown', onPointerDown)
    canvas.addEventListener('pointerup', onPointerUp)
    canvas.addEventListener('wheel', onWheelMode, { capture: true, passive: true })
    const onContextLost = (event: Event) => { event.preventDefault(); pauseLoop(); setStatus('unavailable') }
    canvas.addEventListener('webglcontextlost', onContextLost)
    let phase = 0
    let smoothExplode = 0
    let smoothCaseOpen = 0
    let previousMode = stateRef.current.cameraMode
    let previousReset = stateRef.current.resetSignal
    let previousZoomLevel = stateRef.current.zoomLevel ?? 0
    let loaded = false
    const point = new THREE.Vector3()
    render = (time: number) => {
      frame = 0
      if (!canRender()) { previousTime = 0; return }
      const wallElapsed = previousTime ? Math.max((time - previousTime) / 1000, 0) : 0
      const cameraElapsed = Math.min(wallElapsed, 0.05)
      const transitionElapsed = Math.min(wallElapsed, 0.25)
      previousTime = time
      const state = stateRef.current
      const rate = state.slowMotion ? INSPECTION_RATE : 1
      const running = state.playing && state.explodeAmount < 0.01 && smoothExplode < 0.01
      if (running) phase = advanceShaftPhase(phase, state.rpm, wallElapsed, rate)
      smoothExplode = THREE.MathUtils.damp(smoothExplode, state.explodeAmount, 8, transitionElapsed)
      smoothCaseOpen = THREE.MathUtils.damp(smoothCaseOpen, state.caseOpenAmount ?? 0, 14, transitionElapsed)
      if (Math.abs(smoothCaseOpen - (state.caseOpenAmount ?? 0)) < 0.005) smoothCaseOpen = state.caseOpenAmount ?? 0
      root.scale.setScalar(THREE.MathUtils.clamp(state.modelScaleRef?.current ?? state.modelScale ?? 1, 0.1, 1.2))
      root.position.set(state.modelOffsetX ?? 0, state.modelOffsetYRef?.current ?? state.modelOffsetY ?? 0, 0)
      model.update({ phase, explodeAmount: smoothExplode, electromagnetic: state.electromagnetic, visible: state.visible, cutaway: state.cutaway ?? false, casingMode: state.casingMode, selectedComponent: state.selectedComponent, caseOpenAmount: smoothCaseOpen, longitudinalSection: state.longitudinalSection, visualAngularVelocity: running ? rpmToVisualAngularVelocity(state.rpm, rate) : 0 })
      canvas.dataset.shaftPhase = phase.toFixed(6)
      canvas.dataset.targetRpm = state.rpm.toFixed(0)
      canvas.dataset.visualRps = (running ? state.rpm / 60 * NORMAL_PLAYBACK_RATIO * rate : 0).toFixed(3)
      canvas.dataset.animationPlaying = String(running)
      canvas.dataset.modelScale = root.scale.x.toFixed(3)
      canvas.dataset.caseOpening = smoothCaseOpen.toFixed(3)
      canvas.dataset.longitudinalSection = String(Boolean(state.longitudinalSection))
      const activity = model.groups.stator.userData.coilActivity as number[]
      canvas.dataset.coilActivity = activity.map(value => value.toFixed(3)).join(',')
      activityRefs.current.forEach((element, index) => {
        if (element) element.style.opacity = String(0.12 + activity[index] * 0.88)
      })
      if (state.cameraMode !== previousMode || state.resetSignal !== previousReset) {
        orbit.reset()
        camera.position.set(...cameraPresets[state.cameraMode])
        orbit.target.set(0, 0.12, 0)
        previousMode = state.cameraMode
        previousReset = state.resetSignal
        previousZoomLevel = state.zoomLevel ?? 0
      } else if ((state.zoomLevel ?? 0) !== previousZoomLevel) {
        const zoomDelta = (state.zoomLevel ?? 0) - previousZoomLevel
        const direction = camera.position.clone().sub(orbit.target).normalize()
        const distance = THREE.MathUtils.clamp(orbit.getDistance() * Math.pow(0.88, zoomDelta), orbit.minDistance, orbit.maxDistance)
        camera.position.copy(orbit.target).addScaledVector(direction, distance)
        previousZoomLevel = state.zoomLevel ?? 0
      }
      orbit.enableZoom = true
      orbit.autoRotate = state.autoOrbit ?? false
      orbit.update(cameraElapsed)
      canvas.dataset.viewDistance = orbit.getDistance().toFixed(4)
      root.updateMatrixWorld(true)
      labels.forEach((label, index) => {
        const element = labelRefs.current[index]
        if (!element) return
        const mode = state.annotationMode ?? 'overview'
        const allowed = mode === 'overview' ? label.mode === 'overview' : mode === 'detailed' ? label.mode !== 'exploded' : smoothExplode > 0.1
        const group = model.groups[label.key]
        point.set(...label.point)
        group.localToWorld(point)
        point.project(camera)
        const x = (point.x + 1) * canvas.clientWidth * 0.5
        const y = (1 - point.y) * canvas.clientHeight * 0.5
        const visible = state.annotationsEnabled !== false && allowed && group.visible && point.z > -1 && point.z < 1 && x > 10 && y > 24 && y < canvas.clientHeight - 25
        element.style.opacity = visible ? '1' : '0'
        element.style.pointerEvents = visible ? 'auto' : 'none'
        element.style.transform = `translate3d(${Math.min(x, Math.max(12, canvas.clientWidth - 188))}px, ${y}px, 0)`
        element.classList.toggle('is-selected', state.selectedComponent === label.key)
        element.setAttribute('aria-hidden', String(!visible))
        element.tabIndex = visible ? 0 : -1
      })
      renderer.render(scene, camera)
      if (!loaded) { loaded = true; setStatus('ready') }
      schedule()
    }
    resumeLoop()
    return () => {
      pauseLoop()
      sizeObserver.disconnect()
      intersectionObserver.disconnect()
      document.removeEventListener('visibilitychange', onVisibilityChange)
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointerup', onPointerUp)
      canvas.removeEventListener('wheel', onWheelMode, { capture: true })
      canvas.removeEventListener('webglcontextlost', onContextLost)
      orbit.dispose()
      model.dispose()
      environment.dispose()
      renderer.dispose()
    }
  }, [])

  return <div className={`engine-canvas-shell ${props.className ?? ''}`}>
    <canvas ref={canvasRef} aria-label="Reference-inspired inline-twin engine; drag to rotate, use plus and minus to zoom, pinch to zoom, and use wheel zoom mode when enabled" />
    {status === 'loading' && <div className="engine-loading" role="status">Preparing mechanical assembly…</div>}
    {status === 'unavailable' && <div className="engine-fallback" role="status"><strong>3D rendering unavailable</strong><p>This device could not start WebGL. The documented component and specification sections remain available below.</p></div>}
    <div className="engineering-label-layer" aria-label="Engineering annotations">
      {labels.map((label, index) => <button key={label.text} ref={(element) => { labelRefs.current[index] = element }} className="engineering-label" onClick={() => stateRef.current.onSelect?.(label.key)} aria-label={`${label.text}: ${label.detail}`} aria-pressed={props.selectedComponent === label.key}><span className="label-anchor-dot" /><span className="label-copy"><b>{label.text}</b><small>{label.detail}</small></span></button>)}
    </div>
    {!props.autoOrbit && <div className="coil-activity-readout" aria-label="Per-cylinder upstroke activity"><span><i ref={element => { activityRefs.current[0] = element }} /> CYL 01 / UPSTROKE</span><span><i ref={element => { activityRefs.current[1] = element }} /> CYL 02 / UPSTROKE</span></div>}
  </div>
}
