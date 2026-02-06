// ==UserScript==
// @name         VSaaS - SF
// @namespace    http://tampermonkey.net/
// @version      1.5
// @description  S = SIN NOVEDAD | F = F.POSITIVO + Comentario
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
            requiereComentario: false
        },
        'f': {
            codigo: '-5)',
            nombre: 'F.POSITIVO',
            requiereComentario: true,
            comentario: 'FALSOPOS'
        }
    };

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
    // AGREGAR COMENTARIO PREDEFINIDO
    // -------------------------------------------------
    async function agregarComentario(textoComentario) {
        // 1. Buscar el label del comentario predefinido
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

        console.log(`[Comentario] Haciendo click en "${textoComentario}"...`);
        ejecutarClick(labelEncontrado);

        // Pequeña espera para que Angular procese
        await new Promise(r => setTimeout(r, 100));

        // 2. Buscar y hacer click en el botón "Enviar"
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

        console.log('[Comentario] Haciendo click en "Enviar"...');
        ejecutarClick(botonEnviar);

        // Esperar a que el comentario se envíe
        await new Promise(r => setTimeout(r, 200));

        console.log('[Comentario] ✓ Comentario enviado');
        return true;
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

        // 3. Si requiere comentario, agregarlo primero
        if (config.requiereComentario) {
            const comentarioExitoso = await agregarComentario(config.comentario);
            if (!comentarioExitoso) {
                console.error(`[${config.codigo}] ✗ No se pudo agregar comentario`);
                return;
            }
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
            return;
        }

        // 6. Buscar y hacer click en la opción
        const opcion = buscarOpcion(dropdown, config);
        if (!opcion) {
            console.error(`[${config.codigo}] ✗ Opción no encontrada`);
            document.body.click();
            return;
        }

        ejecutarClick(opcion);

        // 7. Log final
        const tiempo = (performance.now() - startTime).toFixed(0);
        console.log(`[${config.codigo}] ✓ Completado (${tiempo}ms)`);
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
    console.log('%c[Estados] v3.1 ACTIVO ✓', 'color: #4CAF50; font-weight: bold');
    console.log('[Estados] S → SIN NOVEDAD | F → F.POSITIVO + FALSOPOS');

})();
