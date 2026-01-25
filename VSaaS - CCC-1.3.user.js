// ==UserScript==
// @name         VSaaS - CCC
// @namespace    http://tampermonkey.net/
// @version      1.3
// @description  Al seleccionar una alerta copia automáticamente el código de cámara al portapapeles.
// @author       hypr-lupo
// @license      MIT
// @match        https://suite.vsaas.ai/*
// @match        https://suite-back.vsaas.ai/*
// @grant        GM_setClipboard
// ==/UserScript==

(function () {
    'use strict';

    let ultimoCodigo = null;

    // -------------------------------------------------
    // EXTRAER CÓDIGO DE CÁMARA (ROBUSTO)
    // -------------------------------------------------
    function extraerCodigoDesdeH3(h3) {
        if (!h3) return null;

        // Priorizar fuente más estable
        const fuente = h3.getAttribute('title') || h3.innerText || '';

        // Patrón de código (PR2-01, CAM12-03, etc.)
        const match = fuente.match(/\b[A-Z0-9]{2,10}-\d{1,3}\b/);

        return match ? match[0] : null;
    }

    function observarH3() {
        const h3 = document.querySelector('h3.ng-binding');
        if (!h3) return;

        const observer = new MutationObserver(() => {
            const codigo = extraerCodigoDesdeH3(h3);

            if (codigo && codigo !== ultimoCodigo) {
                ultimoCodigo = codigo;
                GM_setClipboard(codigo);
                console.log('[VSaaS CCC] Código copiado:', codigo);
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

