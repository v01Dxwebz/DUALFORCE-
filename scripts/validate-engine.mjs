import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import * as THREE from 'three'

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const legacyEngineSource = await fs.readFile(path.join(project, 'dualforce-3d-engine.js'), 'utf8')
const legacyLabSource = await fs.readFile(path.join(project, '3d-engine.html'), 'utf8')
const integratedModelSource = await fs.readFile(path.join(project, 'src/engine/model.ts'), 'utf8')
const integratedViewerSource = await fs.readFile(path.join(project, 'src/engine/StandaloneViewer.tsx'), 'utf8')
const integratedSceneSource = await fs.readFile(path.join(project, 'src/engine/EngineScene.tsx'), 'utf8')
const homepageSource = await fs.readFile(path.join(project, 'index.html'), 'utf8')
const sharedThemeSource = await fs.readFile(path.join(project, 'assets/dualforce-premium-theme.css'), 'utf8')
const integratedStylesSource = await fs.readFile(path.join(project, 'assets/engine-integration.css'), 'utf8')
const temporary = await fs.mkdtemp(path.join(project, 'node_modules/.tmp-engine-validation-'))
try {
  execFileSync('pnpm', [
    'exec', 'tsc', 'src/engine/kinematics.ts', 'src/engine/model.ts', 'src/engine/motion.ts',
    '--outDir', temporary, '--ignoreConfig', '--target', 'ES2022',
    '--module', 'NodeNext', '--moduleResolution', 'NodeNext', '--skipLibCheck', '--strict',
  ], { cwd: project, stdio: 'inherit' })
  const load = name => import(pathToFileURL(path.join(temporary, name + '.js')).href)
  const { createMechanicalEngine } = await load('model')
  const { SLIDER_CRANK_CONFIGURATION: config, solveSliderCrank } = await load('kinematics')
  const { rpmToAngularVelocity, rpmToVisualAngularVelocity, advanceShaftPhase, coilUpstrokeActivity, NORMAL_PLAYBACK_RATIO, INSPECTION_RATE } = await load('motion')
  assert.equal(rpmToAngularVelocity, rpmToVisualAngularVelocity, 'Legacy HMR export must remain compatible')
  const root = new THREE.Group()
  const model = createMechanicalEngine(root)
  assert.equal(root.getObjectByName('large-shaft-gear'), undefined, 'Crankshaft gear must be removed')
  assert.equal(root.getObjectByName('small-counter-gear'), undefined, 'Countershaft gear must be removed with its pair')
  assert.doesNotMatch(legacyEngineSource, /createGear|pinionGear|drive gear|gear rotation|sync drive gears/i, 'Legacy 3D lab must not construct or label crankshaft gears')
  assert.match(legacyEngineSource, /frame: new THREE\.Group\(\)/, 'Legacy lab must expose a real support-frame group')
  assert.match(legacyEngineSource, /min="400" max="7200" step="100"/, 'Legacy lab simulated RPM range must span 400–7,200 in 100-RPM steps')
  assert.match(legacyEngineSource, /df3d-compact-slider df3d-rpm-slider" min="400" max="7200" step="100"/, 'Compact legacy RPM control must share the 400-RPM floor')
  for (const marker of ['df3d-reset-assembly', 'df3d-reset-camera', 'df3d-annotation-mode-btn', 'df3d-component-btn', 'pinchStartDistance', 'df3d-wheel-zoom-toggle']) {
    assert.ok(legacyEngineSource.includes(marker), `Legacy lab is missing its ${marker} control path`)
  }
  for (const key of ['casing', 'frame', 'cylinders', 'pistons', 'rods', 'crank', 'stator', 'magnets']) {
    assert.ok(legacyEngineSource.includes("{ key: '" + key + "'"), `Legacy component visibility control missing: ${key}`)
  }
  assert.match(legacyLabSource, /theme:\s*'light'/, 'Legacy lab controls must use the reference light surface')
  assert.match(legacyLabSource, /stageTheme:\s*'dark'/, 'Legacy lab engine stage must remain graphite')
  assert.match(legacyLabSource, /data-lab-slide-target="model"/, 'Standalone lab must offer a dedicated model slide')
  assert.match(legacyLabSource, /data-lab-slide-target="controls"/, 'Standalone lab must offer a separate controls slide')
  assert.match(legacyLabSource, /container\.setAttribute\('data-lab-slide', slide\)/, 'Standalone lab slide buttons must update the real viewer state')
  assert.match(integratedViewerSource, /data-viewer-slide=\{viewerSlide\}/, 'Appended viewer must track its active slide')
  assert.match(integratedViewerSource, /aria-controls="engine-model-viewport"/, 'Model slide tab must point to the model region')
  assert.match(integratedViewerSource, /aria-controls="engine-control-dock"/, 'Settings slide tab must point to the controls region')
  assert.match(integratedStylesSource, /engine-stage-app\[data-viewer-slide="model"\] #engine-control-dock \{ display: none; \}/, 'Model slide must not show the settings dock')
  assert.match(integratedStylesSource, /engine-stage-app\[data-viewer-slide="controls"\] #engine-control-dock/, 'Settings slide must show the full controls surface')
  assert.match(sharedThemeSource, /#dualforce-main-viewer\[data-lab-slide="model"\]\.df3d-container/, 'Standalone model slide must receive the full stage layout')
  assert.match(sharedThemeSource, /#dualforce-main-viewer\[data-lab-slide="controls"\] \.df3d-controls-panel/, 'Standalone settings must occupy its own slide')
  assert.match(homepageSource, /id="slide-10"/, 'Original finance slide 10 must remain present')
  assert.match(homepageSource, /₹1,39,200/, 'Original finance figure must remain unchanged')
  assert.match(sharedThemeSource, /#slide-10 \.calc \.calc-row \{ color: #edf1ee/, 'Finance calculator row copy must have light-on-dark contrast')
  assert.match(sharedThemeSource, /#slide-10 \.roadmap \.rm \.t \{ color: var\(--df-ink\)/, 'Roadmap amounts must have dark-on-light contrast')
  assert.match(sharedThemeSource, /body:has\(#deck\) \.tech \{ grid-template-columns: minmax\(0, 1fr\); min-width: 0; \}/, 'Original technical slide content must shrink instead of overflowing on phones')
  assert.match(sharedThemeSource, /body:has\(#deck\) \.steps \.step > :not\(\.num\) \{ min-width: 0; overflow-wrap: anywhere; \}/, 'Long technical descriptions must remain readable within the mobile slide width')
  assert.match(sharedThemeSource, /body:has\(#deck\) #slide-4 \.sim-mode-pills \{ width: 100%; max-width: 100%; flex-wrap: wrap; gap: \.4rem; \}/, 'Original simulator mode controls must wrap within the narrow slide width')
  assert.match(integratedModelSource, /groups\.magnets\.visible\s*=\s*state\.visible\.magnets\s*;/, 'Magnetic elements must be controlled by their own visibility option')
  assert.doesNotMatch(integratedModelSource, /groups\.magnets\.visible\s*=.*state\.electromagnetic/, 'Concept-layer toggle must not hide the magnetic-elements group')
  assert.doesNotMatch(integratedViewerSource, /key\s*!==\s*'magnets'\s*\|\|\s*electromagnetic/, 'Magnetic-element count must not depend on the concept-layer toggle')
  assert.doesNotMatch(integratedViewerSource, /selectedComponent === 'magnets'\s*&&\s*!electromagnetic/, 'Selected magnetic elements must remain selected when only the concept layer is hidden')
  assert.doesNotMatch(integratedSceneSource, /component === 'casing'\s*&&\s*stateRef\.current\.cutaway/, 'Transparent/cutaway casing must remain selectable')
  const visible = Object.fromEntries(Object.keys(model.groups).map(key => [key, true]))
  const state = { phase: 0, explodeAmount: 0, electromagnetic: true, visible, cutaway: false, caseOpenAmount: 0, longitudinalSection: false, visualAngularVelocity: rpmToVisualAngularVelocity(2800) }
  const rods = ['rod-front', 'rod-rear'].map(name => root.getObjectByName(name))
  const throws = ['crank-throw-front', 'crank-throw-rear'].map(name => root.getObjectByName(name))
  const pinMeshes = throws.map(group => group.children.find(child => child.isMesh && Math.abs(child.position.x) < 1e-10 && Math.abs(child.position.y - config.crankRadius) < 1e-10))
  assert.ok(rods.every(Boolean) && pinMeshes.every(Boolean))
  let maximumEndpointError = 0
  let maximumLengthError = 0
  let triangles = 0
  root.traverse(object => { if (object.isMesh) triangles += (object.geometry.index?.count ?? object.geometry.attributes.position.count) / 3 })
  for (let step = 0; step < 3600; step++) {
    state.phase = Math.PI * 2 * step / 3600
    model.update(state)
    root.updateMatrixWorld(true)
    rods.forEach((rod, index) => {
      const solution = solveSliderCrank(state.phase + index * config.phaseOffset)
      const end = rod.localToWorld(new THREE.Vector3(0, -config.rodLength, 0))
      const pin = pinMeshes[index].getWorldPosition(new THREE.Vector3())
      const start = rod.localToWorld(new THREE.Vector3())
      const piston = model.groups.pistons.children[index].getWorldPosition(new THREE.Vector3())
      maximumEndpointError = Math.max(maximumEndpointError, end.distanceTo(pin), start.distanceTo(piston))
      maximumLengthError = Math.max(maximumLengthError, Math.abs(start.distanceTo(end) - config.rodLength))
      assert.ok(solution.isValid)
      assert.deepEqual(rod.scale.toArray(), [1, 1, 1], 'Rod must not stretch')
      const dy = solveSliderCrank(solution.theta + 1e-5).pistonY - solveSliderCrank(solution.theta - 1e-5).pistonY
      const glow = model.groups.stator.userData.coilActivity[index]
      if (dy > 1e-7) assert.ok(glow > 0, 'Upstroke must light its own coil')
      if (dy < -1e-7) assert.equal(glow, 0, 'Downstroke must not light the coil')
    })
  }
  assert.ok(maximumEndpointError < 1e-10 && maximumLengthError < 1e-10)
  for (const [key, group] of Object.entries(model.groups)) {
    assert.ok(group.children.length)
    visible[key] = false; model.update(state); assert.equal(group.visible, false)
    visible[key] = true; model.update(state); assert.equal(group.visible, true)
    group.traverse(object => assert.equal(object.userData.component, key))
  }
  const casing = model.groups.casing
  const bounds = new THREE.Box3().setFromObject(casing)
  assert.ok(bounds.max.y < 0.325, `Case covers coils: top ${bounds.max.y}`)
  const raycaster = new THREE.Raycaster()
  const casingMeshes = []
  casing.traverse(object => { if (object.isMesh) casingMeshes.push(object) })
  const hits = (origin, direction, targets = casingMeshes) => {
    root.updateMatrixWorld(true)
    raycaster.set(new THREE.Vector3(...origin), new THREE.Vector3(...direction))
    return raycaster.intersectObjects(targets, false)
  }
  for (const direction of [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]]) {
    assert.ok(hits([0,-0.86,0.25], direction).length, `Closed housing missing wall ${direction}`)
  }
  const endPlates = casingMeshes.filter(mesh => mesh.name.includes('end-half-plate'))
  assert.equal(hits([-2,-0.45,0],[1,0,0], endPlates).length, 0, 'Case plates obstruct shaft axis')
  const topLids = ['fixed-rear-crankcase-lid-half', 'hinged-front-crankcase-lid-half'].map(name => root.getObjectByName(name))
  assert.ok(topLids.every(Boolean), 'Both lid halves must exist')
  const deck = root.getObjectByName('internal-mounting-deck-with-open-bores')
  for (const x of config.cylinderCentersX) {
    assert.equal(hits([x,2,0],[0,-1,0], [...topLids,deck]).length, 0, 'Lid/deck obstruct cylinder bore')
    assert.equal(hits([x+0.40,2,0],[0,-1,0], topLids).length, 0, 'Door lid must clear brass bobbin flange')
  }
  const door = root.getObjectByName('lengthwise-case-door')
  const fixed = root.getObjectByName('fixed-rear-crankcase')
  const fixedBefore = fixed.matrixWorld.clone()
  const lidBefore = topLids[1].getWorldPosition(new THREE.Vector3())
  const xPointBefore = door.localToWorld(new THREE.Vector3(0.8,0.8,-0.4)).x
  state.caseOpenAmount = 1; model.update(state); root.updateMatrixWorld(true)
  assert.ok(Math.abs(door.rotation.x) > 1, 'Door never opens')
  assert.ok(topLids[1].getWorldPosition(new THREE.Vector3()).distanceTo(lidBefore) > 1)
  assert.deepEqual(fixed.matrixWorld.elements, fixedBefore.elements, 'Rear half must stay fixed')
  assert.ok(Math.abs(door.localToWorld(new THREE.Vector3(0.8,0.8,-0.4)).x - xPointBefore) < 1e-10, 'Opening is transverse, not shaft-parallel')
  state.caseOpenAmount = 0; model.update(state); assert.ok(Math.abs(door.rotation.x) < 1e-12)
  state.casingMode = 'transparent'; model.update(state)
  casing.traverse(object => { if (object.isMesh) assert.ok(object.material.opacity < 0.25 && !object.material.depthWrite) })
  model.groups.frame.traverse(object => { if (object.isMesh) assert.equal(object.material.opacity,1) })
  model.groups.cylinders.traverse(object => { if (object.isMesh && object.material.transparent) assert.equal(object.material.opacity,0.64,'Housing toggle must not fade cylinder liners') })
  state.casingMode = 'solid'; model.update(state)
  casing.traverse(object => { if (object.isMesh) assert.ok(object.material.opacity === 1 && object.material.depthWrite) })
  state.longitudinalSection = true; model.update(state)
  const section = rods[0].children.find(object => object.isMesh).material.clippingPlanes[0]
  assert.deepEqual(section.normal.toArray(),[0,0,-1], 'Section must cut width, preserving engine length')
  assert.equal(section.distanceToPoint(new THREE.Vector3(5,0,0)),0)
  state.longitudinalSection = false; model.update(state)
  assert.equal(rods[0].children.find(object => object.isMesh).material.clippingPlanes,null)
  const lamps = ['coil-upstroke-light-front','coil-upstroke-light-rear'].map(name => root.getObjectByName(name))
  state.phase = Math.PI * 1.5; model.update(state)
  assert.ok(lamps[0].intensity > 4 && lamps[1].intensity === 0)
  state.phase = Math.PI * 0.5; model.update(state)
  assert.ok(lamps[1].intensity > 4 && lamps[0].intensity === 0)
  state.electromagnetic = false; model.update(state); assert.deepEqual(lamps.map(light => light.intensity),[0,0])
  assert.equal(model.groups.magnets.visible,true,'Hiding electromagnetic interaction must not hide magnetic elements')
  state.electromagnetic = true; state.visualAngularVelocity = 0; model.update(state)
  assert.deepEqual(lamps.map(light => light.intensity),[0,0], 'Pause must extinguish activity')
  for (const rpm of [400,2800,7200]) {
    let phase = 0
    for (const dt of [0.007,0.021,0.04,0.132,0.3,0.5]) phase = advanceShaftPhase(phase,rpm,dt)
    assert.ok(Math.abs(phase / (2*Math.PI) - rpm/60*NORMAL_PLAYBACK_RATIO) < 1e-10, 'Visual RPM mapping is incorrect')
  }
  assert.ok(Math.abs(advanceShaftPhase(0,2800,1)/(2*Math.PI) - 0.56) < 1e-10)
  assert.ok(Math.abs(advanceShaftPhase(0,400,1)/(2*Math.PI) - 0.08) < 1e-10)
  assert.ok(Math.abs(advanceShaftPhase(0,2800,1,INSPECTION_RATE)/(2*Math.PI) - 0.056) < 1e-10)
  assert.ok(coilUpstrokeActivity(1.5*Math.PI) > 0.99)
  state.visualAngularVelocity = rpmToVisualAngularVelocity(2800); state.explodeAmount = 1; model.update(state)
  const held = rods[0].position.clone(); state.phase += 3; model.update(state)
  assert.deepEqual(rods[0].position.toArray(),held.toArray(),'Exploded assembly must hold')
  assert.ok(triangles < 200000)
  model.dispose(); model.dispose(); assert.equal(root.children.length,0)
  console.log(JSON.stringify({phases:3600,cylinders:2,maximumEndpointError,maximumLengthError,triangles,componentGroups:Object.keys(visible).length,caseTop:bounds.max.y,housingClosure:'six sides passed',shaftAndBoreClearance:'passed',lengthwiseHingedHalf:'passed',longitudinalSection:'passed',perCylinderGlow:'passed',pauseAndGlowOff:'passed',realTimeRPM:'passed',shellIsolation:'passed',disposal:'passed'},null,2))
} finally { await fs.rm(temporary,{recursive:true,force:true}) }
