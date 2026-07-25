export function initScene() {
    const container = document.getElementById('game-container');

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020205);
    scene.fog = new THREE.FogExp2(0x020205, 0.015);

    // Camera
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 200);
    updateCameraProfile(camera);

    // Renderer
    const canvas = document.createElement('canvas');
    canvas.id = 'game-canvas';
    container.appendChild(canvas);

    const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0x4466ff, 1);
    mainLight.position.set(20, 30, 20);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 1024;
    mainLight.shadow.mapSize.height = 1024;
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = 100;
    mainLight.shadow.camera.left = -20;
    mainLight.shadow.camera.right = 20;
    mainLight.shadow.camera.top = 20;
    mainLight.shadow.camera.bottom = -20;
    scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0xff00ff, 0.5);
    fillLight.position.set(-20, 10, -20);
    scene.add(fillLight);

    // Lane/Platform
    const laneGeom = new THREE.PlaneGeometry(30, 1000);
    const laneMat = new THREE.MeshStandardMaterial({
        color: 0x0a0a1a,
        roughness: 0.9,
        metalness: 0.1
    });
    const lane = new THREE.Mesh(laneGeom, laneMat);
    lane.rotation.x = -Math.PI / 2;
    lane.position.y = 0;
    lane.position.z = -400;
    lane.receiveShadow = true;
    scene.add(lane);

    // Decorative pillars
    const pillarGeom = new THREE.BoxGeometry(1, 10, 1);
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x111122, emissive: 0x00ffff, emissiveIntensity: 0.2 });

    for(let i = 0; i < 20; i++) {
        let p1 = new THREE.Mesh(pillarGeom, pillarMat);
        p1.position.set(-15, 5, -i * 50);
        p1.castShadow = true;
        p1.receiveShadow = true;
        scene.add(p1);

        let p2 = new THREE.Mesh(pillarGeom, pillarMat);
        p2.position.set(15, 5, -i * 50);
        p2.castShadow = true;
        p2.receiveShadow = true;
        scene.add(p2);
    }

    // Grid helper for ninja aesthetic
    const grid = new THREE.GridHelper(30, 60, 0x00ffff, 0x002222);
    grid.position.y = 0.01;
    scene.add(grid);

    window.addEventListener('resize', () => {
        updateCameraProfile(camera);
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    return { scene, camera, renderer, lane, grid };
}

export function updateCameraProfile(camera) {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const aspect = width / height;

    camera.aspect = aspect;

    if (aspect > 1.5) { // Desktop Widescreen
        camera.fov = 75;
        camera.position.set(0, 4.5, 12);
        camera.lookAt(0, 1.5, -20);
    } else if (aspect > 1.0) { // Tablet Landscape or narrower desktop
        camera.fov = 78;
        camera.position.set(0, 5, 14);
        camera.lookAt(0, 2, -20);
    } else if (aspect > 0.6) { // Tablet Portrait
        camera.fov = 80;
        camera.position.set(0, 6, 16);
        camera.lookAt(0, 1, -20);
    } else { // Mobile Portrait
        camera.fov = 82;
        camera.position.set(0, 7, 18);
        camera.lookAt(0, 0, -20);
    }

    camera.updateProjectionMatrix();
}
