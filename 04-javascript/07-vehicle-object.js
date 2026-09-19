document.addEventListener("DOMContentLoaded", () => {
    const btnOn   = document.getElementById('btn-on');
    const btnForw = document.getElementById('btn-forw');
    const btnStop = document.getElementById('btn-stop');
    const btnBack = document.getElementById('btn-back');
    const btnOff  = document.getElementById('btn-off');

    const layerClouds    = document.querySelector('.layer-clouds');
    const layerMountains = document.querySelector('.layer-mountains');
    const layerRoad      = document.querySelector('.layer-road');
    const vehicle        = document.querySelector('.vehicle-container');

    // Mantiene la posición vertical (y) alineada con CSS
    const LAYERS = [
        { el: layerClouds,    factor: 0.15, y: 'top' },    // Nubes ancladas arriba
        { el: layerMountains, factor: 0.45, y: 'bottom' }, // Montañas alineadas con el suelo
        { el: layerRoad,      factor: 1.00, y: 'bottom' }  // Carretera anclada abajo
    ];

    let engineOn = false;
    let speed    = 0;
    let worldX   = 0;

    function renderWorld() {
        for (const { el, factor, y } of LAYERS) {
            if (el) {
                el.style.backgroundPosition = `${worldX * factor}px ${y}`;
            }
        }
    }

    btnOn.addEventListener('click', () => {
        engineOn = true;
        vehicle.classList.add('is-on');
        vehicle.style.filter = 'drop-shadow(0 10px 15px rgba(57, 255, 20, 0.55))';
    });

    btnOff.addEventListener('click', () => {
        engineOn = false;
        speed = 0;
        worldX = 0;
        renderWorld();
        vehicle.classList.remove('is-on', 'is-moving');
        vehicle.style.filter = 'drop-shadow(0 10px 10px rgba(0, 0, 0, 0.7))';
    });

    btnForw.addEventListener('click', () => {
        if (!engineOn) return;
        speed = -5;
        vehicle.classList.add('is-moving');
    });

    btnBack.addEventListener('click', () => {
        if (!engineOn) return;
        speed = 5;
        vehicle.classList.add('is-moving');
    });

    btnStop.addEventListener('click', () => {
        speed = 0;
        vehicle.classList.remove('is-moving');
    });

    function animate() {
        if (speed !== 0) {
            worldX += speed;
            renderWorld();
        }
        requestAnimationFrame(animate);
    }
    animate();
});