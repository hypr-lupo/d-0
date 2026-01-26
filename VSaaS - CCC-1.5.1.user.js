// ==UserScript==
// @name         VSaaS - CCC
// @namespace    http://tampermonkey.net/
// @version      1.5.1
// @description  Copia código de cámara, ajusta título por destacamento y abre imagen con tecla W.
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

    // -------------------------------------------------
    // MAPA DE DESTACAMENTOS
    // -------------------------------------------------
    const DESTACAMENTOS = {
        'SAN CARLOS': 'CS3 - San Carlos',
        'ERRAZURIZ': 'CS2 - Errázuriz',
        'FLEMING': 'CS4 - Fleming',
        'APOQUINDO': 'CS5 - Apoquindo',
        'QUINCHAMALI': 'CS1 - Quinchamalí',
        'CENTRO CIVICO': 'CS6 - El Golf'
    };

    // -------------------------------------------------
    // EXTRAER CÓDIGO DE CÁMARA
    // -------------------------------------------------
    function extraerCodigoDesdeH3(h3) {
        if (!h3) return null;

        const fuente = h3.getAttribute('title') || h3.innerText || '';
        const match = fuente.match(/\b[A-Z0-9]{2,10}-\d{1,3}\b/);

        return match ? match[0] : null;
    }

    // -------------------------------------------------
    // OBTENER DESTACAMENTO DESDE BREADCRUMB
    // -------------------------------------------------
    function obtenerDestacamento() {
        const enlaces = document.querySelectorAll('a.ng-binding');

        for (const a of enlaces) {
            const texto = a.innerText
                ?.normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .toUpperCase()
                .trim();

            if (!texto) continue;

            for (const clave in DESTACAMENTOS) {
                if (texto.includes(clave)) {
                    return DESTACAMENTOS[clave];
                }
            }
        }
        return null;
    }

    // -------------------------------------------------
    // ACTUALIZAR TÍTULO DE LA PESTAÑA
    // -------------------------------------------------
    function actualizarTitulo(destacamento, codigo) {
        const partes = [];
        if (destacamento) partes.push(destacamento);
        if (codigo) partes.push(codigo);
        document.title = partes.length ? partes.join(' | ') : 'VSaaS';
    }

    // -------------------------------------------------
    // OBSERVAR CAMBIO DE ALERTA
    // -------------------------------------------------
    function observarH3() {
        const h3 = document.querySelector('h3.ng-binding');
        if (!h3) return;

        const observer = new MutationObserver(() => {
            const codigo = extraerCodigoDesdeH3(h3);
            const destacamento = obtenerDestacamento();

            let actualizar = false;

            if (codigo && codigo !== ultimoCodigo) {
                ultimoCodigo = codigo;
                GM_setClipboard(codigo);
                console.log('[VSaaS CCC] Código copiado:', codigo);
                actualizar = true;
            }

            if (destacamento && destacamento !== ultimoDestacamento) {
                ultimoDestacamento = destacamento;
                console.log('[VSaaS CCC] Destacamento:', destacamento);
                actualizar = true;
            }

            if (actualizar) {
                actualizarTitulo(ultimoDestacamento, ultimoCodigo);
            }
        });

        observer.observe(h3, {
            childList: true,
            characterData: true,
            subtree: true
        });
    }

    // -------------------------------------------------
    // DETECTAR SI EL USUARIO ESTÁ ESCRIBIENDO
    // -------------------------------------------------
    function usuarioEscribiendo() {
        const el = document.activeElement;
        if (!el) return false;

        return (
            el.tagName === 'INPUT' ||
            el.tagName === 'TEXTAREA' ||
            el.isContentEditable === true
        );
    }

    // -------------------------------------------------
    // DETECTAR FOCO EN DROPDOWN (UI-SELECT / SELECT2)
    // -------------------------------------------------
    function focoEnDropdown() {
        const el = document.activeElement;
        if (!el) return false;

        return (
            el.closest('.ui-select-container') ||
            el.closest('.select2-container') ||
            el.classList.contains('select2-choice') ||
            el.getAttribute('aria-label') === 'Select box select'
        );
    }

    // -------------------------------------------------
    // ABRIR IMAGEN DE ALERTA (TECLA W)
    // -------------------------------------------------
    function abrirImagenAlerta() {
        const linkImagen = document.querySelector(
            'a[href*="/api/sensors/"][href*="/download/"][target="_blank"]'
        );

        if (linkImagen && linkImagen.href) {
            linkImagen.click();
            console.log('[VSaaS CCC] Imagen abierta con tecla W');
        }
    }

    // -------------------------------------------------
    // ATAJO DE TECLADO
    // -------------------------------------------------
    document.addEventListener('keydown', (e) => {
        if (e.repeat) return;
        if (e.key.toLowerCase() !== 'w') return;

        if (usuarioEscribiendo()) return;
        if (focoEnDropdown()) return;

        abrirImagenAlerta();
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
