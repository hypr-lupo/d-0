// ==UserScript==
// @name         VSaaS - SF
// @namespace    http://tampermonkey.net/
// @version      1.8
// @description  S = SIN NOVEDAD | F = F.POSITIVO (Aceptar → FALSOPOS + Enviar)
// @author       hypr-lupo
// @license      MIT
// @match        https://suite.vsaas.ai/*
// @match        https://suite-back.vsaas.ai/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // -------------------------------------------------
    // CONFIGURACIÓN DE ESTADOS
    // -------------------------------------------------
    const ESTADOS = {
        's': {
            codigo: '-2)',
            nombre: 'SIN NOVEDAD',
            comentarioAlConfirmar: null
        },
        'f': {
            codigo: '-5)',
            nombre: 'F.POSITIVO',
            comentarioAlConfirmar: 'FALSOPOS'
        }
    };

    // Variable para rastrear el comentario pendiente
    let comentarioPendiente = null;

    // Cache del componente para evitar búsquedas repetidas
    let componenteCache = null;
    let ultimaBusqueda = 0;
    const CACHE_DURACION = 5000; // 5 segundos

    // -------------------------------------------------
    // VERIFICAR SI USUARIO ESTÁ ESCRIBIENDO
    // -------------------------------------------------
    function usuarioBloqueandoAtajo() {
        const el = document.activeElement;
        return el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
    }

    // -------------------------------------------------
    // OBTENER COMPONENTE (CON CACHE)
    // -------------------------------------------------
    function obtenerComponente() {
        const ahora = Date.now();

        // Usar cache si es válido
        if (componenteCache && (ahora - ultimaBusqueda) < CACHE_DURACION) {
            if (document.contains(componenteCache)) {
                return componenteCache;
            }
        }

        // Buscar nuevo componente
        componenteCache = document.querySelector('event-state-select');
        ultimaBusqueda = ahora;
        return componenteCache;
    }

    // -------------------------------------------------
    // BUSCAR OPCIÓN EN DROPDOWN (OPTIMIZADO)
    // -------------------------------------------------
    function buscarOpcion(dropdown, config) {
        const opciones = dropdown.querySelectorAll('.ui-select-choices-row');

        for (let i = 0; i < opciones.length; i++) {
            const texto = opciones[i].textContent;
            if (texto.indexOf(config.codigo) === 0 || texto.indexOf(config.nombre) !== -1) {
                return opciones[i];
            }
        }
        return null;
    }

    // -------------------------------------------------
    // EJECUTAR CLICK (MÉTODO MÁS EFECTIVO)
    // -------------------------------------------------
    function ejecutarClick(elemento) {
        elemento.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
        elemento.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        elemento.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
        elemento.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        elemento.click();
    }

    // -------------------------------------------------
    // SELECCIONAR COMENTARIO PREDEFINIDO
    // -------------------------------------------------
    async function seleccionarComentario(textoComentario) {
        // Buscar el label del comentario predefinido
        const labels = document.querySelectorAll('.label-default-comment');
        let labelEncontrado = null;

        for (const label of labels) {
            if (label.textContent.trim() === textoComentario) {
                labelEncontrado = label;
                break;
            }
        }

        if (!labelEncontrado) {
            console.error(`[Comentario] ✗ Label "${textoComentario}" no encontrado`);
            return false;
        }

        console.log(`[Comentario] Seleccionando "${textoComentario}"`);
        ejecutarClick(labelEncontrado);

        // Espera para que Angular actualice el textarea
        await new Promise(r => setTimeout(r, 100));

        return true;
    }

    // -------------------------------------------------
    // APLICAR COMENTARIO (CLICK EN ENVIAR)
    // -------------------------------------------------
    async function aplicarComentario() {
        // Buscar el botón "Enviar"
        const botonEnviar = document.querySelector('.input-group-btn button[ng-click*="addComment"]');

        if (!botonEnviar) {
            console.error('[Comentario] ✗ Botón "Enviar" no encontrado');
            return false;
        }

        // Verificar que no esté deshabilitado
        if (botonEnviar.disabled || botonEnviar.hasAttribute('disabled')) {
            console.warn('[Comentario] ⚠ Botón "Enviar" deshabilitado');
            return false;
        }

        console.log('[Comentario] Enviando comentario...');
        ejecutarClick(botonEnviar);

        await new Promise(r => setTimeout(r, 100));

        return true;
    }

    // -------------------------------------------------
    // PROCESAR COMENTARIO AL CONFIRMAR POPUP
    // -------------------------------------------------
    async function procesarComentarioAlConfirmar() {
        if (!comentarioPendiente) return;

        console.log('[Popup] Usuario confirmó → Procesando comentario');

        // 1. Seleccionar el comentario
        const seleccionado = await seleccionarComentario(comentarioPendiente);

        if (!seleccionado) {
            console.error('[Comentario] ✗ No se pudo seleccionar');
            comentarioPendiente = null;
            return;
        }

        // 2. Enviar el comentario
        const enviado = await aplicarComentario();

        if (enviado) {
            console.log('[Comentario] ✓ Comentario aplicado exitosamente');
        } else {
            console.error('[Comentario] ✗ No se pudo enviar');
        }

        // 3. Limpiar el comentario pendiente
        comentarioPendiente = null;
    }

    // -------------------------------------------------
    // LISTENER PARA EL BOTÓN "ACEPTAR" DEL POPUP
    // -------------------------------------------------
    function configurarListenerPopup() {
        // Usar delegación de eventos en el document
        document.addEventListener('click', function(e) {
            // Verificar si el click fue en el botón "Aceptar" del popup
            const target = e.target;

            // Buscar si el elemento o algún padre es el botón Aceptar
            let botonAceptar = target;
            for (let i = 0; i < 3; i++) {
                if (!botonAceptar) break;

                // Verificar si es el botón Aceptar (btn-danger con ng-click="ctrl.hideEvent()")
                if (botonAceptar.classList &&
                    botonAceptar.classList.contains('btn-danger') &&
                    botonAceptar.getAttribute('ng-click')?.includes('hideEvent')) {

                    // El usuario hizo click en Aceptar
                    if (comentarioPendiente) {
                        // Esperar a que el popup se cierre antes de procesar
                        setTimeout(() => {
                            procesarComentarioAlConfirmar();
                        }, 300);
                    }
                    break;
                }

                botonAceptar = botonAceptar.parentElement;
            }
        }, true); // useCapture = true para capturar en fase de captura
    }

    // -------------------------------------------------
    // FUNCIÓN PRINCIPAL (ULTRA OPTIMIZADA)
    // -------------------------------------------------
    async function cambiarEstado(config) {
        const startTime = performance.now();

        // 1. Obtener componente (con cache)
        const componente = obtenerComponente();
        if (!componente) {
            console.warn(`[${config.codigo}] ✗ Selecciona una alerta`);
            return;
        }

        // 2. Verificar estado actual (rápido)
        const estadoActual = componente.querySelector('.select2-chosen')?.textContent;
        if (estadoActual?.indexOf(config.nombre) !== -1) {
            console.log(`[${config.codigo}] ✓ Ya está en ${config.nombre}`);
            return;
        }

        // 3. Si tiene comentario para después del popup, guardarlo
        if (config.comentarioAlConfirmar) {
            comentarioPendiente = config.comentarioAlConfirmar;
            console.log(`[${config.codigo}] Comentario "${comentarioPendiente}" pendiente de confirmación`);
        }

        // 4. Abrir dropdown
        const boton = componente.querySelector('.select2-choice');
        if (!boton) return;

        boton.click();

        // 5. Buscar dropdown con retry rápido (máximo 5 intentos de 60ms)
        let dropdown = null;
        for (let i = 0; i < 5; i++) {
            await new Promise(r => setTimeout(r, 60));
            dropdown = document.querySelector('.ui-select-dropdown:not(.select2-display-none)');
            if (dropdown) break;
        }

        if (!dropdown) {
            console.error(`[${config.codigo}] ✗ Dropdown no visible`);
            comentarioPendiente = null;
            return;
        }

        // 6. Buscar y hacer click en la opción
        const opcion = buscarOpcion(dropdown, config);
        if (!opcion) {
            console.error(`[${config.codigo}] ✗ Opción no encontrada`);
            document.body.click();
            comentarioPendiente = null;
            return;
        }

        ejecutarClick(opcion);

        // 7. Log final
        const tiempo = (performance.now() - startTime).toFixed(0);
        console.log(`[${config.codigo}] ✓ Estado cambiado (${tiempo}ms)`);

        if (config.comentarioAlConfirmar) {
            console.log(`[${config.codigo}] ⏳ Popup aparecerá → Presiona "Aceptar" para aplicar comentario`);
        }
    }

    // -------------------------------------------------
    // LISTENER DE TECLADO (OPTIMIZADO)
    // -------------------------------------------------
    document.addEventListener('keydown', (e) => {
        const config = ESTADOS[e.key.toLowerCase()];

        if (!config || e.repeat || usuarioBloqueandoAtajo()) return;

        e.preventDefault();
        e.stopPropagation();

        console.log('[Estados] ========================================');
        cambiarEstado(config);
    }, { passive: false });

    // -------------------------------------------------
    // INICIALIZACIÓN
    // -------------------------------------------------
    configurarListenerPopup();

    console.log('%c[Estados] v3.5 ACTIVO ✓', 'color: #4CAF50; font-weight: bold');
    console.log('[Estados] S → SIN NOVEDAD');
    console.log('[Estados] F → F.POSITIVO → Popup → Aceptar → FALSOPOS aplicado');

})();
