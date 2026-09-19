document.addEventListener("DOMContentLoaded", () => {

    // ---------- Elementos ----------
    const btnOn   = document.getElementById('btn-on');
    const btnForw = document.getElementById('btn-forw');
    const btnStop = document.getElementById('btn-stop');
    const btnBack = document.getElementById('btn-back');
    const btnOff  = document.getElementById('btn-off');
    const btnWheelie = document.getElementById('btn-wheelie');

    const vehicle    = document.querySelector('.vehicle-container');
    const vehicleImg = document.querySelector('.vehicle-img');
    const btnPrev    = document.getElementById('btn-prev');
    const btnNext    = document.getElementById('btn-next');

    // Textos que cambian según la moto
    const logoEl   = document.querySelector('.logo-circle');
    const brandEl  = document.querySelector('.brand-name');
    const markEl   = document.querySelector('.watermark');
    const titleEl  = document.querySelector('.nav-title');
    const footerEl = document.querySelector('.app-footer');

    // ---------- Catálogo de motos ----------
    // width: ancho en px de la moto · pivot: punto de la rueda trasera (para el wheelie)
    // wheelie: ángulo al levantar la rueda delantera
    const BIKES = [
        { brand: 'Kawasaki', logo: 'K', model: 'Z1000',
          src: '../src/imgs/moto-z1000.png',      width: 224, pivot: '17% 97%',   wheelie: '-26deg' },
        { brand: 'Kawasaki', logo: 'K', model: 'Z900RS',
          src: '../src/imgs/moto-clasica.png',    width: 215, pivot: '19% 97%',   wheelie: '-26deg' },
        { brand: 'Kawasaki', logo: 'K', model: 'KLX',
          src: '../src/imgs/moto-motocross.png',  width: 195, pivot: '15.8% 97%', wheelie: '-32deg' },
        { brand: 'Kawasaki', logo: 'K', model: 'Beat',
          src: '../src/imgs/moto-automatica.png', width: 205, pivot: '14.6% 97%', wheelie: '-22deg' }
    ];
    let bikeIndex = 0;
    let swapToken = 0;

    // Precargamos las imágenes para que el cambio sea instantáneo
    BIKES.forEach(b => { const im = new Image(); im.src = b.src; });

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
    const MAX_WHEELIE = 400;  // en caballito va más rápido
    const WHEELIE_MIN = 150;  // velocidad mínima para levantar la rueda delantera

    // ---------- Estado ----------
    let engineOn    = false;
    let wheelie     = false;  // caballito solicitado
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

    // ---------- Aviso si falta una imagen ----------
    // Si el navegador no encuentra la imagen, lo dice en pantalla y en la consola (F12)
    const warnEl = document.createElement('div');
    warnEl.style.cssText = 'position:absolute;left:8px;right:8px;top:8px;z-index:10;display:none;' +
        'background:rgba(180,0,0,.88);color:#fff;font:bold 11px Arial,sans-serif;padding:6px 8px;border-radius:6px;';
    vehicle.parentElement.appendChild(warnEl);

    vehicleImg.addEventListener('error', () => {
        const file = vehicleImg.getAttribute('src');
        console.error('No se encontró la imagen de la moto:', file);
        warnEl.textContent = `⚠ No se encuentra la imagen: ${file}  (revisa que esté en la carpeta src/imgs)`;
        warnEl.style.display = 'block';
    });
    vehicleImg.addEventListener('load', () => { warnEl.style.display = 'none'; });

    // ---------- Aplicar imagen y medidas de una moto ----------
    function applyBikeImage(bike) {
        vehicleImg.src = bike.src;
        vehicleImg.alt = `${bike.brand} ${bike.model}`;
        vehicle.style.setProperty('--bike-w', `${bike.width}px`);
        vehicleImg.style.setProperty('--pivot', bike.pivot);
        vehicleImg.style.setProperty('--wheelie-angle', bike.wheelie);
    }

    // ---------- Cambiar de moto ----------
    // dir = +1 (Next) o -1 (Prev): define hacia dónde sale / de dónde entra la moto
    function showBike(newIndex, dir, instant = false) {
        bikeIndex = (newIndex + BIKES.length) % BIKES.length;
        const bike  = BIKES[bikeIndex];
        const token = ++swapToken;

        // Textos (marca, modelo, logo)
        logoEl.textContent   = bike.logo;
        brandEl.textContent  = bike.brand;
        markEl.textContent   = bike.brand;
        footerEl.textContent = bike.brand;
        titleEl.textContent  = bike.model.toUpperCase();

        // Al cargar la página se muestra directo, sin animación
        if (instant) { applyBikeImage(bike); return; }

        // 1) La moto actual sale con fundido
        vehicleImg.style.setProperty('--swap-dx', `${-dir * 40}px`);
        vehicleImg.classList.add('is-swapping');

        setTimeout(() => {
            if (token !== swapToken) return;   // si hubo otro clic, este cambio ya no vale

            // 2) Cambiamos la imagen y sus medidas
            applyBikeImage(bike);

            // 3) La nueva entra desde el lado contrario
            vehicleImg.style.setProperty('transition', 'none', 'important');
            vehicleImg.style.setProperty('--swap-dx', `${dir * 40}px`);
            void vehicleImg.offsetWidth;                  // fuerza a aplicar la posición inicial
            vehicleImg.style.removeProperty('transition');
            vehicleImg.classList.remove('is-swapping');
        }, 180);
    }

    btnPrev.addEventListener('click', () => showBike(bikeIndex - 1, -1));
    btnNext.addEventListener('click', () => showBike(bikeIndex + 1, +1));

    // ---------- Botones habilitados / deshabilitados ----------
    function updateButtons() {
        btnOn.disabled   = engineOn;
        btnOff.disabled  = !engineOn;
        btnForw.disabled = !engineOn;
        btnBack.disabled = !engineOn;
        btnStop.disabled = !engineOn;
        btnWheelie.disabled = !engineOn;
        btnWheelie.classList.toggle('is-active', wheelie);
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

        // La rueda delantera solo se levanta si ya vamos suficientemente rápido hacia adelante
        vehicle.classList.toggle('is-wheelie', wheelie && speed <= -WHEELIE_MIN);

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
        vehicle.style.filter = 'drop-shadow(0 10px 15px var(--bike-glow))';
        updateButtons();
    });

    // FORW: acelera hacia adelante → el paisaje se desplaza a la izquierda
    btnForw.addEventListener('click', () => {
        if (!engineOn) return;
        wheelie = false;
        targetSpeed = -MAX_FORWARD;
        decel = BRAKE;
        startLoop();
    });

    // BACK: marcha atrás → el paisaje se desplaza a la derecha
    btnBack.addEventListener('click', () => {
        if (!engineOn) return;
        wheelie = false;
        targetSpeed = MAX_BACK;
        decel = BRAKE;
        startLoop();
    });

    // STOP: frena hasta detenerse (el motor sigue encendido)
    btnStop.addEventListener('click', () => {
        if (!engineOn) return;
        wheelie = false;
        targetSpeed = 0;
        decel = BRAKE;
        startLoop();
    });

    // WHEELIE: acelera a fondo y levanta la rueda delantera (púlsalo otra vez para bajarla)
    btnWheelie.addEventListener('click', () => {
        if (!engineOn) return;
        wheelie = !wheelie;
        targetSpeed = wheelie ? -MAX_WHEELIE : -MAX_FORWARD;
        decel = BRAKE;
        updateButtons();
        startLoop();
    });

    // OFF: apaga el motor; si iba en movimiento se detiene por inercia
    btnOff.addEventListener('click', () => {
        if (!engineOn) return;
        engineOn = false;
        wheelie = false;
        targetSpeed = 0;
        decel = COAST;
        vehicle.classList.remove('is-on');
        vehicle.style.filter = 'drop-shadow(0 10px 10px rgba(0, 0, 0, 0.7))';
        updateButtons();
        startLoop();
    });

    // ---------- Tema claro / oscuro ----------
    // El tema se guarda en <html data-theme="..."> y en localStorage para recordarlo.
    const themeBtns = document.querySelectorAll('[data-theme-set]');

    function setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        themeBtns.forEach(b => {
            const active = b.dataset.themeSet === theme;
            b.classList.toggle('is-active', active);
            b.setAttribute('aria-pressed', active);
        });
        try { localStorage.setItem('vehicle-theme', theme); } catch (e) { /* sin almacenamiento */ }
    }

    themeBtns.forEach(b => b.addEventListener('click', () => setTheme(b.dataset.themeSet)));
    setTheme(document.documentElement.getAttribute('data-theme') || 'dark');

    // Estado inicial: solo se puede pulsar "On"
    updateButtons();
    renderWorld();
    showBike(0, +1, true);
});