import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import * as THREE from 'three'

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
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
  state.cutaway = true; model.update(state)
  casing.traverse(object => { if (object.isMesh) assert.ok(object.material.opacity < 0.25 && !object.material.depthWrite) })
  model.groups.frame.traverse(object => { if (object.isMesh) assert.equal(object.material.opacity,1) })
  model.groups.cylinders.traverse(object => { if (object.isMesh && object.material.transparent) assert.equal(object.material.opacity,0.64,'Housing toggle must not fade cylinder liners') })
  state.cutaway = false; model.update(state)
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
