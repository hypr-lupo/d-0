// ==UserScript==
// @name         VSaaS - CCC
// @namespace    http://tampermonkey.net/
// @version      1.7
// @description  Copia código de cámara, ajusta título de pestaña por destacamento, abre imagen con W y navega con A/D.
// @author       hypr-lupo
// @license      MIT
// @match        https://suite.vsaas.ai/*
// @match        https://suite-back.vsaas.ai/*
// @grant        GM_setClipboard
// ==/UserScript==

(function () {
    'use strict';

    let ultimoCodigo = null;
    let ultimoDestacamento = null;
    let observerActivo = false;

    // -------------------------------------------------
    // MAPA DE DESTACAMENTOS
    // -------------------------------------------------
    const DESTACAMENTOS = {
        'SAN CARLOS': 'CS3 - San Carlos',
        'ERRAZURIZ': 'CS2 - Errázuriz',
        'FLEMING': 'CS4 - Fleming',
        'APOQUINDO': 'CS5 - Apoquindo',
        'QUINCHAMALI': 'CS1 - Quinchamalí',
        'CENTRO CIVICO': 'CS6 - El Golf',
        'ANALITICA GENERAL': 'ANAL GENERAL'
    };

    const CLAVES_DESTACAMENTOS = Object.keys(DESTACAMENTOS);

    // -------------------------------------------------
    // EXTRAER CÓDIGO DE CÁMARA
    // -------------------------------------------------
    function extraerCodigoDesdeH3(h3) {
        const fuente = h3?.getAttribute('title') || h3?.innerText || '';
        const match = fuente.match(/\b[A-Z0-9]{2,10}-\d{1,3}\b/);
        return match?.[0] || null;
    }

    // -------------------------------------------------
    // OBTENER DESTACAMENTO (con cache)
    // -------------------------------------------------
    function obtenerDestacamento() {
        if (ultimoDestacamento) return ultimoDestacamento;

        const enlaces = document.querySelectorAll('a.ng-binding');

        for (const a of enlaces) {
            const texto = a.innerText
                ?.normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .toUpperCase()
                .trim();

            if (!texto) continue;

            for (const clave of CLAVES_DESTACAMENTOS) {
                if (texto.includes(clave)) {
                    return DESTACAMENTOS[clave];
                }
            }
        }
        return null;
    }

    // -------------------------------------------------
    // ACTUALIZAR TÍTULO
    // -------------------------------------------------
    function actualizarTitulo() {
        const partes = [];
        if (ultimoDestacamento) partes.push(ultimoDestacamento);
        if (ultimoCodigo) partes.push(ultimoCodigo);
        document.title = partes.length ? partes.join(' | ') : 'VSaaS';
    }

    // -------------------------------------------------
    // OBSERVAR CAMBIO DE ALERTA
    // -------------------------------------------------
    function observarH3() {
        if (observerActivo) return;

        const h3 = document.querySelector('h3.ng-binding');
        if (!h3) return;

        observerActivo = true;

        const observer = new MutationObserver(() => {
            let cambio = false;

            const codigo = extraerCodigoDesdeH3(h3);
            if (codigo && codigo !== ultimoCodigo) {
                ultimoCodigo = codigo;
                GM_setClipboard(codigo);
                console.log('[VSaaS CCC] Código copiado:', codigo);
                cambio = true;
            }

            const destacamento = obtenerDestacamento();
            if (destacamento && destacamento !== ultimoDestacamento) {
                ultimoDestacamento = destacamento;
                console.log('[VSaaS CCC] Destacamento:', destacamento);
                cambio = true;
            }

            if (cambio) actualizarTitulo();
        });

        observer.observe(h3, {
            childList: true,
            characterData: true,
            subtree: true
        });
    }

    // -------------------------------------------------
    // DROPDOWN: ¿ESTÁ REALMENTE ABIERTO?
    // -------------------------------------------------
    function dropdownAbierto() {
        const el = document.activeElement;
        if (!el) return false;

        const contenedor =
            el.closest('.ui-select-container') ||
            el.closest('.select2-container');

        if (!contenedor) return false;

        return (
            contenedor.classList.contains('open') ||
            contenedor.classList.contains('ui-select-open') ||
            contenedor.classList.contains('select2-container--open') ||
            contenedor.getAttribute('aria-expanded') === 'true'
        );
    }

    // -------------------------------------------------
    // LIBERAR FOCO TRAS USAR DROPDOWN
    // -------------------------------------------------
    function liberarFocoSiDropdown() {
        const el = document.activeElement;
        if (!el) return;

        if (
            el.closest('.ui-select-container') ||
            el.closest('.select2-container')
        ) {
            el.blur();
            document.body.focus();
        }
    }

    document.addEventListener('click', () => {
        setTimeout(liberarFocoSiDropdown, 0);
    }, true);

    // -------------------------------------------------
    // BLOQUEO GENERAL DE ATAJO
    // -------------------------------------------------
    function usuarioBloqueandoAtajo() {
        const el = document.activeElement;
        if (!el) return false;

        return (
            el.tagName === 'INPUT' ||
            el.tagName === 'TEXTAREA' ||
            el.isContentEditable
        );
    }

    // -------------------------------------------------
    // ABRIR IMAGEN
    // -------------------------------------------------
    function abrirImagenAlerta() {
        const link = document.querySelector(
            'a[href*="/api/sensors/"][href*="/download/"][target="_blank"]'
        );
        if (link?.href) {
            link.click();
            console.log('[VSaaS CCC] Imagen abierta con tecla W');
        }
    }

    // -------------------------------------------------
    // NAVEGAR IMÁGENES (A / D)
    // -------------------------------------------------
    function navegarImagen(direccion) {
        const selector = direccion === 'left' ? 'a.prev' : 'a.next';
        const flecha = document.querySelector(selector);

        if (!flecha) return;
        if (flecha.classList.contains('disabled')) return;

        flecha.click();

        console.log(
            `[VSaaS CCC] Imagen ${direccion === 'left' ? 'anterior' : 'siguiente'}`
        );
    }

    // -------------------------------------------------
    // ATAJOS DE TECLADO (W / A / D)
    // -------------------------------------------------
    document.addEventListener('keydown', (e) => {
        if (e.repeat) return;

        const key = e.key.toLowerCase();

        if (usuarioBloqueandoAtajo()) return;
        if (dropdownAbierto()) return;

        if (key === 'w') {
            abrirImagenAlerta();
        }

        if (key === 'a') {
            navegarImagen('left');
        }

        if (key === 'd') {
            navegarImagen('right');
        }
    });

    // -------------------------------------------------
    // ESPERAR A ANGULAR
    // -------------------------------------------------
    const waitForH3 = setInterval(() => {
        if (document.querySelector('h3.ng-binding')) {
            clearInterval(waitForH3);
            observarH3();
            console.log('[VSaaS CCC] Tampermonkey activo');
        }
    }, 500);

})();
