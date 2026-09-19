document.addEventListener("DOMContentLoaded", () => {

    // ---------- Elementos ----------
    const btnOn   = document.getElementById('btn-on');
    const btnForw = document.getElementById('btn-forw');
    const btnStop = document.getElementById('btn-stop');
    const btnBack = document.getElementById('btn-back');
    const btnOff  = document.getElementById('btn-off');

    const vehicle = document.querySelector('.vehicle-container');

    // factor = qué tan rápido se mueve cada capa (efecto parallax):
    // lo lejano (cielo) se mueve poco, lo cercano (carretera) se mueve a tope.
    // y = posición vertical que se conserva (debe coincidir con el CSS).
    const LAYERS = [
        { el: document.querySelector('.layer-clouds'),    factor: 0.15, y: 'top'    },
        { el: document.querySelector('.layer-mountains'), factor: 0.45, y: 'bottom' },
        { el: document.querySelector('.layer-road'),      factor: 1.00, y: 'bottom' }
    ];

    // ---------- Configuración (píxeles por segundo) ----------
    const MAX_FORWARD = 320;  // velocidad máxima hacia adelante
    const MAX_BACK    = 180;  // marcha atrás, más lenta
    const ACCEL       = 260;  // qué tan rápido acelera
    const BRAKE       = 520;  // qué tan rápido frena (Stop)
    const COAST       = 160;  // frenado suave por inercia al apagar (Off)

    // ---------- Estado ----------
    let engineOn    = false;
    let worldX      = 0;   // desplazamiento total del mundo
    let speed       = 0;   // velocidad actual del mundo (px/s). Negativo = la moto avanza
    let targetSpeed = 0;   // velocidad a la que queremos llegar
    let decel       = BRAKE;
    let lastTime    = null;
    let rafId       = null;

    // ---------- Dibujo ----------
    function renderWorld() {
        for (const { el, factor, y } of LAYERS) {
            if (el) el.style.backgroundPosition = `${worldX * factor}px ${y}`;
        }
    }

    // ---------- Botones habilitados / deshabilitados ----------
    function updateButtons() {
        btnOn.disabled   = engineOn;
        btnOff.disabled  = !engineOn;
        btnForw.disabled = !engineOn;
        btnBack.disabled = !engineOn;
        btnStop.disabled = !engineOn;
    }

    // ---------- Bucle de animación ----------
    function loop(now) {
        if (lastTime === null) lastTime = now;
        const dt = Math.min((now - lastTime) / 1000, 0.05); // segundos (con tope)
        lastTime = now;

        // Acercamos la velocidad actual a la deseada (aceleración / frenado suave)
        if (speed !== targetSpeed) {
            const rate = (Math.abs(targetSpeed) > Math.abs(speed)) ? ACCEL : decel;
            const step = rate * dt;
            if (Math.abs(targetSpeed - speed) <= step) {
                speed = targetSpeed;
            } else {
                speed += Math.sign(targetSpeed - speed) * step;
            }
        }

        worldX += speed * dt;
        renderWorld();

        // La moto "vibra más" mientras se mueve
        vehicle.classList.toggle('is-moving', Math.abs(speed) > 1);

        // Si ya estamos quietos y no hay nada que animar, detenemos el bucle
        if (speed === 0 && targetSpeed === 0) {
            rafId = null;
            lastTime = null;
            return;
        }
        rafId = requestAnimationFrame(loop);
    }

    function startLoop() {
        if (rafId === null) rafId = requestAnimationFrame(loop);
    }

    // ---------- Acciones ----------
    // ON: enciende el motor (la moto vibra y brilla en verde)
    btnOn.addEventListener('click', () => {
        engineOn = true;
        vehicle.classList.add('is-on');
        vehicle.style.filter = 'drop-shadow(0 10px 15px rgba(57, 255, 20, 0.55))';
        updateButtons();
    });

    // FORW: acelera hacia adelante → el paisaje se desplaza a la izquierda
    btnForw.addEventListener('click', () => {
        if (!engineOn) return;
        targetSpeed = -MAX_FORWARD;
        decel = BRAKE;
        startLoop();
    });

    // BACK: marcha atrás → el paisaje se desplaza a la derecha
    btnBack.addEventListener('click', () => {
        if (!engineOn) return;
        targetSpeed = MAX_BACK;
        decel = BRAKE;
        startLoop();
    });

    // STOP: frena hasta detenerse (el motor sigue encendido)
    btnStop.addEventListener('click', () => {
        if (!engineOn) return;
        targetSpeed = 0;
        decel = BRAKE;
        startLoop();
    });

    // OFF: apaga el motor; si iba en movimiento se detiene por inercia
    btnOff.addEventListener('click', () => {
        if (!engineOn) return;
        engineOn = false;
        targetSpeed = 0;
        decel = COAST;
        vehicle.classList.remove('is-on');
        vehicle.style.filter = 'drop-shadow(0 10px 10px rgba(0, 0, 0, 0.7))';
        updateButtons();
        startLoop();
    });

    // Estado inicial: solo se puede pulsar "On"
    updateButtons();
    renderWorld();
});
