/**
 * DUALFORCE 350 / 650 - Interactive 3D WebGL Powertrain Engine Model
 * Extracted and optimized from the official DUALFORCE 350 showcase (Manus space).
 * Features:
 *  - Full Three.js 3D mechanical and electromagnetic engine assembly
 *  - 7 modular sub-assemblies: casing, cylinders, pistons, rods, crank, stator, magnets
 *  - Visual kinematics: piston reciprocation, connecting-rod swing and crankshaft/flywheel rotation
 *  - Synchronized electromagnetic flux pulse rings around the stator coils
 *  - Exploded view slider (smooth component separation)
 *  - Cutaway / X-Ray transparent aluminium casing toggle
 *  - 360° orbit rotation, zoom, pan, touch gestures
 *  - 4 camera angle presets: Hero, Front, Side, Detail
 *  - 13 Real-time 3D projected engineering callout annotations
 *  - Component inspection inspector
 */

(function (global) {
  'use strict';

  // Helper vector for RoundedBoxGeometry UV mapping
  var _clVec = null;

  function _calcBoxUV(e, t, n, r, i, a) {
    if (!_clVec && typeof THREE !== 'undefined') _clVec = new THREE.Vector3();
    var o = (2 * Math.PI * i) / 4;
    var s = Math.max(a - 2 * i, 0);
    var c = Math.PI / 4;
    _clVec.copy(t);
    _clVec[r] = 0;
    _clVec.normalize();
    var l = (0.5 * o) / (o + s);
    var u = 1 - _clVec.angleTo(e) / c;
    return Math.sign(_clVec[n]) === 1 ? u * l : s / (o + s) + l + l * (1 - u);
  }

  // Rounded Box Geometry implementation
  function createRoundedBoxGeometry(width, height, depth, segments, radius) {
    width = width || 1;
    height = height || 1;
    depth = depth || 1;
    segments = segments || 2;
    radius = radius || 0.1;

    var seg = segments * 2 + 1;
    radius = Math.min(width / 2, height / 2, depth / 2, radius);
    var geom = new THREE.BoxGeometry(1, 1, 1, seg, seg, seg);
    geom.type = 'RoundedBoxGeometry';

    var nonIndexed = geom.toNonIndexed();
    geom.dispose(); // clean up temporary geom

    var newGeom = new THREE.BufferGeometry();
    newGeom.type = 'RoundedBoxGeometry';
    newGeom.parameters = { width: width, height: height, depth: depth, segments: segments, radius: radius };

    var pos = nonIndexed.attributes.position.clone();
    var norm = nonIndexed.attributes.normal.clone();
    var uv = nonIndexed.attributes.uv.clone();

    newGeom.setAttribute('position', pos);
    newGeom.setAttribute('normal', norm);
    newGeom.setAttribute('uv', uv);

    var s = new THREE.Vector3(), c = new THREE.Vector3();
    var l = new THREE.Vector3(width, height, depth).divideScalar(2).subScalar(radius);
    var u = pos.array;
    var d = norm.array;
    var f = uv.array;
    var p = u.length / 6;
    var m = new THREE.Vector3(), h = 0.5 / seg;

    for (var r = 0, a = 0; r < u.length; r += 3, a += 2) {
      s.fromArray(u, r);
      c.copy(s);
      c.x -= Math.sign(c.x) * h;
      c.y -= Math.sign(c.y) * h;
      c.z -= Math.sign(c.z) * h;
      c.normalize();
      u[r + 0] = l.x * Math.sign(s.x) + c.x * radius;
      u[r + 1] = l.y * Math.sign(s.y) + c.y * radius;
      u[r + 2] = l.z * Math.sign(s.z) + c.z * radius;
      d[r + 0] = c.x;
      d[r + 1] = c.y;
      d[r + 2] = c.z;

      switch (Math.floor(r / p)) {
        case 0: m.set(1, 0, 0); f[a + 0] = _calcBoxUV(m, c, 'z', 'y', radius, depth); f[a + 1] = 1 - _calcBoxUV(m, c, 'y', 'z', radius, height); break;
        case 1: m.set(-1, 0, 0); f[a + 0] = 1 - _calcBoxUV(m, c, 'z', 'y', radius, depth); f[a + 1] = 1 - _calcBoxUV(m, c, 'y', 'z', radius, height); break;
        case 2: m.set(0, 1, 0); f[a + 0] = 1 - _calcBoxUV(m, c, 'x', 'z', radius, width); f[a + 1] = _calcBoxUV(m, c, 'z', 'x', radius, depth); break;
        case 3: m.set(0, -1, 0); f[a + 0] = 1 - _calcBoxUV(m, c, 'x', 'z', radius, width); f[a + 1] = 1 - _calcBoxUV(m, c, 'z', 'x', radius, depth); break;
        case 4: m.set(0, 0, 1); f[a + 0] = 1 - _calcBoxUV(m, c, 'x', 'y', radius, width); f[a + 1] = 1 - _calcBoxUV(m, c, 'y', 'x', radius, height); break;
        case 5: m.set(0, 0, -1); f[a + 0] = _calcBoxUV(m, c, 'x', 'y', radius, width); f[a + 1] = 1 - _calcBoxUV(m, c, 'y', 'x', radius, height); break;
      }
    }

    newGeom.computeVertexNormals();
    return newGeom;
  }

  // Component metadata registry
  var COMPONENT_METADATA = {
    casing: { label: 'Aluminium Casing', description: 'Primary monobloc housing around the crankcase and cylinder block.' },
    frame: { label: 'Internal Support Frame', description: 'Reference-inspired structural supports around the provisional engine assembly.' },
    cylinders: { label: 'Twin Cylinder Pack', description: 'Dual inline cylinders with Nitronic 50 non-magnetic liners and cooling fins.' },
    pistons: { label: '4032 Aluminium Pistons', description: 'Lightweight reciprocating pistons with YSZ ceramic thermal barrier crown.' },
    rods: { label: 'Forged 4340 Rods', description: 'High-tensile forged connecting rods transferring reciprocating thrust to the crank.' },
    crank: { label: 'Crank / Flywheel / Bearings', description: 'Shared counterbalanced crankshaft, machined flywheel, journals and bearing seats.' },
    stator: { label: 'Copper Stator Windings', description: 'Axially stacked copper Litz wire coils producing pulsed reluctance magnetic drive.' },
    magnets: { label: 'Hiperco-50 Reluctance Teeth', description: 'Soft magnetic composite reluctance teeth embedded on the piston skirt.' }
  };

  // Camera presets
  var CAMERA_PRESETS = {
    hero: { position: [4.8, 2.6, 5.5], target: [0, 0.05, 0] },
    front: { position: [0, 1.2, 6.5], target: [0, -0.1, 0] },
    side: { position: [6.7, 0.8, 1.4], target: [0, -0.15, 0] },
    detail: { position: [2.6, 2.2, 3.3], target: [0.3, 0.15, 0] }
  };

  function getScrollRoot(element) {
    var node = element && element.parentElement;
    while (node && node !== document.body) {
      var style = window.getComputedStyle(node);
      var scrollable = /(auto|scroll|overlay)/.test(style.overflowY || style.overflow);
      if (scrollable && node.scrollHeight > node.clientHeight) return node;
      node = node.parentElement;
    }
    return null;
  }

  // Engineering Annotations
  var ANNOTATIONS = [
    { key: 'casing', label: 'ALUMINIUM CASING', detail: 'Monobloc A380/6061 casing', mode: 'overview', position: [1.6, -0.85, 0.75] },
    { key: 'frame', label: 'INTERNAL SUPPORT FRAME', detail: 'Reference-inspired structural supports', mode: 'overview', position: [-1.78, 0.26, 0.8] },
    { key: 'cylinders', label: 'CYLINDER HEAD', detail: 'Twin head pack / valve cover', mode: 'overview', position: [-0.82, 1.52, 0.2] },
    { key: 'cylinders', label: 'NITRONIC LINER', detail: 'Non-magnetic slotted liner', mode: 'detailed', position: [0.82, 0.6, 0.5] },
    { key: 'pistons', label: 'PISTON CROWN', detail: '4032 Al + YSZ Thermal Barrier', mode: 'detailed', position: [-0.82, 0.4, 0.48] },
    { key: 'rods', label: 'CONNECTING ROD', detail: 'Forged 4340 H-beam steel', mode: 'detailed', position: [0.82, -0.42, 0.45] },
    { key: 'crank', label: 'CRANKSHAFT JOURNAL', detail: 'Stepped output journal', mode: 'detailed', position: [0.1, -0.82, 0.58] },
    { key: 'crank', label: 'COUNTERWEIGHT', detail: 'Dynamic counterbalance mass', mode: 'detailed', position: [0.62, -0.98, -0.48] },
    { key: 'crank', label: 'BEARING SEAT', detail: 'Main journal bearing race', mode: 'detailed', position: [1.78, -0.58, -0.2] },
    { key: 'crank', label: 'BRASS FLYWHEEL', detail: 'Counterweighted brass flywheel', mode: 'overview', position: [1.28, -0.68, 0.62] },
    { key: 'stator', label: 'COPPER STATOR COILS', detail: 'Class-220 Litz copper windings', mode: 'overview', position: [-0.82, 0.18, 0.72] },
    { key: 'stator', label: 'MAGNETIC RETURN CORE', detail: 'Laminated silicon steel yoke', mode: 'detailed', position: [0.82, 0.18, -0.7] },
    { key: 'magnets', label: 'HIPERCO-50 TEETH', detail: 'High saturation flux teeth', mode: 'detailed', position: [-0.82, 0.22, -0.62] }
  ];

  /**
   * Main Constructor / Factory
   */
  function DualForce3DEngine(container, userOptions) {
    if (!container) throw new Error('DualForce3DEngine: container element is required');

    var options = Object.assign({
      showControls: true,
      compact: false,
      theme: 'dark', // 'dark' | 'light'
      stageTheme: null,
      rpm: 2800,
      playing: true,
      exploded: 0, // 0 to 1
      cutaway: false, // begin with a solid inspection shell
      electromagnetic: true,
      cameraMode: 'hero',
      autoOrbit: false,
      wheelZoom: true,
      annotationsEnabled: false,
      annotationMode: 'overview', // 'overview' | 'detailed' | 'exploded'
      componentVisibility: null,
      onSelect: null
    }, userOptions);

    this.container = container;
    this.options = options;
    this.disposed = false;
    this._eventCleanups = [];
    this._observers = [];

    this.initDOM();
    this.initThree();
    this.buildModel();
    this.bindEvents();
    this.startLoop();
  }

  DualForce3DEngine.prototype._listen = function (target, type, handler, options) {
    target.addEventListener(type, handler, options);
    this._eventCleanups.push(function () {
      target.removeEventListener(type, handler, options);
    });
    return handler;
  };

  DualForce3DEngine.prototype.initDOM = function () {
    this.container.classList.add('df3d-container');
    if (this.options.theme === 'light') {
      this.container.classList.add('df3d-theme-light');
    } else {
      this.container.classList.add('df3d-theme-dark');
    }

    if (this.options.compact) {
      this.container.classList.add('df3d-compact-mode');
    }

    var html = '' +
      '<div class="df3d-stage-wrapper">' +
        '<canvas class="df3d-canvas" aria-label="Interactive 3D DUALFORCE Powertrain Engine"></canvas>' +
        '<div class="df3d-label-layer"></div>' +
        '<div class="df3d-stage-badge top-left"><span class="df3d-status-dot"></span> LIVE WEBGL ENGINE TWIN</div>' +
        '<div class="df3d-stage-badge bottom-right">' + (this.options.wheelZoom ? 'DRAG TO ORBIT · SCROLL TO ZOOM' : 'DRAG TO ORBIT · PAGE SCROLL') + '</div>';

    if (this.options.compact) {
      html += this.getCompactToolbarHTML();
    }

    html += '</div>';

    if (this.options.showControls && !this.options.compact) {
      html += this.getControlsHTML();
    }

    this.container.innerHTML = html;
    this.canvas = this.container.querySelector('.df3d-canvas');
    this.labelLayer = this.container.querySelector('.df3d-label-layer');
  };

  DualForce3DEngine.prototype.getCompactToolbarHTML = function () {
    var c = this.options;
    return '' +
      '<div class="df3d-compact-toolbar">' +
        '<button class="df3d-compact-btn df3d-play-btn" title="Toggle Motion">' + (c.playing ? '⏸' : '▶') + '</button>' +
        '<div class="df3d-compact-rpm">' +
          '<span class="df3d-rpm-val">' + Number(c.rpm).toLocaleString() + '</span>' +
          '<small>RPM</small>' +
        '</div>' +
        '<input type="range" class="df3d-compact-slider df3d-rpm-slider" min="400" max="7200" step="100" value="' + c.rpm + '" title="Engine RPM">' +
        '<button class="df3d-compact-btn df3d-compact-pill df3d-cutaway-toggle ' + (c.cutaway ? 'active' : '') + '">⚡ CUTAWAY</button>' +
        '<button class="df3d-compact-btn df3d-compact-pill df3d-flux-toggle ' + (c.electromagnetic ? 'active' : '') + '">🧲 FLUX</button>' +
        '<button class="df3d-compact-btn df3d-compact-pill df3d-compact-explode ' + (c.exploded > 0.05 ? 'active' : '') + '">💥 EXPLODE</button>' +
        '<a href="3d-engine.html" target="_blank" class="df3d-compact-btn df3d-compact-lab" title="Open Full-Screen 3D Lab">⛶ LAB</a>' +
      '</div>';
  };

  DualForce3DEngine.prototype.getControlsHTML = function () {
    var c = this.options;
    var componentControls = [
      { key: 'casing', label: 'ALUMINIUM CASING' },
      { key: 'frame', label: 'INTERNAL SUPPORT FRAME' },
      { key: 'cylinders', label: 'TWIN CYLINDER PACK' },
      { key: 'pistons', label: '4032 ALUMINIUM PISTONS' },
      { key: 'rods', label: 'FORGED 4340 RODS' },
      { key: 'crank', label: 'CRANK / FLYWHEEL / BEARINGS' },
      { key: 'stator', label: 'COPPER STATOR WINDINGS' },
      { key: 'magnets', label: 'MAGNETIC ELEMENTS' }
    ];
    var visibility = c.componentVisibility || {};
    var visibleCount = componentControls.filter(function (item) { return visibility[item.key] !== false; }).length;
    var componentButtons = componentControls.map(function (item) {
      var visible = visibility[item.key] !== false;
      return '<button type="button" class="df3d-component-btn ' + (visible ? 'active' : '') + '" data-component="' + item.key + '" aria-pressed="' + visible + '"><i aria-hidden="true"></i><span>' + item.label + '</span></button>';
    }).join('');
    return '' +
      '<div class="df3d-controls-panel">' +
        '<div class="df3d-panel-header">' +
          '<span>SYSTEM CONTROLS</span>' +
          '<b>DF / 350</b>' +
        '</div>' +

        '<div class="df3d-control-group">' +
          '<div class="df3d-group-title"><span>MOTION STATE</span><strong class="df3d-status-text">' + (c.playing ? 'RUNNING' : 'PAUSED') + '</strong></div>' +
          '<div class="df3d-row df3d-motion-row">' +
            '<button type="button" class="df3d-btn df3d-play-btn" title="Toggle motion" aria-pressed="' + Boolean(c.playing) + '">' + (c.playing ? 'Ⅱ' : '▶') + '</button>' +
            '<div class="df3d-rpm-readout"><b class="df3d-rpm-val">' + Number(c.rpm).toLocaleString() + '</b><span>SIMULATED RPM</span></div>' +
          '</div>' +
          '<input type="range" class="df3d-slider df3d-rpm-slider" min="400" max="7200" step="100" value="' + c.rpm + '" aria-label="Simulated RPM, 400 to 7,200">' +
          '<div class="df3d-range-ends"><span>400</span><span>7,200</span></div>' +
        '</div>' +

        '<div class="df3d-control-group">' +
          '<div class="df3d-group-title"><span>ASSEMBLY STATE</span><strong class="df3d-explode-text">' + (c.exploded > 0.05 ? 'EXPLODED' : 'ASSEMBLED') + '</strong></div>' +
          '<div class="df3d-segmented df3d-assembly-segmented">' +
            '<button type="button" class="df3d-seg-btn df3d-assemble-btn ' + (c.exploded <= 0.05 ? 'active' : '') + '" aria-pressed="' + (c.exploded <= 0.05) + '">ASSEMBLED</button>' +
            '<button type="button" class="df3d-seg-btn df3d-explode-btn ' + (c.exploded > 0.05 ? 'active' : '') + '" aria-pressed="' + (c.exploded > 0.05) + '">EXPLODED</button>' +
          '</div>' +
          '<input type="range" class="df3d-slider df3d-explode-slider" min="0" max="1" step="0.01" value="' + c.exploded + '" aria-label="Assembly separation">' +
          '<div class="df3d-range-ends"><span>assembled</span><span>separated</span></div>' +
          '<button type="button" class="df3d-text-btn df3d-reset-assembly">↺ RESET ASSEMBLY</button>' +
        '</div>' +

        '<div class="df3d-control-group">' +
          '<div class="df3d-group-title"><span>CAMERA ANGLE</span><strong class="df3d-camera-state">' + String(c.cameraMode || 'hero').toUpperCase() + '</strong></div>' +
          '<div class="df3d-camera-grid">' +
            '<button type="button" class="df3d-cam-btn ' + (c.cameraMode === 'hero' ? 'active' : '') + '" data-cam="hero" aria-pressed="' + (c.cameraMode === 'hero') + '">HERO</button>' +
            '<button type="button" class="df3d-cam-btn ' + (c.cameraMode === 'front' ? 'active' : '') + '" data-cam="front" aria-pressed="' + (c.cameraMode === 'front') + '">FRONT</button>' +
            '<button type="button" class="df3d-cam-btn ' + (c.cameraMode === 'side' ? 'active' : '') + '" data-cam="side" aria-pressed="' + (c.cameraMode === 'side') + '">SIDE</button>' +
            '<button type="button" class="df3d-cam-btn ' + (c.cameraMode === 'detail' ? 'active' : '') + '" data-cam="detail" aria-pressed="' + (c.cameraMode === 'detail') + '">DETAIL</button>' +
          '</div>' +
          '<button type="button" class="df3d-text-btn df3d-reset-camera">↺ RESET CAMERA &amp; ZOOM</button>' +
          '<button type="button" class="df3d-toggle-btn df3d-orbit-toggle ' + (c.autoOrbit ? 'active' : '') + '" aria-pressed="' + Boolean(c.autoOrbit) + '">AUTO-ORBIT</button>' +
          '<button type="button" class="df3d-toggle-btn df3d-wheel-zoom-toggle ' + (c.wheelZoom ? 'active' : '') + '" aria-pressed="' + Boolean(c.wheelZoom) + '">WHEEL ZOOM <strong class="df3d-wheel-state">' + (c.wheelZoom ? 'ON' : 'OFF') + '</strong></button>' +
        '</div>' +

        '<div class="df3d-control-group">' +
          '<div class="df3d-group-title"><span>CONCEPT LAYER</span><strong class="df3d-concept-state">' + (c.electromagnetic ? 'VISIBLE' : 'HIDDEN') + '</strong></div>' +
          '<button type="button" class="df3d-switch-btn df3d-flux-toggle ' + (c.electromagnetic ? 'active' : '') + '" aria-pressed="' + Boolean(c.electromagnetic) + '"><span class="df3d-switch-track"><i></i></span><span>PROPOSED ELECTROMAGNETIC INTERACTION</span></button>' +
        '</div>' +

        '<div class="df3d-control-group">' +
          '<div class="df3d-group-title"><span>INSPECTION SHELL</span><strong class="df3d-shell-state">' + (c.cutaway ? 'TRANSPARENT' : 'SOLID') + '</strong></div>' +
          '<button type="button" class="df3d-switch-btn df3d-cutaway-toggle ' + (c.cutaway ? 'active' : '') + '" aria-pressed="' + Boolean(c.cutaway) + '"><span class="df3d-switch-track"><i></i></span><span>TRANSPARENT ALUMINIUM CASING</span></button>' +
        '</div>' +

        '<div class="df3d-control-group">' +
          '<div class="df3d-group-title"><span>ANNOTATIONS</span><strong class="df3d-annotation-state">' + (c.annotationsEnabled ? 'ON' : 'OFF') + '</strong></div>' +
          '<button type="button" class="df3d-switch-btn df3d-labels-toggle ' + (c.annotationsEnabled ? 'active' : '') + '" aria-pressed="' + Boolean(c.annotationsEnabled) + '"><span class="df3d-switch-track"><i></i></span><span>ENGINEERING LABELS ON / OFF</span></button>' +
          '<div class="df3d-segmented df3d-annotation-modes">' +
            '<button type="button" class="df3d-seg-btn df3d-annotation-mode-btn ' + (c.annotationMode === 'overview' ? 'active' : '') + '" data-annotation-mode="overview" aria-pressed="' + (c.annotationMode === 'overview') + '">OVERVIEW</button>' +
            '<button type="button" class="df3d-seg-btn df3d-annotation-mode-btn ' + (c.annotationMode === 'detailed' ? 'active' : '') + '" data-annotation-mode="detailed" aria-pressed="' + (c.annotationMode === 'detailed') + '">DETAILED</button>' +
            '<button type="button" class="df3d-seg-btn df3d-annotation-mode-btn ' + (c.annotationMode === 'exploded' ? 'active' : '') + '" data-annotation-mode="exploded" aria-pressed="' + (c.annotationMode === 'exploded') + '">EXPLODED</button>' +
          '</div>' +
        '</div>' +

        '<div class="df3d-control-group">' +
          '<div class="df3d-group-title"><span>COMPONENT VISIBILITY</span><strong class="df3d-component-count">' + visibleCount + ' / 8</strong></div>' +
          '<div class="df3d-components-grid">' + componentButtons + '</div>' +
        '</div>' +

        '<div class="df3d-active-card">' +
          '<span class="df3d-active-key">SELECTED SUB-ASSEMBLY</span>' +
          '<b class="df3d-active-title">Copper Stator Windings</b>' +
          '<p class="df3d-active-desc">Axially stacked copper Litz wire coils; electromagnetic operation is shown as a proposed concept layer.</p>' +
        '</div>' +
      '</div>';
  };

  DualForce3DEngine.prototype.initThree = function () {
    var width = this.canvas.clientWidth || 800;
    var height = this.canvas.clientHeight || 500;

    // Renderer
    var renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
    renderer.setSize(width, height, false);
    if (renderer.outputEncoding !== undefined) {
      renderer.outputEncoding = THREE.sRGBEncoding;
    }
    renderer.toneMapping = THREE.ACESFilmicToneMapping || 4;
    renderer.toneMappingExposure = 0.8;

    // Keep model background independent from the control-panel surface.
    var scene = new THREE.Scene();
    var stageTheme = this.options.stageTheme || this.options.theme;
    scene.background = stageTheme === 'light' ? new THREE.Color(0xE2E3E0) : new THREE.Color(0x303234);

    // Camera
    var camera = new THREE.PerspectiveCamera(32, width / height, 0.1, 100);
    var initPreset = CAMERA_PRESETS[this.options.cameraMode] || CAMERA_PRESETS.hero;
    camera.position.set(initPreset.position[0], initPreset.position[1], initPreset.position[2]);
    var target = new THREE.Vector3(initPreset.target[0], initPreset.target[1], initPreset.target[2]);
    camera.lookAt(target);

    // Root Group
    var rootGroup = new THREE.Group();
    rootGroup.position.y = -0.05;
    scene.add(rootGroup);

    // Soft neutral studio lighting keeps the brushed-metal palette legible.
    var hemiLight = new THREE.HemisphereLight(0xE3E0D7, 0x171A1B, 1.1);
    scene.add(hemiLight);

    var dirLight = new THREE.DirectionalLight(0xF4EFE5, 2.4);
    dirLight.position.set(4, 6, 6);
    scene.add(dirLight);

    var pointLight1 = new THREE.PointLight(0xB9896F, 3, 12, 2);
    pointLight1.position.set(-3.5, 2.3, -2.5);
    scene.add(pointLight1);

    var pointLight2 = new THREE.PointLight(0xAEB9B6, 2, 11, 2);
    pointLight2.position.set(2.8, -1.5, 4.5);
    scene.add(pointLight2);

    // Ground Disc & Grid
    var groundMat = new THREE.MeshStandardMaterial({
      color: stageTheme === 'light' ? 0xD2D0C8 : 0x1A1D1E,
      roughness: 0.85,
      metalness: 0.15,
      transparent: true,
      opacity: 0.8
    });
    var groundDisc = new THREE.Mesh(new THREE.CircleGeometry(7, 64), groundMat);
    groundDisc.rotation.x = -Math.PI / 2;
    groundDisc.position.y = -1.34;
    scene.add(groundDisc);

    var grid = new THREE.GridHelper(8, 24, 0x737C78, 0x3B4040);
    grid.position.y = -1.335;
    if (grid.material) {
      grid.material.transparent = true;
      grid.material.opacity = 0.12;
    }
    scene.add(grid);

    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.cameraTarget = target;
    this.rootGroup = rootGroup;
  };

  DualForce3DEngine.prototype.buildModel = function () {
    var self = this;
    var stdMat = function (color, roughness, metalness) {
      return new THREE.MeshStandardMaterial({
        color: color,
        roughness: roughness !== undefined ? roughness : 0.35,
        metalness: metalness !== undefined ? metalness : 0.88
      });
    };

    // Materials
    var matBronze = stdMat(0x747C7D, 0.38, 0.84);
    var matBrass = stdMat(0xA27A62, 0.34, 0.83);
    var matSteel = stdMat(0x70797A, 0.38, 0.82);
    var matDark = stdMat(0x33393B, 0.42, 0.78);
    var matChrome = stdMat(0x969D9B, 0.28, 0.86);
    var matFrame = stdMat(0x697271, 0.46, 0.72);

    var matCasing = new THREE.MeshPhysicalMaterial({
      color: 0x4E585A,
      roughness: 0.4,
      metalness: 0.78,
      clearcoat: 0.24,
      clearcoatRoughness: 0.26
    });

    var matCopper = new THREE.MeshStandardMaterial({
      color: 0xA57458,
      emissive: 0x2D1911,
      emissiveIntensity: 0.22,
      roughness: 0.34,
      metalness: 0.86
    });

    var matCrown = new THREE.MeshStandardMaterial({
      color: 0xB6BDB9,
      roughness: 0.42,
      metalness: 0.24
    });

    var matHiperco = new THREE.MeshStandardMaterial({
      color: 0x818887,
      emissive: 0x171A1A,
      emissiveIntensity: 0.08,
      roughness: 0.38,
      metalness: 0.78
    });

    var matFlux = new THREE.MeshBasicMaterial({
      color: 0xA7795F,
      transparent: true,
      opacity: 0.2,
      blending: THREE.AdditiveBlending
    });

    // Sub-assembly groups
    var N = {
      casing: new THREE.Group(),
      frame: new THREE.Group(),
      cylinders: new THREE.Group(),
      pistons: new THREE.Group(),
      rods: new THREE.Group(),
      crank: new THREE.Group(),
      stator: new THREE.Group(),
      magnets: new THREE.Group()
    };

    Object.keys(N).forEach(function (k) {
      N[k].userData.component = k;
      self.rootGroup.add(N[k]);
    });

    var initialVisibility = self.options.componentVisibility || {};
    Object.keys(N).forEach(function (k) { N[k].visible = initialVisibility[k] !== false; });

    // Reference-inspired outer support rails: a real, independently visible group.
    function addFrameBar(width, height, depth, x, y, z) {
      var bar = new THREE.Mesh(createRoundedBoxGeometry(width, height, depth, 2, 0.025), matFrame);
      bar.position.set(x, y, z);
      bar.userData.component = 'frame';
      N.frame.add(bar);
      return bar;
    }
    [-1.92, 1.92].forEach(function (x) {
      [-0.94, 0.94].forEach(function (z) {
        addFrameBar(0.105, 2.72, 0.105, x, 0.02, z);
      });
    });
    [-0.94, 0.94].forEach(function (z) {
      addFrameBar(3.95, 0.105, 0.105, 0, 1.34, z);
      addFrameBar(3.95, 0.105, 0.105, 0, -1.27, z);
    });
    [-1.92, 1.92].forEach(function (x) {
      addFrameBar(0.105, 0.105, 1.98, x, 1.34, 0);
      addFrameBar(0.105, 0.105, 1.98, x, -1.27, 0);
    });

    // 1. CASING
    var mainBlock = new THREE.Mesh(createRoundedBoxGeometry(3.45, 1.2, 1.72, 5, 0.14), matCasing);
    mainBlock.position.set(0, -0.6, 0);
    mainBlock.userData.component = 'casing';
    N.casing.add(mainBlock);

    var topShelf = new THREE.Mesh(createRoundedBoxGeometry(2.55, 0.36, 1.54, 4, 0.08), matDark.clone());
    topShelf.position.set(0, 0.05, 0);
    topShelf.userData.component = 'casing';
    N.casing.add(topShelf);

    var bearingEndPlate = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 0.12, 48), matSteel.clone());
    bearingEndPlate.rotation.z = Math.PI / 2;
    bearingEndPlate.position.set(1.73, -0.58, 0);
    bearingEndPlate.userData.component = 'casing';
    N.casing.add(bearingEndPlate);

    [0, Math.PI / 2, Math.PI, Math.PI * 1.5].forEach(function (ang) {
      var bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.045, 18), matBrass);
      bolt.rotation.z = Math.PI / 2;
      bolt.position.set(1.79, -0.58 + Math.cos(ang) * 0.48, Math.sin(ang) * 0.48);
      bolt.userData.component = 'casing';
      N.casing.add(bolt);
    });

    [-1.08, 0.18, 1.02].forEach(function (yOffset) {
      var rib = new THREE.Mesh(createRoundedBoxGeometry(0.12, 0.74, 1.42, 3, 0.025), matSteel.clone());
      rib.position.set(-1.54, yOffset - 0.44, 0);
      rib.userData.component = 'casing';
      N.casing.add(rib);
    });

    // 2. CYLINDERS, PISTONS, RODS, STATOR, MAGNETS (Inline-2 Twin)
    var cylinderOffsets = [-0.82, 0.82];
    var pistonMeshes = [];
    var rodMeshes = [];
    var statorCoilMeshes = [];
    var fluxRingMeshes = [];

    cylinderOffsets.forEach(function (cx, idx) {
      // Cylinder Outer Body & Liner
      var outerBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 1.18, 36), matSteel);
      outerBarrel.position.set(cx, 0.55, 0);
      outerBarrel.userData.component = 'cylinders';
      N.cylinders.add(outerBarrel);

      var liner = new THREE.Mesh(new THREE.CylinderGeometry(0.405, 0.405, 1.08, 36), matDark);
      liner.position.set(cx, 0.55, 0);
      liner.userData.component = 'cylinders';
      N.cylinders.add(liner);

      var deckCollar = new THREE.Mesh(new THREE.TorusGeometry(0.49, 0.035, 10, 36), matBronze);
      deckCollar.position.set(cx, 0.76, 0);
      deckCollar.rotation.x = Math.PI / 2;
      deckCollar.userData.component = 'cylinders';
      N.cylinders.add(deckCollar);

      var headBlock = new THREE.Mesh(createRoundedBoxGeometry(1.03, 0.36, 1.25, 4, 0.06), matDark);
      headBlock.position.set(cx, 1.22, 0);
      headBlock.userData.component = 'cylinders';
      N.cylinders.add(headBlock);

      var valveCover = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.08, 32), matCrown);
      valveCover.position.set(cx, 1.43, 0);
      valveCover.userData.component = 'cylinders';
      N.cylinders.add(valveCover);

      [-0.17, 0.17].forEach(function (zPos) {
        var plug = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.1, 14), matBrass);
        plug.position.set(cx, 1.49, zPos);
        plug.userData.component = 'cylinders';
        N.cylinders.add(plug);
      });

      [0.33, 0.51, 0.69].forEach(function (finY) {
        var fin = new THREE.Mesh(new THREE.TorusGeometry(0.505, 0.018, 8, 36), matDark);
        fin.position.set(cx, finY, 0);
        fin.rotation.x = Math.PI / 2;
        fin.userData.component = 'cylinders';
        N.cylinders.add(fin);
      });

      // Piston Subgroup
      var pistonGrp = new THREE.Group();
      pistonGrp.position.set(cx, 0.44, 0);
      pistonGrp.userData.component = 'pistons';

      var pBody = new THREE.Mesh(new THREE.CylinderGeometry(0.37, 0.37, 0.18, 32), matCrown);
      pBody.userData.component = 'pistons';
      pistonGrp.add(pBody);

      var pRecess = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.045, 32), matBrass);
      pRecess.position.y = 0.11;
      pRecess.userData.component = 'pistons';
      pistonGrp.add(pRecess);

      [-0.08, -0.025, 0.03].forEach(function (ringY) {
        var ring = new THREE.Mesh(new THREE.TorusGeometry(0.375, 0.018, 8, 32), matSteel);
        ring.position.y = ringY;
        ring.rotation.x = Math.PI / 2;
        ring.userData.component = 'pistons';
        pistonGrp.add(ring);
      });

      pistonMeshes.push(pistonGrp);
      N.pistons.add(pistonGrp);

      // Connecting Rod Subgroup
      var rodGrp = new THREE.Group();
      rodGrp.position.set(cx, -0.16, 0);
      rodGrp.userData.component = 'rods';

      var rodBeam = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.22, 0.16), matBronze);
      rodBeam.position.y = -0.5;
      rodBeam.userData.component = 'rods';
      rodGrp.add(rodBeam);

      var rodEye = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.035, 10, 22), matBrass);
      rodEye.position.y = 0.08;
      rodEye.rotation.x = Math.PI / 2;
      rodEye.userData.component = 'rods';
      rodGrp.add(rodEye);

      rodMeshes.push(rodGrp);
      N.rods.add(rodGrp);

      // Stator Coils
      var mainCoil = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.062, 14, 42), matCopper);
      mainCoil.position.set(cx, 0.22, 0);
      mainCoil.rotation.x = Math.PI / 2;
      mainCoil.userData.component = 'stator';
      statorCoilMeshes.push(mainCoil);
      N.stator.add(mainCoil);

      [0.38, 0.5, 0.62, 0.74, 0.86, 0.98].forEach(function (cy, sIdx) {
        var subCoil = new THREE.Mesh(new THREE.TorusGeometry(0.535 + (sIdx % 2) * 0.012, 0.022, 10, 40), matCopper);
        subCoil.position.set(cx, cy, 0);
        subCoil.rotation.x = Math.PI / 2;
        subCoil.userData.component = 'stator';
        statorCoilMeshes.push(subCoil);
        N.stator.add(subCoil);
      });

      // Flux Glow Ring (Additive pulsing ring)
      var fluxRing = new THREE.Mesh(new THREE.TorusGeometry(0.74, 0.014, 8, 42), matFlux.clone());
      fluxRing.position.set(cx, 0.22, 0);
      fluxRing.rotation.x = Math.PI / 2;
      fluxRing.userData.component = 'stator';
      fluxRingMeshes.push(fluxRing);
      N.stator.add(fluxRing);

      var statorYoke = new THREE.Mesh(new THREE.TorusGeometry(0.68, 0.09, 12, 42), matDark);
      statorYoke.position.set(cx, 0.22, 0);
      statorYoke.rotation.x = Math.PI / 2;
      statorYoke.userData.component = 'stator';
      N.stator.add(statorYoke);

      // Reluctance Magnets / Teeth
      [-1, 1].forEach(function (side) {
        var tooth = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.34, 0.22), matHiperco);
        tooth.position.set(cx + side * 0.56, 0.22, 0);
        tooth.userData.component = 'magnets';
        N.magnets.add(tooth);
      });

      var poleSphere = new THREE.Mesh(new THREE.SphereGeometry(0.1, 18, 18), matHiperco);
      poleSphere.position.set(cx, 0.22, 0.56);
      poleSphere.userData.component = 'magnets';
      N.magnets.add(poleSphere);

      var topTerminal = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.35, 12), matCrown);
      topTerminal.position.set(cx, 1.62, 0);
      topTerminal.userData.component = 'cylinders';
      if (idx === 1) topTerminal.rotation.z = 0.04;
      N.cylinders.add(topTerminal);
    });

    // 3. CRANKSHAFT & FLYWHEEL
    var crankAssembly = new THREE.Group();
    crankAssembly.position.y = -0.82;
    crankAssembly.userData.component = 'crank';

    var crankCenterShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 3.4, 32), matBrass);
    crankCenterShaft.rotation.z = Math.PI / 2;
    crankCenterShaft.userData.component = 'crank';
    crankAssembly.add(crankCenterShaft);

    var brassFlywheel = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 0.25, 48), matBronze);
    brassFlywheel.rotation.z = Math.PI / 2;
    brassFlywheel.position.x = 0.62;
    brassFlywheel.userData.component = 'crank';
    crankAssembly.add(brassFlywheel);

    var flywheelHub = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.32, 32), matSteel);
    flywheelHub.rotation.z = Math.PI / 2;
    flywheelHub.position.x = 0.62;
    flywheelHub.userData.component = 'crank';
    crankAssembly.add(flywheelHub);

    [-1.16, -0.38, 0.42, 1.16].forEach(function (cx, i) {
      var journal = new THREE.Mesh(new THREE.CylinderGeometry(i % 2 ? 0.23 : 0.28, i % 2 ? 0.23 : 0.28, 0.22, 28), matSteel);
      journal.rotation.z = Math.PI / 2;
      journal.position.set(cx, 0, 0);
      journal.userData.component = 'crank';
      crankAssembly.add(journal);

      var collar = new THREE.Mesh(new THREE.TorusGeometry(i % 2 ? 0.26 : 0.31, 0.055, 10, 30), matChrome);
      collar.position.set(cx, 0, 0);
      collar.rotation.y = Math.PI / 2;
      collar.userData.component = 'crank';
      crankAssembly.add(collar);
    });

    [-0.8, 0.8].forEach(function (cx, i) {
      var counterweight = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.17, 24, 1, false, i ? 0 : Math.PI, Math.PI), matDark);
      counterweight.rotation.z = Math.PI / 2;
      counterweight.position.set(cx, 0, 0.25);
      counterweight.userData.component = 'crank';
      crankAssembly.add(counterweight);
    });

    N.crank.add(crankAssembly);

    var bearingRing = new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.08, 12, 36), matDark);
    bearingRing.rotation.y = Math.PI / 2;
    bearingRing.position.set(1.76, -0.58, 0);
    bearingRing.userData.component = 'crank';
    N.crank.add(bearingRing);
    // Build HTML 3D Annotation Anchors
    var labelElements = {};
    if (this.labelLayer) {
      ANNOTATIONS.forEach(function (anno, idx) {
        var anchor = new THREE.Object3D();
        anchor.position.set(anno.position[0], anno.position[1], anno.position[2]);
        N[anno.key].add(anchor);
        anchor.userData.anno = anno;

        var btn = document.createElement('button');
        btn.className = 'df3d-label';
        btn.innerHTML = '<span class="df3d-label-dot"></span><span class="df3d-label-card"><b>' + (idx + 1) + '. ' + anno.label + '</b><small>' + anno.detail + '</small></span>';
        self._listen(btn, 'click', function () {
          self.selectComponent(anno.key);
        });
        self.labelLayer.appendChild(btn);
        labelElements[anno.key + '-' + idx] = { element: btn, anchor: anchor, anno: anno };
      });
    }

    this.N = N;
    this.pistonMeshes = pistonMeshes;
    this.rodMeshes = rodMeshes;
    this.crankAssembly = crankAssembly;
    this.statorCoilMeshes = statorCoilMeshes;
    this.fluxRingMeshes = fluxRingMeshes;
    this.labelElements = labelElements;
    this.fluxRingMeshes.forEach(function (ring) { ring.visible = Boolean(self.options.electromagnetic); });
    if (this.labelLayer) this.labelLayer.style.display = this.options.annotationsEnabled ? 'block' : 'none';

    // Apply initial cutaway transparency
    this.applyCutaway(this.options.cutaway);
  };

  DualForce3DEngine.prototype.applyCutaway = function (isCutaway) {
    var self = this;
    if (!this.N || !this.N.casing) return;
    this.N.casing.traverse(function (obj) {
      if (obj instanceof THREE.Mesh) {
        var mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach(function (m) {
          m.transparent = isCutaway;
          m.opacity = isCutaway ? 0.22 : 1.0;
          m.depthWrite = !isCutaway;
        });
      }
    });
  };

  DualForce3DEngine.prototype.bindEvents = function () {
    var self = this;
    var canvas = this.canvas;
    var isDragging = false;
    var isPinching = false;
    var prevPointer = { x: 0, y: 0 };
    var activePointers = Object.create(null);
    var pinchStartDistance = 0;
    var pinchStartViewDistance = 0;
    var pointerList = function () { return Object.keys(activePointers).map(function (key) { return activePointers[key]; }); };
    var pointerDistance = function (a, b) { return Math.hypot(a.x - b.x, a.y - b.y); };

    // Single-finger/mouse drag rotates; two-finger pinch changes camera distance.
    this._listen(canvas, 'pointerdown', function (e) {
      activePointers[e.pointerId] = { x: e.clientX, y: e.clientY, type: e.pointerType };
      if (canvas.setPointerCapture) canvas.setPointerCapture(e.pointerId);
      var points = pointerList();
      if (points.length === 2 && points[0].type === 'touch' && points[1].type === 'touch') {
        isDragging = false;
        isPinching = true;
        pinchStartDistance = pointerDistance(points[0], points[1]);
        pinchStartViewDistance = self.camera.position.distanceTo(self.cameraTarget);
      } else if (points.length === 1) {
        isDragging = true;
        isPinching = false;
        prevPointer.x = e.clientX;
        prevPointer.y = e.clientY;
      }
    });

    this._listen(canvas, 'pointermove', function (e) {
      if (!activePointers[e.pointerId]) return;
      activePointers[e.pointerId].x = e.clientX;
      activePointers[e.pointerId].y = e.clientY;
      var points = pointerList();
      if (isPinching && points.length >= 2) {
        var currentDistance = pointerDistance(points[0], points[1]);
        if (pinchStartDistance > 1 && currentDistance > 1) {
          var newDistance = Math.max(3.2, Math.min(12.0, pinchStartViewDistance * pinchStartDistance / currentDistance));
          var direction = self.camera.position.clone().sub(self.cameraTarget).normalize();
          self.camera.position.copy(self.cameraTarget).addScaledVector(direction, newDistance);
          self.camera.lookAt(self.cameraTarget);
        }
        return;
      }
      if (!isDragging) return;
      var dx = e.clientX - prevPointer.x;
      var dy = e.clientY - prevPointer.y;
      prevPointer.x = e.clientX;
      prevPointer.y = e.clientY;
      if (e.pointerType === 'touch' && Math.abs(dy) > Math.abs(dx) * 1.15) return;
      self.rootGroup.rotation.y += dx * 0.008;
      self.rootGroup.rotation.x = Math.max(-0.75, Math.min(0.75, self.rootGroup.rotation.x + dy * 0.005));
    });

    var endDrag = function (e) {
      if (e && e.pointerId !== undefined) delete activePointers[e.pointerId];
      var points = pointerList();
      isPinching = false;
      if (points.length === 1) {
        isDragging = true;
        prevPointer.x = points[0].x;
        prevPointer.y = points[0].y;
      } else {
        isDragging = false;
      }
      if (e && canvas.releasePointerCapture) {
        try { canvas.releasePointerCapture(e.pointerId); } catch (err) {}
      }
    };
    this._listen(canvas, 'pointerup', endDrag);
    this._listen(canvas, 'pointercancel', endDrag);

    this._listen(canvas, 'wheel', function (e) {
      if (!self.options.wheelZoom) return;
      e.preventDefault();
      var cam = self.camera;
      var factor = e.deltaY * 0.003;
      var direction = cam.position.clone().sub(self.cameraTarget);
      var dist = direction.length();
      var newDist = Math.max(3.2, Math.min(12.0, dist + factor));
      cam.position.copy(self.cameraTarget).addScaledVector(direction.normalize(), newDist);
      cam.lookAt(self.cameraTarget);
    }, { passive: false });

    // Resize observer
    var resizeTimer = null;
    var onResize = function () {
      if (self.disposed) return;
      var w = self.canvas.clientWidth || 800;
      var h = self.canvas.clientHeight || 500;
      self.renderer.setSize(w, h, false);
      self.camera.aspect = w / h;
      self.camera.updateProjectionMatrix();
      if (self._refreshLoopObserver) self._refreshLoopObserver();
    };
    this._listen(window, 'resize', onResize);
    this._onResize = onResize;

    // UI Buttons
    if (!this.options.showControls) return;

    var playBtn = this.container.querySelector('.df3d-play-btn');
    var statusText = this.container.querySelector('.df3d-status-text');
    if (playBtn) {
      this._listen(playBtn, 'click', function () {
        self.options.playing = !self.options.playing;
        playBtn.textContent = self.options.playing ? (self.options.compact ? '⏸' : 'Ⅱ') : '▶';
        playBtn.setAttribute('aria-pressed', String(self.options.playing));
        if (statusText) statusText.textContent = self.options.playing ? 'RUNNING' : 'PAUSED';
      });
    }

    var rpmSlider = this.container.querySelector('.df3d-rpm-slider');
    var rpmVal = this.container.querySelector('.df3d-rpm-val');
    if (rpmSlider) {
      this._listen(rpmSlider, 'input', function (e) {
        self.options.rpm = Number(e.target.value);
        if (rpmVal) rpmVal.textContent = self.options.rpm.toLocaleString();
      });
    }

    var explodeSlider = this.container.querySelector('.df3d-explode-slider');
    var explodeText = this.container.querySelector('.df3d-explode-text');
    var assembleBtn = this.container.querySelector('.df3d-assemble-btn');
    var explodeBtn = this.container.querySelector('.df3d-explode-btn');
    var compactExplode = this.container.querySelector('.df3d-compact-explode');
    var syncAssembly = function () {
      var assembled = self.options.exploded <= 0.05;
      if (explodeSlider) explodeSlider.value = self.options.exploded;
      if (explodeText) explodeText.textContent = assembled ? 'ASSEMBLED' : 'EXPLODED';
      if (assembleBtn) {
        assembleBtn.classList.toggle('active', assembled);
        assembleBtn.setAttribute('aria-pressed', String(assembled));
      }
      if (explodeBtn) {
        explodeBtn.classList.toggle('active', !assembled);
        explodeBtn.setAttribute('aria-pressed', String(!assembled));
      }
      if (compactExplode) compactExplode.classList.toggle('active', !assembled);
    };
    if (explodeSlider) this._listen(explodeSlider, 'input', function (e) {
      self.options.exploded = Math.max(0, Math.min(1, Number(e.target.value)));
      syncAssembly();
    });

    if (assembleBtn) {
      this._listen(assembleBtn, 'click', function () {
        self.options.exploded = 0;
        syncAssembly();
      });
    }

    if (explodeBtn) {
      this._listen(explodeBtn, 'click', function () {
        self.options.exploded = 1;
        syncAssembly();
      });
    }

    if (compactExplode) {
      this._listen(compactExplode, 'click', function () {
        self.options.exploded = self.options.exploded > 0.5 ? 0 : 1;
        syncAssembly();
      });
    }
    var resetAssembly = this.container.querySelector('.df3d-reset-assembly');
    if (resetAssembly) this._listen(resetAssembly, 'click', function () {
      self.options.exploded = 0;
      syncAssembly();
    });

    var cutawayToggle = this.container.querySelector('.df3d-cutaway-toggle');
    var shellState = this.container.querySelector('.df3d-shell-state');
    if (cutawayToggle) {
      this._listen(cutawayToggle, 'click', function () {
        self.options.cutaway = !self.options.cutaway;
        cutawayToggle.classList.toggle('active', self.options.cutaway);
        cutawayToggle.setAttribute('aria-pressed', String(self.options.cutaway));
        if (shellState) shellState.textContent = self.options.cutaway ? 'TRANSPARENT' : 'SOLID';
        self.applyCutaway(self.options.cutaway);
      });
    }

    var fluxToggle = this.container.querySelector('.df3d-flux-toggle');
    var conceptState = this.container.querySelector('.df3d-concept-state');
    if (fluxToggle) {
      this._listen(fluxToggle, 'click', function () {
        self.options.electromagnetic = !self.options.electromagnetic;
        fluxToggle.classList.toggle('active', self.options.electromagnetic);
        fluxToggle.setAttribute('aria-pressed', String(self.options.electromagnetic));
        if (conceptState) conceptState.textContent = self.options.electromagnetic ? 'VISIBLE' : 'HIDDEN';
        (self.fluxRingMeshes || []).forEach(function (ring) { ring.visible = self.options.electromagnetic; });
      });
    }

    var labelsToggle = this.container.querySelector('.df3d-labels-toggle');
    var annotationState = this.container.querySelector('.df3d-annotation-state');
    if (labelsToggle) {
      this._listen(labelsToggle, 'click', function () {
        self.options.annotationsEnabled = !self.options.annotationsEnabled;
        labelsToggle.classList.toggle('active', self.options.annotationsEnabled);
        labelsToggle.setAttribute('aria-pressed', String(self.options.annotationsEnabled));
        if (annotationState) annotationState.textContent = self.options.annotationsEnabled ? 'ON' : 'OFF';
        if (self.labelLayer) {
          self.labelLayer.style.display = self.options.annotationsEnabled ? 'block' : 'none';
        }
      });
    }

    var annotationModeButtons = this.container.querySelectorAll('.df3d-annotation-mode-btn');
    annotationModeButtons.forEach(function (btn) {
      self._listen(btn, 'click', function () {
        self.options.annotationMode = btn.getAttribute('data-annotation-mode') || 'overview';
        annotationModeButtons.forEach(function (item) {
          var active = item === btn;
          item.classList.toggle('active', active);
          item.setAttribute('aria-pressed', String(active));
        });
      });
    });

    var componentButtons = this.container.querySelectorAll('.df3d-component-btn');
    var componentCount = this.container.querySelector('.df3d-component-count');
    var updateComponentCount = function () {
      var count = Object.keys(self.N || {}).filter(function (key) { return self.N[key].visible; }).length;
      if (componentCount) componentCount.textContent = count + ' / 8';
    };
    componentButtons.forEach(function (btn) {
      self._listen(btn, 'click', function () {
        var key = btn.getAttribute('data-component');
        if (!key || !self.N || !self.N[key]) return;
        self.N[key].visible = !self.N[key].visible;
        self.options.componentVisibility = self.options.componentVisibility || {};
        self.options.componentVisibility[key] = self.N[key].visible;
        btn.classList.toggle('active', self.N[key].visible);
        btn.setAttribute('aria-pressed', String(self.N[key].visible));
        updateComponentCount();
      });
    });

    var wheelZoomToggle = this.container.querySelector('.df3d-wheel-zoom-toggle');
    var wheelState = this.container.querySelector('.df3d-wheel-state');
    if (wheelZoomToggle) this._listen(wheelZoomToggle, 'click', function () {
      self.options.wheelZoom = !self.options.wheelZoom;
      wheelZoomToggle.classList.toggle('active', self.options.wheelZoom);
      wheelZoomToggle.setAttribute('aria-pressed', String(self.options.wheelZoom));
      if (wheelState) wheelState.textContent = self.options.wheelZoom ? 'ON' : 'OFF';
      var badge = self.container.querySelector('.df3d-stage-badge.bottom-right');
      if (badge) badge.textContent = self.options.wheelZoom ? 'DRAG TO ORBIT · SCROLL TO ZOOM' : 'DRAG TO ORBIT · PAGE SCROLL';
    });

    var orbitToggle = this.container.querySelector('.df3d-orbit-toggle');
    if (orbitToggle) {
      this._listen(orbitToggle, 'click', function () {
        self.options.autoOrbit = !self.options.autoOrbit;
        orbitToggle.classList.toggle('active', self.options.autoOrbit);
        orbitToggle.setAttribute('aria-pressed', String(self.options.autoOrbit));
      });
    }

    var camBtns = this.container.querySelectorAll('.df3d-cam-btn');
    camBtns.forEach(function (btn) {
      self._listen(btn, 'click', function () {
        var mode = btn.getAttribute('data-cam');
        self.setCameraPreset(mode);
      });
    });

    var resetCamera = this.container.querySelector('.df3d-reset-camera');
    if (resetCamera) this._listen(resetCamera, 'click', function () { self.resetCamera(); });
  };

  DualForce3DEngine.prototype.setCameraPreset = function (mode) {
    var preset = CAMERA_PRESETS[mode];
    if (!preset) return;
    this.targetCameraPos = new THREE.Vector3(preset.position[0], preset.position[1], preset.position[2]);
    this.targetCameraTarget = new THREE.Vector3(preset.target[0], preset.target[1], preset.target[2]);
    this.options.cameraMode = mode;
    var cameraState = this.container.querySelector('.df3d-camera-state');
    if (cameraState) cameraState.textContent = mode.toUpperCase();
    this.container.querySelectorAll('.df3d-cam-btn').forEach(function (btn) {
      var active = btn.getAttribute('data-cam') === mode;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', String(active));
    });
  };

  DualForce3DEngine.prototype.resetCamera = function () {
    if (this.rootGroup) this.rootGroup.rotation.set(0, 0, 0);
    this.options.autoOrbit = false;
    var orbitToggle = this.container.querySelector('.df3d-orbit-toggle');
    if (orbitToggle) {
      orbitToggle.classList.remove('active');
      orbitToggle.setAttribute('aria-pressed', 'false');
    }
    this.setCameraPreset('hero');
  };

  DualForce3DEngine.prototype.selectComponent = function (key) {
    var self = this;
    var meta = COMPONENT_METADATA[key];
    if (!meta) return;

    var title = this.container.querySelector('.df3d-active-title');
    var desc = this.container.querySelector('.df3d-active-desc');
    if (title) title.textContent = meta.label;
    if (desc) desc.textContent = meta.description;

    // Highlight sub-assembly scale
    Object.keys(this.N).forEach(function (k) {
      self.N[k].scale.setScalar(k === key ? 1.04 : 1.0);
    });

    if (this.options.onSelect) {
      this.options.onSelect(key, meta);
    }
  };

  DualForce3DEngine.prototype.startLoop = function () {
    var self = this;
    var crankAngle = 0;
    var currentExplode = 0;
    var lastTime = 0;
    var tempWorldPos = new THREE.Vector3();

    this._loopInView = false;
    this._loopDocumentVisible = !document.hidden;
    this._loopObserver = null;

    var setLoopVisibility = function () {
      var shouldRun = !self.disposed && self._loopInView && self._loopDocumentVisible;
      if (!shouldRun) {
        if (self.animFrameId !== null && self.animFrameId !== undefined) {
          cancelAnimationFrame(self.animFrameId);
          self.animFrameId = null;
        }
        lastTime = 0;
        return;
      }
      if (self.animFrameId === null || self.animFrameId === undefined) {
        self.animFrameId = requestAnimationFrame(animate);
      }
    };

    var onDocumentVisibility = function () {
      self._loopDocumentVisible = !document.hidden;
      setLoopVisibility();
    };
    this._listen(document, 'visibilitychange', onDocumentVisibility);
    this._listen(window, 'pagehide', function (event) {
      if (!event.persisted) self.destroy();
    });
    this._listen(window, 'beforeunload', function () { self.destroy(); });

    this._refreshLoopObserver = function () {
      if (self._loopObserver) self._loopObserver.disconnect();
      self._loopObserver = null;
      self._loopInView = false;
      if (typeof IntersectionObserver !== 'undefined') {
        var root = getScrollRoot(self.canvas);
        self._loopObserver = new IntersectionObserver(function (entries) {
          if (entries.length) {
            self._loopInView = entries[entries.length - 1].isIntersecting;
            setLoopVisibility();
          }
        }, { root: root, threshold: 0 });
        self._loopObserver.observe(self.canvas);
      } else {
        self._loopInView = true;
        setLoopVisibility();
      }
    };
    this._refreshLoopObserver();

    function animate(time) {
      self.animFrameId = null;
      if (self.disposed || !self._loopInView || !self._loopDocumentVisible) {
        lastTime = 0;
        return;
      }
      if (!lastTime) lastTime = time;
      var dt = Math.min((time - lastTime) / 1000, 0.05);
      lastTime = time;

      var opt = self.options;

      // Kinematics angle
      if (opt.playing) {
        crankAngle += dt * (opt.rpm / 60) * Math.PI * 0.26;
      }

      // Smooth Explode lerp
      currentExplode += (opt.exploded - currentExplode) * 0.085;
      var exp = currentExplode;

      self.N.cylinders.position.y = exp * 0.32;
      self.N.pistons.position.y = exp * 0.78;
      self.N.rods.position.y = exp * 0.52;
      self.N.crank.position.y = -exp * 0.56;
      self.N.stator.position.y = exp * 1.03;
      self.N.magnets.position.y = exp * 1.32;

      // Piston and Rod trigonometry (Inline-2 Twin with 180° / 270° offset)
      self.pistonMeshes.forEach(function (piston, idx) {
        var phase = crankAngle + (idx === 1 ? Math.PI * 0.82 : 0);
        var pistonY = 0.44 + Math.sin(phase) * 0.38;
        var crankPinY = -0.82 + Math.sin(phase) * 0.26;
        var crankPinZ = Math.cos(phase) * 0.3;

        piston.position.y = pistonY;

        var rod = self.rodMeshes[idx];
        var wristPinY = pistonY - 0.08;
        var midY = (wristPinY + crankPinY) * 0.5;
        rod.position.set(piston.position.x, midY, crankPinZ * 0.5);
        rod.rotation.x = Math.atan2(crankPinZ, Math.max(0.001, wristPinY - crankPinY));
      });

      // Crankshaft, connecting rods and flywheel rotate as a single assembly.
      self.crankAssembly.rotation.x = crankAngle;

      // Stator coil subtle vibration & flux pulsation
      self.statorCoilMeshes.forEach(function (coil, i) {
        coil.rotation.z = Math.sin(crankAngle * 0.5 + i) * 0.025;
      });

      self.fluxRingMeshes.forEach(function (ring, i) {
        if (opt.electromagnetic) {
          var pulse = 0.25 + (Math.sin(crankAngle * 0.8 + i) + 1) * 0.15;
          ring.material.opacity = pulse;
          ring.scale.setScalar(1 + (Math.sin(crankAngle * 0.65 + i) + 1) * 0.06);
        } else {
          ring.material.opacity = 0;
        }
      });

      // Auto-orbit
      if (opt.autoOrbit) {
        self.rootGroup.rotation.y += dt * 0.15;
      }

      // Smooth camera interpolation
      if (self.targetCameraPos) {
        self.camera.position.lerp(self.targetCameraPos, 0.06);
        self.cameraTarget.lerp(self.targetCameraTarget, 0.06);
        self.camera.lookAt(self.cameraTarget);
        if (self.camera.position.distanceTo(self.targetCameraPos) < 0.01) {
          self.targetCameraPos = null;
        }
      }

      // Project 3D labels to screen coordinates
      if (opt.annotationsEnabled && self.labelElements) {
        var w = self.canvas.clientWidth || 800;
        var h = self.canvas.clientHeight || 500;

        Object.keys(self.labelElements).forEach(function (k) {
          var item = self.labelElements[k];
          var mode = opt.annotationMode || 'overview';
          var modeVisible = mode === 'exploded' || item.anno.mode === mode;
          var componentVisible = Boolean(self.N[item.anno.key] && self.N[item.anno.key].visible);
          var labelVisible = modeVisible && componentVisible;
          item.anchor.getWorldPosition(tempWorldPos);
          tempWorldPos.project(self.camera);

          var isBehind = tempWorldPos.z > 1.0;
          var screenX = (tempWorldPos.x * 0.5 + 0.5) * w;
          var screenY = (-tempWorldPos.y * 0.5 + 0.5) * h;

          item.element.style.display = labelVisible ? 'flex' : 'none';
          item.element.style.transform = 'translate3d(' + screenX.toFixed(1) + 'px, ' + screenY.toFixed(1) + 'px, 0)';
          item.element.style.opacity = isBehind || !labelVisible ? '0' : '1';
          item.element.style.pointerEvents = isBehind || !labelVisible ? 'none' : 'auto';
        });
      }

      self.renderer.render(self.scene, self.camera);
      if (!self.disposed && self._loopInView && self._loopDocumentVisible) {
        self.animFrameId = requestAnimationFrame(animate);
      }
    }

    this.animFrameId = null;
    setLoopVisibility();
  };

  DualForce3DEngine.prototype.destroy = function () {
    if (this.disposed) return;
    this.disposed = true;
    if (this.animFrameId !== null && this.animFrameId !== undefined) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this._loopObserver) {
      this._loopObserver.disconnect();
      this._loopObserver = null;
    }
    this._observers.forEach(function (observer) { observer.disconnect(); });
    this._observers.length = 0;
    this._eventCleanups.forEach(function (cleanup) { cleanup(); });
    this._eventCleanups.length = 0;
    if (this.scene && typeof this.scene.traverse === 'function') {
      var seenGeometries = new Set();
      var seenMaterials = new Set();
      this.scene.traverse(function (object) {
        var geometry = object.geometry;
        if (geometry && !seenGeometries.has(geometry)) {
          seenGeometries.add(geometry);
          geometry.dispose();
        }
        var materials = Array.isArray(object.material) ? object.material : (object.material ? [object.material] : []);
        materials.forEach(function (material) {
          if (!material || seenMaterials.has(material)) return;
          seenMaterials.add(material);
          material.dispose();
        });
      });
    }
    if (this.renderer) {
      this.renderer.dispose();
    }
  };

  // Expose to global window
  global.DualForce3DEngine = DualForce3DEngine;

})(typeof window !== 'undefined' ? window : this);
