// app.js - AR sin marcadores con WebXR
let scene, camera, renderer;
let duckModels = [];
let score = 0;
let duckCount = 5;
let arSession = null;
let hitTestSource = null;
let refSpace = null;

// Elementos DOM
const scoreElement = document.getElementById('score');
const ducksElement = document.getElementById('ducks');
const enterARButton = document.getElementById('enter-ar');
const statusElement = document.getElementById('status');
const loadingElement = document.getElementById('loading');
const startInstructions = document.getElementById('start-instructions');

// Inicializar Three.js
function init() {
    // Crear escena
    scene = new THREE.Scene();
    scene.background = null;
    
    // Crear cámara
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
    
    // Crear renderer
    renderer = new THREE.WebGLRenderer({ 
        antialias: true, 
        alpha: true,
        preserveDrawingBuffer: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    
    // Añadir renderer al DOM
    const container = document.getElementById('ar-container');
    container.appendChild(renderer.domElement);
    
    // Comprobar compatibilidad con WebXR
    if ('xr' in navigator) {
        navigator.xr.isSessionSupported('immersive-ar')
            .then((supported) => {
                if (supported) {
                    enterARButton.style.display = 'block';
                    statusElement.textContent = 'AR disponible. Presiona el botón para comenzar.';
                } else {
                    statusElement.textContent = 'AR no disponible en este dispositivo.';
                }
            })
            .catch((error) => {
                statusElement.textContent = 'Error comprobando compatibilidad AR.';
                console.error('Error WebXR:', error);
            });
    } else {
        statusElement.textContent = 'WebXR no está disponible. Usa Chrome en Android o Safari en iOS.';
    }
    
    // Configurar evento del botón
    enterARButton.addEventListener('click', startAR);
    
    // Configurar eventos de toque
    window.addEventListener('touchstart', handleTouch, false);
    
    // Manejar redimensionamiento
    window.addEventListener('resize', onWindowResize);
}

// Iniciar sesión AR
async function startAR() {
    startInstructions.style.display = 'none';
    loadingElement.style.display = 'block';
    
    try {
        // Solicitar sesión AR
        const session = await navigator.xr.requestSession('immersive-ar', {
            requiredFeatures: ['hit-test'],
            optionalFeatures: ['dom-overlay'],
            domOverlay: { root: document.body }
        });
        
        arSession = session;
        
        // Conectar renderer a la sesión
        await renderer.xr.setSession(session);
        
        // Configurar espacio de referencia
        refSpace = await session.requestReferenceSpace('local');
        
        // Configurar hit test
        const viewerSpace = await session.requestReferenceSpace('viewer');
        hitTestSource = await session.requestHitTestSource({ space: viewerSpace });
        
        // Evento de finalización de sesión
        session.addEventListener('end', () => {
            arSession = null;
            hitTestSource = null;
            refSpace = null;
            enterARButton.style.display = 'block';
            statusElement.textContent = 'Sesión AR finalizada.';
        });
        
        loadingElement.style.display = 'none';
        statusElement.textContent = 'Mueve el teléfono para escanear superficies. Toca para colocar patos.';
        
        // Iniciar render loop
        renderer.setAnimationLoop(render);
        
    } catch (error) {
        console.error('Error iniciando AR:', error);
        loadingElement.style.display = 'none';
        statusElement.textContent = 'Error: ' + error.message;
    }
}

// Render loop
function render(time, frame) {
    if (!frame) return;
    
    const referenceSpace = refSpace;
    const pose = frame.getViewerPose(referenceSpace);
    
    if (pose) {
        // Actualizar cámara
        const view = pose.views[0];
        camera.matrix.fromArray(view.transform.matrix);
        camera.matrix.decompose(camera.position, camera.quaternion, camera.scale);
        
        // Hit testing
        if (hitTestSource && arSession) {
            const hitTestResults = frame.getHitTestResults(hitTestSource);
            if (hitTestResults.length > 0) {
                const hit = hitTestResults[0];
                const hitMatrix = hit.getPose(referenceSpace).transform.matrix;
                
                // Podemos usar esta matriz para colocar objetos
            }
        }
    }
    
    // Renderizar escena
    renderer.render(scene, camera);
}

// Manejar toques para colocar patos
function handleTouch(event) {
    if (!arSession || duckCount <= 0) return;
    
    event.preventDefault();
    
    // Crear un pato
    createDuck();
}

// Crear un pato 3D
function createDuck() {
    if (duckCount <= 0) return;
    
    const duckGeometry = new THREE.SphereGeometry(0.1, 16, 16);
    const duckMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x8B4513,
        shininess: 30
    });
    
    const duckBody = new THREE.Mesh(duckGeometry, duckMaterial);
    
    // Crear cabeza
    const headGeometry = new THREE.SphereGeometry(0.06, 16, 16);
    const headMaterial = new THREE.MeshPhongMaterial({ color: 0xD2691E });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.set(0.12, 0.05, 0);
    
    // Crear pico
    const beakGeometry = new THREE.ConeGeometry(0.02, 0.08, 8);
    const beakMaterial = new THREE.MeshPhongMaterial({ color: 0xFF8C00 });
    const beak = new THREE.Mesh(beakGeometry, beakMaterial);
    beak.position.set(0.18, 0.05, 0);
    beak.rotation.z = Math.PI / 2;
    
    // Grupo para el pato completo
    const duckGroup = new THREE.Group();
    duckGroup.add(duckBody);
    duckGroup.add(head);
    duckGroup.add(beak);
    
    // Posición aleatoria frente a la cámara
    duckGroup.position.set(
        (Math.random() - 0.5) * 2,
        Math.random() * 1.5,
        -Math.random() * 3 - 1
    );
    
    // Animación de flotar
    duckGroup.userData = {
        speed: 0.01 + Math.random() * 0.02,
        height: 0.2 + Math.random() * 0.3,
        originalY: duckGroup.position.y,
        time: Math.random() * Math.PI * 2
    };
    
    // Hacer el pato clickeable
    duckGroup.userData.isDuck = true;
    duckGroup.userData.clicked = false;
    
    scene.add(duckGroup);
    duckModels.push(duckGroup);
    
    // Actualizar contador
    duckCount--;
    ducksElement.textContent = duckCount;
    
    statusElement.textContent = `Pato colocado! Quedan ${duckCount} patos. Tócalos para disparar.`;
}

// Redimensionar ventana
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Manejar clics en objetos 3D
function onDocumentMouseDown(event) {
    event.preventDefault();
    
    // Convertir coordenadas del mouse a coordenadas 3D
    const mouse = new THREE.Vector2();
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    // Raycaster para detectar colisiones
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    
    // Comprobar colisiones con patos
    const intersects = raycaster.intersectObjects(duckModels);
    
    if (intersects.length > 0) {
        const duck = intersects[0].object.parent;
        
        if (!duck.userData.clicked) {
            // Pato disparado
            duck.userData.clicked = true;
            
            // Animación de caída
            duck.userData.fallSpeed = 0.05;
            
            // Actualizar puntuación
            score += 100;
            scoreElement.textContent = score;
            
            // Sonido de disparo
            playShotSound();
            
            // Eliminar después de 2 segundos
            setTimeout(() => {
                scene.remove(duck);
                duckModels = duckModels.filter(d => d !== duck);
                
                // Reponer pato si hay espacio
                if (duckModels.length < 5) {
                    createDuck();
                }
            }, 2000);
        }
    }
}

// Reproducir sonido de disparo
function playShotSound() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(1000, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.1);
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.1);
    } catch (e) {
        console.log("Audio no disponible");
    }
}

// Inicializar cuando se cargue la página
window.addEventListener('DOMContentLoaded', () => {
    init();
    
    // Configurar eventos de ratón para disparar
    document.addEventListener('mousedown', onDocumentMouseDown, false);
    document.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
            onDocumentMouseDown(e.touches[0]);
        }
    }, false);
    
    console.log("✅ Duck Hunt AR sin marcadores cargado");
    console.log("📱 Requiere WebXR compatible (Android 8+ / iOS 12+)");
});