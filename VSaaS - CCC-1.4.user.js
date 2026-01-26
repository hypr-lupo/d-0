// ==UserScript==
// @name         VSaaS - CCC
// @namespace    http://tampermonkey.net/
// @version      1.4
// @description  Al seleccionar una alerta copia automáticamente el código de cámara al portapapeles. además de cambiar el nombre de la pestaña
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
    // MAPA DE DESTACAMENTOS (DEFINITIVO)
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
    // OBSERVAR CAMBIO DE ALERTA (H3)
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
    // ESPERAR A QUE ANGULAR RENDERICE
    // -------------------------------------------------
    const waitForH3 = setInterval(() => {
        if (document.querySelector('h3.ng-binding')) {
            clearInterval(waitForH3);
            observarH3();
            console.log('[VSaaS CCC] Tampermonkey activo');
        }
    }, 500);

})();

