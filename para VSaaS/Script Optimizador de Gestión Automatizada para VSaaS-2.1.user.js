// ==UserScript==
// @name         SOGA
// @namespace    http://tampermonkey.net/
// @version      2.1
// @description  Script Optimizador de Gestión Automatizada para VSaaS | W/A/D + S/F/Q
// @author       Leonardo Navarro (hypr-lupo)
// @copyright    2025-2026 Leonardo Navarro
// @license      MIT
// @match        https://suite.vsaas.ai/*
// @match        https://suite-back.vsaas.ai/*
// @grant        GM_setClipboard
// ==/UserScript==

/*
 * ═══════════════════════════════════════════════════════════════════
 * SOGA - VSaaS Productivity Suite
 * Copyright (c) 2026-2027 Leonardo Navarro
 *
 * Script Optimizador de Gestión Automatizada para VSaaS.
 *
 * Licensed under MIT License
 *
 * AVISO: Si usas este código, por favor mantén este aviso de
 * copyright y considera contribuir mejoras de vuelta a la comunidad.
 * ═══════════════════════════════════════════════════════════════════
 */

(function () {
    'use strict';

    // ═════════════════════════════════════════════════
    // MÓDULO CCC - Gestión de Códigos y Navegación
    // ═════════════════════════════════════════════════

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
                console.log('[SOGA] Código copiado:', codigo);
                cambio = true;
            }

            const destacamento = obtenerDestacamento();
            if (destacamento && destacamento !== ultimoDestacamento) {
                ultimoDestacamento = destacamento;
                console.log('[SOGA] Destacamento:', destacamento);
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
    // ABRIR IMAGEN
    // -------------------------------------------------
    function abrirImagenAlerta() {
        const link = document.querySelector(
            'a[href*="/api/sensors/"][href*="/download/"][target="_blank"]'
        );
        if (link?.href) {
            link.click();
            console.log('[SOGA] Imagen abierta con tecla W');
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
            `[SOGA] Imagen ${direccion === 'left' ? 'anterior' : 'siguiente'}`
        );
    }

    // ═════════════════════════════════════════════════
    // MÓDULO ESTADOS - Cambio Rápido de Estados
    // ═════════════════════════════════════════════════

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
        },
        'q': {
            codigo: '-3)',
            nombre: 'HIKCENTRAL',
            comentarioAlConfirmar: 'HIKCENTRAL'
        }
    };

    // Variable para rastrear el comentario pendiente
    let comentarioPendiente = null;

    // Cache del componente para evitar búsquedas repetidas
    let componenteCache = null;
    let ultimaBusqueda = 0;
    const CACHE_DURACION = 5000; // 5 segundos

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
            console.error(`[Estado] ✗ Label "${textoComentario}" no encontrado`);
            return false;
        }

        console.log(`[Estado] Seleccionando "${textoComentario}"`);
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
            console.error('[Estado] ✗ Botón "Enviar" no encontrado');
            return false;
        }

        // Verificar que no esté deshabilitado
        if (botonEnviar.disabled || botonEnviar.hasAttribute('disabled')) {
            console.warn('[Estado] ⚠ Botón "Enviar" deshabilitado');
            return false;
        }

        console.log('[Estado] Enviando comentario...');
        ejecutarClick(botonEnviar);

        await new Promise(r => setTimeout(r, 100));

        return true;
    }

    // -------------------------------------------------
    // PROCESAR COMENTARIO AL CONFIRMAR POPUP
    // -------------------------------------------------
    async function procesarComentarioAlConfirmar() {
        if (!comentarioPendiente) return;

        console.log('[Estado] Usuario confirmó → Procesando comentario');

        // 1. Seleccionar el comentario
        const seleccionado = await seleccionarComentario(comentarioPendiente);

        if (!seleccionado) {
            console.error('[Estado] ✗ No se pudo seleccionar');
            comentarioPendiente = null;
            return;
        }

        // 2. Enviar el comentario
        const enviado = await aplicarComentario();

        if (enviado) {
            console.log('[Estado] ✓ Comentario aplicado exitosamente');
        } else {
            console.error('[Estado] ✗ No se pudo enviar');
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
        // 1. Obtener componente (con cache)
        const componente = obtenerComponente();
        if (!componente) {
            console.warn(`[Estado ${config.codigo}] ✗ Selecciona una alerta`);
            return;
        }

        // 2. Verificar estado actual (rápido)
        const estadoActual = componente.querySelector('.select2-chosen')?.textContent;
        if (estadoActual?.indexOf(config.nombre) !== -1) {
            console.log(`[Estado ${config.codigo}] ✓ Ya está en ${config.nombre}`);
            return;
        }

        // 3. Si tiene comentario para después del popup, guardarlo
        if (config.comentarioAlConfirmar) {
            comentarioPendiente = config.comentarioAlConfirmar;
            console.log(`[Estado ${config.codigo}] Comentario "${comentarioPendiente}" pendiente de confirmación`);
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
            console.error(`[Estado ${config.codigo}] ✗ Dropdown no visible`);
            comentarioPendiente = null;
            return;
        }

        // 6. Buscar y hacer click en la opción
        const opcion = buscarOpcion(dropdown, config);
        if (!opcion) {
            console.error(`[Estado ${config.codigo}] ✗ Opción no encontrada`);
            document.body.click();
            comentarioPendiente = null;
            return;
        }

        ejecutarClick(opcion);

        // 7. Log final
        console.log(`[Estado ${config.codigo}] ✓ Estado cambiado`);

        if (config.comentarioAlConfirmar) {
            console.log(`[Estado ${config.codigo}] ⏳ Popup aparecerá → Presiona "Aceptar" para aplicar comentario`);
        }
    }

    // ═════════════════════════════════════════════════
    // MÓDULO COMPARTIDO - Detección de Bloqueos
    // ═════════════════════════════════════════════════

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

    // ═════════════════════════════════════════════════
    // LISTENER UNIFICADO DE TECLADO
    // ═════════════════════════════════════════════════

    document.addEventListener('keydown', (e) => {
        if (e.repeat) return;

        const key = e.key.toLowerCase();

        // Verificar bloqueos generales
        if (usuarioBloqueandoAtajo()) return;
        if (dropdownAbierto()) return;

        // ─────────────────────────────────────────────
        // TECLAS CCC (W / A / D)
        // ─────────────────────────────────────────────
        if (key === 'w') {
            abrirImagenAlerta();
            return;
        }

        if (key === 'a') {
            navegarImagen('left');
            return;
        }

        if (key === 'd') {
            navegarImagen('right');
            return;
        }

        // ─────────────────────────────────────────────
        // TECLAS ESTADOS (S / F)
        // ─────────────────────────────────────────────
        const config = ESTADOS[key];

        if (config) {
            e.preventDefault();
            e.stopPropagation();

            console.log('[Estados] ========================================');
            cambiarEstado(config);
        }
    }, { passive: false });

    // ═════════════════════════════════════════════════
    // INICIALIZACIÓN
    // ═════════════════════════════════════════════════

    // Esperar a Angular y iniciar CCC
    const waitForH3 = setInterval(() => {
        if (document.querySelector('h3.ng-binding')) {
            clearInterval(waitForH3);
            observarH3();
            console.log('[VSaaS CCC] Módulo CCC activo ✓');
        }
    }, 500);

    // Configurar listener de popup para Estados
    configurarListenerPopup();
    // Log de inicialización
    console.log('%c[SOGA] v2.1 ACTIVO ✓', 'color: #4CAF50; font-weight: bold; font-size: 14px');
    console.log('[SOGA] ════════════════════════════════════════════');
    console.log('[SOGA] CCC:     W → Abrir imagen | A/D → Navegar');
    console.log('[SOGA] Estados: S → SIN NOVEDAD  | F → F.POSITIVO');
    console.log('[SOGA]          Q → HIKCENTRAL');
    console.log('[SOGA] ════════════════════════════════════════════');

})();
