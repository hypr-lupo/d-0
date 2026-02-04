// ==UserScript==
// @name         VSaaS - S
// @namespace    http://tampermonkey.net/
// @version      1
// @description  Cambia el estado de la alerta a "SIN NOVEDAD" con la tecla S
// @author       hypr-lupo
// @license      MIT
// @match        https://suite.vsaas.ai/*
// @match        https://suite-back.vsaas.ai/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

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
    // CAMBIAR ESTADO A SIN NOVEDAD
    // -------------------------------------------------
    async function cambiarEstadoSinNovedad() {
        try {
            // Buscar el componente de estado
            const componenteEstado = document.querySelector('event-state-select');
            if (!componenteEstado) {
                console.warn('[Estado SN] ✗ Selecciona una alerta primero');
                return;
            }

            // Verificar estado actual visible
            const estadoActualSpan = componenteEstado.querySelector('.select2-chosen');
            const estadoActualTexto = estadoActualSpan?.textContent?.trim() || '';

            console.log(`[Estado SN] Estado actual: "${estadoActualTexto}"`);

            if (estadoActualTexto.includes('SIN NOVEDAD')) {
                console.log('[Estado SN] ✓ Ya está en SIN NOVEDAD');
                return;
            }

            // Abrir el dropdown
            const botonDropdown = componenteEstado.querySelector('.select2-choice, .ui-select-match');
            if (!botonDropdown) {
                console.error('[Estado SN] ✗ Botón no encontrado');
                return;
            }

            console.log('[Estado SN] Abriendo dropdown...');
            botonDropdown.click();

            // Esperar a que el dropdown se renderice
            await new Promise(resolve => setTimeout(resolve, 300));

            // Buscar el dropdown visible
            const dropdown = document.querySelector('.ui-select-dropdown:not(.select2-display-none)');
            if (!dropdown) {
                console.error('[Estado SN] ✗ Dropdown no visible');
                return;
            }

            // Buscar TODAS las opciones
            const opciones = dropdown.querySelectorAll('.ui-select-choices-row');
            console.log(`[Estado SN] Opciones encontradas: ${opciones.length}`);

            // Buscar "-2) SIN NOVEDAD" específicamente
            let opcionEncontrada = null;
            for (const opcion of opciones) {
                const texto = opcion.textContent?.trim() || '';
                if (texto.startsWith('-2)') || texto.includes('SIN NOVEDAD')) {
                    opcionEncontrada = opcion;
                    console.log(`[Estado SN] ✓ Encontrada: "${texto}"`);
                    break;
                }
            }

            if (!opcionEncontrada) {
                console.error('[Estado SN] ✗ Opción SIN NOVEDAD no encontrada');
                // Cerrar dropdown
                document.body.click();
                return;
            }

            // HACER CLICK EN LA OPCIÓN
            console.log('[Estado SN] Haciendo click...');

            // Método 1: Simular hover (importante para ui-select)
            const eventosHover = [
                new MouseEvent('mouseenter', { bubbles: true, cancelable: true }),
                new MouseEvent('mouseover', { bubbles: true, cancelable: true })
            ];
            eventosHover.forEach(e => opcionEncontrada.dispatchEvent(e));

            // Esperar un momento
            await new Promise(resolve => setTimeout(resolve, 50));

            // Método 2: Click completo
            const eventosClick = [
                new MouseEvent('mousedown', { bubbles: true, cancelable: true }),
                new MouseEvent('mouseup', { bubbles: true, cancelable: true }),
                new MouseEvent('click', { bubbles: true, cancelable: true })
            ];
            eventosClick.forEach(e => opcionEncontrada.dispatchEvent(e));

            // Método 3: Click directo
            opcionEncontrada.click();

            // Método 4: Click en el elemento interno (select2-result-label)
            const elementoInterno = opcionEncontrada.querySelector('.select2-result-label, .ui-select-choices-row-inner');
            if (elementoInterno) {
                elementoInterno.click();
            }

            console.log('[Estado SN] ✓✓✓ Click ejecutado exitosamente');

            // Esperar un momento y verificar el cambio
            await new Promise(resolve => setTimeout(resolve, 500));

            const nuevoEstado = componenteEstado.querySelector('.select2-chosen')?.textContent?.trim() || '';
            if (nuevoEstado.includes('SIN NOVEDAD')) {
                console.log('[Estado SN] 🎉 ÉXITO - Estado cambiado a SIN NOVEDAD');
            } else {
                console.warn(`[Estado SN] ⚠ Estado actual después del click: "${nuevoEstado}"`);
            }

        } catch (error) {
            console.error('[Estado SN] Error:', error);
        }
    }

    // -------------------------------------------------
    // LISTENER DE TECLADO
    // -------------------------------------------------
    document.addEventListener('keydown', (e) => {
        if (e.key.toLowerCase() !== 's' || e.repeat) return;
        if (usuarioBloqueandoAtajo()) return;

        e.preventDefault();
        e.stopPropagation();

        console.log('[Estado SN] ========================================');
        cambiarEstadoSinNovedad();
    });

    // -------------------------------------------------
    // INICIALIZACIÓN
    // -------------------------------------------------
    console.log('%c[Estado SN] v2.0 ACTIVO ✓', 'color: #4CAF50; font-weight: bold; font-size: 14px');
    console.log('[Estado SN] Presiona "S" para cambiar a SIN NOVEDAD');

})();