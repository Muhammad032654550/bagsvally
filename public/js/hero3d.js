window.addEventListener('load', () => {
  const hero = document.getElementById('hs');
  const canvas = document.getElementById('c3');
  if (!hero || !canvas) return;

  const fallback = () => hero.classList.replace('m3', 'mp');
  if (!window.THREE) return fallback();

  const T = window.THREE;
  const settings = window.__S.site.hero || {};
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let renderer;
  try {
    renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch (error) {
    return fallback();
  }

  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    fallback();
  });

  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputEncoding = T.sRGBEncoding;

  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(35, 1, 0.1, 60);
  camera.position.set(0, 0.45, 8.4);
  camera.lookAt(0, 0, 0);

  const bodyShape = () => {
    const shape = new T.Shape();
    shape.moveTo(-1.13, -0.91);
    shape.quadraticCurveTo(-1.24, -0.91, -1.22, -0.77);
    shape.lineTo(-1.05, 0.69);
    shape.quadraticCurveTo(-1.04, 0.86, -0.88, 0.88);
    shape.lineTo(0.88, 0.88);
    shape.quadraticCurveTo(1.04, 0.86, 1.05, 0.69);
    shape.lineTo(1.22, -0.77);
    shape.quadraticCurveTo(1.24, -0.91, 1.13, -0.91);
    shape.closePath();
    return shape;
  };

  const panelShape = () => {
    const shape = new T.Shape();
    shape.moveTo(-0.98, -0.63);
    shape.lineTo(-0.84, 0.55);
    shape.quadraticCurveTo(-0.83, 0.63, -0.74, 0.63);
    shape.lineTo(0.74, 0.63);
    shape.quadraticCurveTo(0.83, 0.63, 0.84, 0.55);
    shape.lineTo(0.98, -0.63);
    shape.closePath();
    return shape;
  };

  const outline = (shape, material, z, y = 0, scale = 1) => {
    const points = shape.getPoints(40).map(point => new T.Vector3(point.x * scale, point.y * scale + y, z));
    const geometry = new T.BufferGeometry().setFromPoints(points);
    const line = new T.LineLoop(geometry, material);
    return line;
  };

  const stitches = (shape, material, z, y = 0, scale = 1, count = 86) => {
    const group = new T.Group();
    const points = shape.getPoints(120);
    for (let i = 0; i < count; i++) {
      const point = points[Math.floor(i * points.length / count)];
      const dash = new T.Mesh(new T.SphereGeometry(0.009, 6, 6), material);
      dash.position.set(point.x * scale, point.y * scale + y, z);
      group.add(dash);
    }
    return group;
  };

  const extrude = (shape, depth, bevel = 0.04) => {
    const geometry = new T.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: true,
      bevelThickness: bevel,
      bevelSize: bevel,
      bevelSegments: 4,
      curveSegments: 16,
    });
    geometry.center();
    return geometry;
  };

  const shapeMaterial = (color, roughness = 0.48, metalness = 0.02) => new T.MeshPhysicalMaterial({
    color,
    roughness,
    metalness,
    clearcoat: 0.35,
    clearcoatRoughness: 0.32,
  });
  const leather = shapeMaterial(settings.color || '#30251f');
  const ivory = shapeMaterial('#f4f0e8', 0.72);
  const orange = shapeMaterial('#ed713b', 0.4, 0.04);
  const gold = new T.MeshStandardMaterial({ color: '#c5a05d', metalness: 0.82, roughness: 0.24 });

  const body = new T.Mesh(extrude(bodyShape(), 0.72, 0.09), leather);
  const edgePiping = outline(bodyShape(), new T.LineBasicMaterial({ color: '#d0b5a0' }), 0.458);
  const centerPanel = new T.Mesh(extrude(panelShape(), 0.035, 0.012), ivory);
  centerPanel.position.set(0, -0.1, 0.49);
  const panelSeam = outline(panelShape(), new T.LineBasicMaterial({ color: '#d4cec3' }), 0.545, -0.1, 0.965);
  const panelStitch = stitches(panelShape(), new T.MeshStandardMaterial({ color: '#c8c1b7', roughness: 0.85 }), 0.548, -0.1, 0.91, 78);

  const flapShape = new T.Shape();
  flapShape.moveTo(-1.13, 0.32);
  flapShape.lineTo(1.13, 0.32);
  flapShape.quadraticCurveTo(1.2, 0.32, 1.2, 0.22);
  flapShape.lineTo(1.2, -0.03);
  flapShape.quadraticCurveTo(1.2, -0.13, 1.1, -0.16);
  flapShape.lineTo(0, -0.43);
  flapShape.lineTo(-1.1, -0.16);
  flapShape.quadraticCurveTo(-1.2, -0.13, -1.2, -0.03);
  flapShape.lineTo(-1.2, 0.22);
  flapShape.quadraticCurveTo(-1.2, 0.32, -1.13, 0.32);
  flapShape.closePath();
  const flap = new T.Mesh(extrude(flapShape, 0.12, 0.035), orange);
  flap.position.set(0, 0.49, 0.54);
  const flapStitch = stitches(flapShape, new T.MeshStandardMaterial({ color: '#f9a27a', roughness: 0.8 }), 0.654, 0.545, 0.96, 76);
  const flapTopSeam = new T.Line(
    new T.BufferGeometry().setFromPoints([
      new T.Vector3(-1.08, 0.86, 0.655),
      new T.Vector3(-0.72, 0.865, 0.655),
      new T.Vector3(0, 0.865, 0.655),
      new T.Vector3(0.72, 0.865, 0.655),
      new T.Vector3(1.08, 0.86, 0.655),
    ]),
    new T.LineBasicMaterial({ color: '#c95730' }),
  );

  const handleCurve = (z, width, height) => new T.CatmullRomCurve3([
    new T.Vector3(-width, 0.79, z),
    new T.Vector3(-width * 1.04, 1.45, z),
    new T.Vector3(-width * 0.8, height * 0.9, z),
    new T.Vector3(0, height, z),
    new T.Vector3(width * 0.8, height * 0.9, z),
    new T.Vector3(width * 1.04, 1.45, z),
    new T.Vector3(width, 0.79, z),
  ]);
  const handle = new T.Mesh(new T.TubeGeometry(handleCurve(0.29, 0.73, 2.2), 100, 0.09, 16, false), leather);
  const handleSeams = [-0.026, 0.026].map(offset => new T.Mesh(
    new T.TubeGeometry(handleCurve(0.366, 0.73 + offset, 2.2), 100, 0.008, 6, false),
    new T.MeshStandardMaterial({ color: '#d2b59f', roughness: 0.82 }),
  ));
  const rearHandle = new T.Mesh(new T.TubeGeometry(handleCurve(-0.3, 0.68, 2.08), 100, 0.07, 12, false), leather);

  const bag = new T.Group();
  bag.add(body, edgePiping, centerPanel, panelSeam, panelStitch, flap, flapStitch, flapTopSeam, rearHandle, handle, ...handleSeams);

  const silver = new T.MeshStandardMaterial({ color: '#b7b7ad', metalness: 0.88, roughness: 0.2 });
  [-1.07, 1.07].forEach(x => {
    const stud = new T.Mesh(new T.CylinderGeometry(0.052, 0.052, 0.035, 24), silver);
    stud.rotation.x = Math.PI / 2;
    stud.position.set(x, 0.35, 0.68);
    bag.add(stud);
    const center = new T.Mesh(new T.SphereGeometry(0.018, 12, 10), new T.MeshStandardMaterial({ color: '#64635d', metalness: 0.5, roughness: 0.35 }));
    center.position.set(x, 0.35, 0.705);
    bag.add(center);
  });

  const clasp = new T.Mesh(new T.BoxGeometry(0.3, 0.055, 0.025), silver);
  clasp.position.set(0, 0.44, 0.68);
  clasp.rotation.z = -0.12;
  bag.add(clasp);
  const logoMark = new T.Mesh(new T.TorusGeometry(0.045, 0.012, 6, 18), gold);
  logoMark.position.set(0, 0.445, 0.701);
  logoMark.rotation.z = -0.6;
  bag.add(logoMark);

  [-1, 1].forEach(side => {
    const verticalBracket = new T.Mesh(new T.BoxGeometry(0.065, 0.24, 0.045), silver);
    verticalBracket.position.set(side * 0.99, -0.65, 0.48);
    verticalBracket.rotation.z = side * -0.08;
    const horizontalBracket = new T.Mesh(new T.BoxGeometry(0.23, 0.065, 0.045), silver);
    horizontalBracket.position.set(side * 0.91, -0.79, 0.48);
    horizontalBracket.rotation.z = side * -0.08;
    bag.add(verticalBracket, horizontalBracket);
  });

  scene.add(bag);
  scene.add(new T.HemisphereLight(0xfff8ed, 0x8b6652, 1.35));
  const key = new T.DirectionalLight(0xffffff, 2.1);
  key.position.set(-3, 5, 6);
  scene.add(key);
  const fill = new T.PointLight(0xffc08b, 1.6, 18);
  fill.position.set(4, 1, 3);
  scene.add(fill);
  const rim = new T.PointLight(0xffffff, 1.1, 16);
  rim.position.set(-4, 2, -2);
  scene.add(rim);

  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = shadowCanvas.height = 128;
  const context = shadowCanvas.getContext('2d');
  const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(72, 44, 28, .28)');
  gradient.addColorStop(1, 'rgba(72, 44, 28, 0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);
  const shadow = new T.Mesh(
    new T.PlaneGeometry(4.4, 3),
    new T.MeshBasicMaterial({ map: new T.CanvasTexture(shadowCanvas), transparent: true, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -1.28;
  scene.add(shadow);

  let rotationY = -0.42;
  let targetRotationY = -0.42;
  let rotationX = 0.04;
  let targetRotationX = 0.04;
  let dragging = false;
  let lastX = 0;
  let visible = true;
  let scale = 1;
  let offsetX = 0;
  let offsetY = 0;
  let selectedColor = new T.Color(settings.color || '#30251f');
  const start = performance.now();

  const resize = () => {
    const width = hero.clientWidth;
    const height = hero.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    const viewHeight = 2 * camera.position.z * Math.tan(camera.fov * Math.PI / 360);
    const viewWidth = viewHeight * camera.aspect;
    scale = Math.min(1.15, viewWidth * 0.7 / 2.65, viewHeight * 0.56 / 2.85);
    if (width / height > 1.1) {
      offsetX = viewWidth * 0.2;
      offsetY = -0.03;
    } else {
      offsetX = 0;
      offsetY = viewHeight * 0.16;
    }
  };
  new ResizeObserver(resize).observe(hero);
  resize();

  canvas.addEventListener('pointerdown', event => {
    dragging = true;
    lastX = event.clientX;
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', event => {
    if (!dragging) return;
    targetRotationY += (event.clientX - lastX) * 0.012;
    lastX = event.clientX;
  });
  ['pointerup', 'pointercancel'].forEach(type => canvas.addEventListener(type, () => { dragging = false; }));
  hero.addEventListener('pointermove', event => {
    const bounds = hero.getBoundingClientRect();
    targetRotationX = 0.04 + ((event.clientY - bounds.top) / bounds.height - 0.5) * 0.22;
  });

  document.querySelectorAll('[data-sw]').forEach((button, index) => {
    if (button.dataset.sw.toLowerCase() === (settings.color || '').toLowerCase() || (!settings.color && index === 0)) {
      button.classList.add('on');
    }
    button.addEventListener('click', () => {
      selectedColor = new T.Color(button.dataset.sw);
      document.querySelectorAll('[data-sw]').forEach(swatch => swatch.classList.toggle('on', swatch === button));
    });
  });

  new IntersectionObserver(entries => { visible = entries[0].isIntersecting; }).observe(hero);
  const animate = () => {
    requestAnimationFrame(animate);
    if (!visible || document.hidden) return;
    const time = (performance.now() - start) / 1000;
    const scroll = Math.min(window.scrollY, window.innerHeight) / window.innerHeight;
    if (!dragging && !reducedMotion) targetRotationY += 0.003;
    rotationY += (targetRotationY - rotationY) * 0.08;
    rotationX += (targetRotationX - rotationX) * 0.06;
    bag.rotation.set(rotationX, rotationY + scroll * 1.8, 0);
    bag.position.set(offsetX, offsetY - scroll * 0.65 + (reducedMotion ? 0 : Math.sin(time * 1.2) * 0.08), 0);
    bag.scale.setScalar(scale);
    leather.color.lerp(selectedColor, 0.1);
    shadow.position.x = offsetX;
    shadow.position.z = offsetY - scroll * 0.65 - 1.28 * scale;
    if (!reducedMotion) shadow.rotation.z = Math.sin(time * 0.7) * 0.025;
    renderer.render(scene, camera);
  };
  animate();
});
