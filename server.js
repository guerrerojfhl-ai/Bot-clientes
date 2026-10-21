<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <title>BotClientesRepartidores</title>

    <link rel="manifest" href="/manifest.json">
    <meta name="theme-color" content="#22c55e">
    <meta name="mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <meta name="apple-mobile-web-app-title" content="BotClientes">
    <link rel="apple-touch-icon" href="/icon-192.png">
    <link rel="icon" type="image/png" href="/icon-192.png">

    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: system-ui, -apple-system, sans-serif;
            background: #0a0a0a;
            color: #fff;
            padding: 16px;
            padding-bottom: 40px;
            transition: background 0.3s, color 0.3s;
        }
        h1 { font-size: 20px; margin-bottom: 16px; }
        h2 { font-size: 15px; margin-bottom: 10px; color: #4ade80; }
        h3 { font-size: 14px; margin-bottom: 8px; color: #60a5fa; }
        h4 { font-size: 13px; margin-top: 12px; margin-bottom: 6px; color: #888; }
        .card {
            background: #161616;
            border-radius: 12px;
            padding: 16px;
            margin-bottom: 12px;
            border: 1px solid #262626;
            transition: background 0.3s, border-color 0.3s;
        }
        .card.alert { border-color: #f59e0b; background: #1c1408; }
        .card.pairing { border-color: #22c55e; background: #0d1f0d; box-shadow: 0 0 20px rgba(34,197,94,0.2); }
        .card.zona { border-color: #262626; }
        .card.zona.activa { border-color: #22c55e; background: #0d1f0d; }
        input, textarea, select {
            width: 100%;
            padding: 10px;
            background: #0a0a0a;
            border: 1px solid #333;
            border-radius: 8px;
            color: #fff;
            font-size: 14px;
            margin-bottom: 8px;
            font-family: inherit;
            transition: background 0.3s, color 0.3s, border-color 0.3s;
        }
        button {
            padding: 12px;
            background: #22c55e;
            border: none;
            border-radius: 8px;
            color: #fff;
            font-weight: 600;
            cursor: pointer;
            width: 100%;
            font-size: 14px;
            margin-bottom: 8px;
        }
        button:active { opacity: 0.8; }
        button.danger { background: #ef4444; }
        button.secondary { background: #3b82f6; }
        button.warning { background: #f59e0b; color: #000; }
        button.gray { background: #404040; }
        button.small { padding: 6px 10px; font-size: 12px; width: auto; display: inline-block; margin: 2px; }
        .status {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: bold;
        }
        .status.on { background: #22c55e; color: #000; }
        .status.off { background: #ef4444; }
        .info { font-size: 12px; color: #888; margin-top: 6px; }
        .info.warn { color: #f59e0b; font-weight: bold; }
        .info.ok { color: #22c55e; font-weight: bold; }
        .toast {
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #22c55e;
            color: #000;
            padding: 10px 20px;
            border-radius: 8px;
            font-weight: bold;
            display: none;
            z-index: 999;
            max-width: 90%;
            text-align: center;
        }
        .toast.error { background: #ef4444; color: #fff; }
        .pairing-code {
            font-size: 32px;
            font-weight: bold;
            text-align: center;
            letter-spacing: 4px;
            font-family: ui-monospace, monospace;
            color: #4ade80;
            padding: 20px;
            background: #0a0a0a;
            border-radius: 8px;
            margin: 12px 0;
            user-select: all;
            cursor: pointer;
            border: 2px solid #22c55e;
        }
        .lista-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px;
            background: #0a0a0a;
            border-radius: 6px;
            margin-bottom: 4px;
            font-size: 12px;
            font-family: ui-monospace, monospace;
            gap: 6px;
        }
        .lista-item .item-info { flex: 1; word-break: break-all; }
        .lista-item .item-info b { display: block; font-family: system-ui, sans-serif; font-size: 12px; }
        .lista-item .item-info small { display: block; opacity: 0.55; font-size: 10px; margin-top: 2px; }
        .lista-item button {
            width: auto;
            padding: 4px 8px;
            font-size: 11px;
            margin: 0;
            background: #ef4444;
        }
        .lista-item button.edit { background: #3b82f6; }
        .lista-item button.copy { background: #8b5cf6; }
        .detectado {
            background: #0a0a0a;
            border: 1px solid #333;
            border-radius: 8px;
            padding: 10px;
            margin-bottom: 8px;
            font-size: 12px;
        }
        .detectado .jid {
            font-family: ui-monospace, monospace;
            color: #4ade80;
            font-size: 11px;
            word-break: break-all;
            margin-bottom: 4px;
        }
        .detectado .jid small { display: block; opacity: 0.5; font-size: 9px; margin-top: 2px; color: #fff; }
        .detectado .nombre-grupo {
            font-family: system-ui, sans-serif;
            color: #60a5fa;
            font-size: 13px;
            font-weight: bold;
            margin-bottom: 4px;
        }
        .detectado .meta {
            color: #888;
            font-size: 11px;
            margin-bottom: 6px;
        }
        .detectado .acciones {
            display: flex;
            gap: 6px;
            flex-wrap: wrap;
            margin-top: 4px;
        }
        .detectado button {
            padding: 5px 8px;
            font-size: 11px;
            width: auto;
            margin: 0;
            border-radius: 6px;
            font-weight: 600;
            flex: 1;
            min-width: 80px;
        }
        .detectado select {
            padding: 5px 8px;
            font-size: 11px;
            border-radius: 6px;
            background: #0a0a0a;
            color: #fff;
            border: 1px solid #333;
            width: 100%;
            margin-bottom: 6px;
        }
        .badge {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 10px;
            margin-left: 4px;
        }
        .badge.ok { background: #22c55e; color: #000; }
        .vacio {
            text-align: center;
            color: #666;
            padding: 20px;
            font-size: 13px;
        }

        /* Modal */
        .modal-overlay {
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.85);
            z-index: 1000;
            display: none;
            align-items: center;
            justify-content: center;
            padding: 16px;
        }
        .modal-overlay.active { display: flex; }
        .modal {
            background: #161616;
            border-radius: 12px;
            padding: 20px;
            max-width: 500px;
            width: 100%;
            border: 1px solid #333;
            max-height: 90vh;
            overflow-y: auto;
        }
        .modal h3 { margin-bottom: 12px; color: #4ade80; }
        .modal label { display: block; font-size: 12px; color: #888; margin-bottom: 4px; margin-top: 12px; }
        .modal .modal-actions { display: flex; gap: 8px; margin-top: 16px; }
        .modal .modal-actions button { flex: 1; }

        /* 🔧 Dashboard de estadísticas */
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 8px;
            margin-top: 12px;
        }
        .stat-box {
            background: #0a0a0a;
            padding: 12px;
            border-radius: 8px;
            text-align: center;
            border: 1px solid #333;
        }
        .stat-box .num {
            font-size: 24px;
            font-weight: bold;
            color: #4ade80;
        }
        .stat-box .label {
            font-size: 11px;
            color: #888;
            margin-top: 4px;
        }

        /* 🔧 Buscador */
        .buscador-container {
            margin-bottom: 12px;
        }
        .buscador-container input {
            background: #161616;
            border: 1px solid #22c55e;
            font-size: 14px;
            padding: 12px;
        }

        /* 🔧 Tema claro */
        body.light {
            background: #f5f5f5;
            color: #111;
        }
        body.light .card {
            background: #fff;
            border-color: #ddd;
        }
        body.light .card.zona.activa {
            background: #dcfce7;
            border-color: #22c55e;
        }
        body.light h1, body.light h2, body.light h3, body.light h4 { color: #111; }
        body.light h2 { color: #16a34a; }
        body.light h3 { color: #2563eb; }
        body.light h4 { color: #666; }
        body.light input, body.light textarea, body.light select {
            background: #f9f9f9;
            color: #111;
            border-color: #ccc;
        }
        body.light .lista-item, body.light .detectado, body.light .stat-box, body.light .pairing-code {
            background: #f9f9f9;
            border-color: #ddd;
        }
        body.light .info { color: #666; }
        body.light .vacio { color: #999; }

        /* 🔧 Toggle de tema */
        .theme-toggle {
            position: fixed;
            top: 16px;
            right: 16px;
            width: 44px;
            height: 44px;
            border-radius: 50%;
            background: #22c55e;
            border: none;
            font-size: 20px;
            cursor: pointer;
            z-index: 500;
            padding: 0;
            margin: 0;
            box-shadow: 0 4px 12px rgba(34,197,94,0.4);
        }
        .theme-toggle:active { transform: scale(0.95); }

        /* 🔧 Historial de respuestas */
        .historial-item {
            padding: 8px;
            background: #0a0a0a;
            border-radius: 6px;
            margin-bottom: 4px;
            font-size: 11px;
            border-left: 3px solid #22c55e;
        }
        .historial-item .tiempo { color: #888; font-size: 10px; }
        .historial-item .zona { color: #60a5fa; font-weight: bold; }
        body.light .historial-item { background: #f9f9f9; }

        body.pwa-mode {
            padding-top: max(16px, env(safe-area-inset-top));
            padding-bottom: max(40px, env(safe-area-inset-bottom));
        }

        @keyframes slideUp {
            from { transform: translateY(100px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
        @keyframes slideDown {
            from { transform: translateY(-100px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
    </style>
</head>
<body>
    <!-- 🔧 Toggle de tema -->
    <button class="theme-toggle" onclick="toggleTema()" id="theme-toggle" title="Cambiar tema">🌙</button>

    <h1>🤖 BotClientesRepartidores</h1>

    <!-- 🔧 DASHBOARD DE ESTADÍSTICAS -->
    <div class="card">
        <h2>📊 Resumen</h2>
        <div class="stats-grid">
            <div class="stat-box">
                <div class="num" id="stat-grupos">0</div>
                <div class="label">Grupos</div>
            </div>
            <div class="stat-box">
                <div class="num" id="stat-numeros">0</div>
                <div class="label">Números</div>
            </div>
            <div class="stat-box">
                <div class="num" id="stat-keywords">0</div>
                <div class="label">Keywords</div>
            </div>
            <div class="stat-box">
                <div class="num" id="stat-activas">0</div>
                <div class="label">Zonas activas</div>
            </div>
        </div>
    </div>

    <div class="card">
        <h2>📊 Estado del Bot</h2>
        <p>Conexión: <span id="estado-conexion" class="status off">DESCONECTADO</span></p>
        <p class="info" id="numero-info">Número: --</p>
        <p class="info" id="licencia-info">Licencia: --</p>
        <button class="secondary" onclick="cargarTodo()">🔄 Actualizar</button>
    </div>

    <div class="card pairing" id="pairing-card" style="display:none;">
        <h2>🔑 Código de Vinculación</h2>
        <p class="info">Copia el código y mételo en WhatsApp:</p>
        <div class="pairing-code" id="pairing-code" onclick="copiarPairing()">----</div>
        <p class="info" style="text-align:center;">👆 Toca para copiar</p>
        <p class="info" style="text-align:center; color:#f59e0b;">⏱️ Expira en unos minutos</p>
    </div>

    <div class="card alert">
        <h2>📞 Configurar Teléfono</h2>
        <p class="info">Formato: código de país + número (solo dígitos)</p>
        <p class="info">Ejemplo México: <b>5216691234567</b></p>
        <input id="phoneInput" placeholder="5216691234567" type="tel">
        <button class="warning" onclick="guardarTelefono()">💾 Guardar y Reiniciar Bot</button>
        <button class="secondary" onclick="regenerarPairing()" style="margin-top: 8px;">🔄 Generar Código Nuevo</button>
    </div>

    <div class="card">
        <h2>🔑 Licencia</h2>
        <input id="licenseKey" placeholder="XXXXXXXX-XXXXXXX-XXXXXXXX">
        <button onclick="validarLicencia()">✅ Validar</button>
        <p class="info" id="licencia-detalle">--</p>
    </div>

    <div class="card">
        <h2>🔥 Prewarm Global</h2>
        <button class="secondary" onclick="prewarm('global')">🔥 Enviar Prewarm a Todas las Zonas</button>
    </div>

    <!-- 🔧 HISTORIAL DE RESPUESTAS -->
    <div class="card">
        <h2>📈 Últimas respuestas</h2>
        <p class="info">Cuando el bot responde "Y", aparece aquí.</p>
        <div id="historial" style="margin-top: 12px; max-height: 300px; overflow-y: auto;">Cargando...</div>
    </div>

    <!-- DETECCIONES DE GRUPOS -->
    <div class="card">
        <h2>🔍 Grupos Detectados</h2>
        <p class="info">
            Manda un mensaje con un punto <b>"."</b> en cualquier grupo donde esté el bot.
            Aparecerá aquí con su nombre para que lo agregues a una zona.
        </p>
        <div id="detectados" style="margin-top: 12px;">Cargando...</div>
        <button class="gray" onclick="limpiarDetectados()" style="margin-top: 8px;">🗑️ Limpiar Lista</button>
    </div>

    <!-- 🔧 BUSCADOR -->
    <div class="buscador-container">
        <input id="buscar" placeholder="🔍 Buscar grupo, número o keyword..." oninput="filtrarZonas()">
    </div>

    <h2 style="margin-top:20px;">🗺️ Zonas</h2>
    <div id="zonas-container"></div>

    <!-- Modal para copiar entre zonas -->
    <div class="modal-overlay" id="modal-copiar">
        <div class="modal">
            <h3>📋 Copiar a otra zona</h3>
            <p class="info" id="modal-copiar-valor" style="word-break:break-all;"></p>

            <label>Zona destino:</label>
            <select id="modal-copiar-zona"></select>

            <label>Tipo de ranura:</label>
            <select id="modal-copiar-tipo">
                <option value="image_groups">📋 Grupos Imágenes</option>
                <option value="image_numbers">📱 Números Imágenes</option>
                <option value="keyword_groups">📋 Grupos Keywords</option>
                <option value="keyword_numbers">📱 Números Keywords</option>
            </select>

            <div class="modal-actions">
                <button class="gray" onclick="cerrarModalCopiar()">Cancelar</button>
                <button onclick="confirmarCopiar()">Copiar</button>
            </div>
        </div>
    </div>

    <div class="toast" id="toast">✅ Listo</div>

    <script>
        let zonas = {};
        let labels = {};
        let zonaSeleccionadaPorDetectado = {};
        let modalCopiarValor = null;

        // 🔧 Historial de respuestas
        let ultimoHistorialId = 0;
        let historialNotificado = new Set();

        // Variables para detectar bot caído
        let fallosConsecutivos = 0;
        const MAX_FALLOS_ANTES_DE_AVISO = 3;
        let avisoBotActivo = false;

        // 🔧 Tema
        function toggleTema() {
            document.body.classList.toggle('light');
            const esClaro = document.body.classList.contains('light');
            document.getElementById('theme-toggle').textContent = esClaro ? '☀️' : '🌙';
            localStorage.setItem('tema', esClaro ? 'light' : 'dark');
        }

        // Cargar tema guardado
        if (localStorage.getItem('tema') === 'light') {
            document.body.classList.add('light');
            document.getElementById('theme-toggle').textContent = '☀️';
        }

        function toast(msg, error = false) {
            const t = document.getElementById('toast');
            t.textContent = msg;
            t.className = 'toast' + (error ? ' error' : '');
            t.style.display = 'block';
            setTimeout(() => t.style.display = 'none', 2500);
        }

        async function cargarTodo() {
            await cargarStatus();
            await cargarConfig();
            await cargarHistorial();
        }

        async function cargarStatus() {
            try {
                const r = await fetch('/api/status');
                if (!r.ok) throw new Error('HTTP ' + r.status);
                const d = await r.json();

                fallosConsecutivos = 0;
                if (avisoBotActivo) ocultarAvisoBot();

                const el = document.getElementById('estado-conexion');
                el.textContent = d.conectado ? 'CONECTADO' : 'DESCONECTADO';
                el.className = 'status ' + (d.conectado ? 'on' : 'off');

                document.getElementById('numero-info').textContent = 'Número: ' + (d.numeroConectado || '--');

                const li = d.licencia;
                const licInfo = document.getElementById('licencia-info');
                if (li && li.valida) {
                    licInfo.textContent = '✅ Licencia VÁLIDA';
                    licInfo.className = 'info ok';
                } else {
                    licInfo.textContent = '❌ ' + (li?.razon || 'SIN LICENCIA');
                    licInfo.className = 'info warn';
                }

                document.getElementById('licencia-detalle').textContent =
                    li?.valida ? `Autorizada para: ${d.numeroConectado}` : (li?.razon || '--');

                if (d.pairingCode && !d.conectado) {
                    document.getElementById('pairing-card').style.display = 'block';
                    document.getElementById('pairing-code').textContent = d.pairingCode;
                } else {
                    document.getElementById('pairing-card').style.display = 'none';
                }
            } catch (e) {
                fallosConsecutivos++;
                console.error('Fallo al consultar estado (' + fallosConsecutivos + '):', e);

                if (fallosConsecutivos >= MAX_FALLOS_ANTES_DE_AVISO) {
                    mostrarAvisoBot();
                    const el = document.getElementById('estado-conexion');
                    el.textContent = 'SIN RESPUESTA';
                    el.className = 'status off';
                }
            }
        }

        function mostrarAvisoBot() {
            if (avisoBotActivo) return;
            avisoBotActivo = true;

            const aviso = document.createElement('div');
            aviso.id = 'aviso-bot';
            aviso.style.cssText = `
                position: fixed;
                top: 16px; left: 16px; right: 80px;
                background: linear-gradient(135deg, #ef4444, #dc2626);
                color: #fff; padding: 14px 16px; border-radius: 12px;
                font-weight: 600; z-index: 2000;
                display: flex; justify-content: space-between; align-items: center;
                box-shadow: 0 8px 24px rgba(239, 68, 68, 0.5);
                animation: slideDown 0.3s ease;
            `;
            aviso.innerHTML = `
                <div style="display:flex;flex-direction:column;gap:2px;flex:1;">
                    <span style="font-size:14px;">⚠️ El bot no responde</span>
                    <span style="font-size:11px;opacity:0.9;font-weight:400;">Abre Termux y reinicia el bot para solucionarlo.</span>
                </div>
                <button onclick="location.reload()" style="
                    background:#000;color:#fff;border:none;padding:8px 14px;
                    border-radius:8px;font-weight:bold;font-size:12px;
                    width:auto;margin:0 0 0 8px;cursor:pointer;flex-shrink:0;
                ">Reintentar</button>
            `;
            document.body.appendChild(aviso);
        }

        function ocultarAvisoBot() {
            if (!avisoBotActivo) return;
            avisoBotActivo = false;
            document.getElementById('aviso-bot')?.remove();
        }

        async function cargarConfig() {
            try {
                const r = await fetch('/api/config');
                const d = await r.json();
                zonas = d.zonas;
                labels = d.labels || {};
                renderZonas();
                actualizarStats();  // 🔧 Actualizar dashboard
            } catch (e) { console.error(e); }
        }

        // 🔧 Actualizar estadísticas
        function actualizarStats() {
            let grupos = 0, numeros = 0, keywords = 0, activas = 0;
            for (const z of Object.values(zonas)) {
                grupos += z.imageGroups.length + z.keywordGroups.length;
                numeros += z.imageNumbers.length + z.keywordNumbers.length;
                keywords += z.keywords.length;
                if (z.botActive) activas++;
            }
            document.getElementById('stat-grupos').textContent = grupos;
            document.getElementById('stat-numeros').textContent = numeros;
            document.getElementById('stat-keywords').textContent = keywords;
            document.getElementById('stat-activas').textContent = activas;
        }

        // 🔧 Filtrar zonas por búsqueda
        function filtrarZonas() {
            const q = document.getElementById('buscar').value.toLowerCase().trim();
            document.querySelectorAll('.lista-item').forEach(item => {
                if (!q) {
                    item.style.display = '';
                    return;
                }
                const texto = item.textContent.toLowerCase();
                item.style.display = texto.includes(q) ? '' : 'none';
            });
        }

        function etiqueta(id) {
            return labels[id] || id;
        }

        function escapeHtml(s) {
            if (!s) return '';
            return String(s).replace(/[<>&"']/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'}[c]));
        }

        function itemLista(valor, zonaKey, tipo) {
            const alias = etiqueta(valor);
            const tieneAlias = alias !== valor;
            return `
                <div class="lista-item">
                    <div class="item-info">
                        ${tieneAlias ? `<b>${escapeHtml(alias)}</b>` : ''}
                        <small style="${tieneAlias ? '' : 'opacity:0.9; font-size:11px;'}">${escapeHtml(valor)}</small>
                    </div>
                    <button class="copy" onclick="abrirModalCopiar('${escapeHtml(valor)}')">📋</button>
                    <button class="edit" onclick="relabel('${escapeHtml(valor)}')">✏️</button>
                    <button onclick="quitar('${zonaKey}','${tipo}','${escapeHtml(valor)}')">🗑️</button>
                </div>
            `;
        }

        function renderZonas() {
            const cont = document.getElementById('zonas-container');
            let html = '';

            for (const [key, z] of Object.entries(zonas)) {
                const activa = z.botActive ? 'activa' : '';
                const estado = z.botActive ? '🟢 ACTIVA' : '🔴 INACTIVA';

                html += `
                <div class="card zona ${activa}">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                        <h3 style="margin:0;">${escapeHtml(z.nombre)}</h3>
                        <span class="status ${z.botActive ? 'on' : 'off'}">${estado}</span>
                    </div>

                    <button class="${z.botActive ? 'danger' : ''}" onclick="toggleZona('${key}')">
                        ${z.botActive ? '🔴 Desactivar' : '🟢 Activar'}
                    </button>

                    <button class="secondary" onclick="prewarm('${key}')">🔥 Prewarm Zona</button>

                    <button class="gray small" onclick="renombrar('${key}')">✏️ Renombrar</button>

                    <h4>📋 Grupos Imágenes (${z.imageGroups.length})</h4>
                    ${z.imageGroups.map(g => itemLista(g, key, 'image_groups')).join('') || '<p class="info">(vacío)</p>'}
                    <button class="gray small" onclick="agregar('${key}','image_groups')">➕ Añadir Grupo</button>

                    <h4>📱 Números Imágenes (${z.imageNumbers.length})</h4>
                    ${z.imageNumbers.map(n => itemLista(n, key, 'image_numbers')).join('') || '<p class="info">(vacío)</p>'}
                    <button class="gray small" onclick="agregar('${key}','image_numbers')">➕ Añadir Número</button>

                    <h4>📋 Grupos Keywords (${z.keywordGroups.length})</h4>
                    ${z.keywordGroups.map(g => itemLista(g, key, 'keyword_groups')).join('') || '<p class="info">(vacío)</p>'}
                    <button class="gray small" onclick="agregar('${key}','keyword_groups')">➕ Añadir Grupo</button>

                    <h4>📱 Números Keywords (${z.keywordNumbers.length})</h4>
                    ${z.keywordNumbers.map(n => itemLista(n, key, 'keyword_numbers')).join('') || '<p class="info">(vacío)</p>'}
                    <button class="gray small" onclick="agregar('${key}','keyword_numbers')">➕ Añadir Número</button>

                    <h4>🔤 Keywords (${z.keywords.length})</h4>
                    ${z.keywords.map(k => `
                        <div class="lista-item">
                            <div class="item-info">
                                <small style="opacity:0.9; font-size:11px;">${escapeHtml(k)}</small>
                            </div>
                            <button onclick="quitar('${key}','keywords','${escapeHtml(k)}')">🗑️</button>
                        </div>
                    `).join('') || '<p class="info">(vacío)</p>'}
                    <button class="gray small" onclick="agregar('${key}','keywords')">➕ Añadir Keyword</button>
                </div>
                `;
            }

            cont.innerHTML = html;
            filtrarZonas();  // 🔧 Reaplicar filtro si hay búsqueda activa
        }

        async function toggleZona(zonaKey) {
            const r = await fetch('/api/zona/toggle', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ zonaKey })
            });
            const d = await r.json();
            if (d.ok) {
                toast(d.activo ? '🟢 Activada' : '🔴 Desactivada');
                cargarConfig();
            }
        }

        async function renombrar(zonaKey) {
            const nuevo = prompt('Nuevo nombre para la zona:', zonas[zonaKey].nombre);
            if (!nuevo || !nuevo.trim()) return;
            const r = await fetch('/api/zona/renombrar', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ zonaKey, nombre: nuevo.trim() })
            });
            const d = await r.json();
            if (d.ok) {
                toast('✅ Renombrada');
                cargarConfig();
            }
        }

        async function relabel(valor) {
            const actual = labels[valor] || '';
            const nuevo = prompt(
                `Alias para:\n${valor}\n\n(Deja vacío para quitar el alias)`,
                actual
            );
            if (nuevo === null) return;

            const r = await fetch('/api/zona/relabel', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ valor, label: nuevo.trim() || null })
            });
            const d = await r.json();
            if (d.ok) {
                if (nuevo.trim()) labels[valor] = nuevo.trim();
                else delete labels[valor];
                toast('✅ Alias actualizado');
                cargarConfig();
            } else {
                toast('❌ ' + (d.error || 'Error'), true);
            }
        }

        async function agregar(zonaKey, tipo) {
            const esKeyword = tipo === 'keywords';
            const esNumero = tipo.includes('numbers');
            const esGrupo = tipo.includes('groups');

            let msg = 'Valor a añadir:';
            if (esGrupo) msg = 'ID del grupo (ej: 120363...@g.us):';
            if (esNumero) msg = 'Número (ej: 5216691234567):';
            if (esKeyword) msg = 'Keyword (ej: solicito):';

            const valor = prompt(msg);
            if (!valor || !valor.trim()) return;

            let valorLimpio = valor.trim();
            if (esNumero) valorLimpio = valorLimpio.replace(/\D/g, '');
            if (esKeyword) valorLimpio = valorLimpio.toLowerCase();

            let label = null;
            if (!esKeyword) {
                const l = prompt('Alias para identificar (opcional):', '');
                if (l && l.trim()) label = l.trim();
            }

            const r = await fetch('/api/zona/add', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ zonaKey, tipo, valor: valorLimpio, label })
            });
            const d = await r.json();
            if (d.ok) {
                toast('✅ Añadido');
                cargarConfig();
            } else {
                toast('❌ ' + (d.error || 'Error'), true);
            }
        }

        // 🔧 Confirmación doble antes de borrar
        async function quitar(zonaKey, tipo, valor) {
            if (!confirm('¿Eliminar este elemento?\n\n' + valor)) return;
            if (!confirm('⚠️ ÚLTIMA CONFIRMACIÓN\n\n¿Seguro que quieres eliminar:\n' + valor)) return;
            
            const r = await fetch('/api/zona/remove', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ zonaKey, tipo, valor })
            });
            const d = await r.json();
            if (d.ok) {
                toast('🗑️ Eliminado');
                cargarConfig();
            }
        }

        async function prewarm(zonaKey) {
            toast('🔥 Enviando prewarm...');
            try {
                const r = await fetch('/api/prewarm', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ zonaKey })
                });
                const d = await r.json();
                if (d.ok || d.total !== undefined) {
                    toast(`🔥 ${d.enviados || 0} ok · ${d.fallidos || 0} fallidos`);
                } else {
                    toast('❌ ' + (d.error || 'Error'), true);
                }
            } catch (e) {
                toast('❌ El bot no responde. Reinicia Termux.', true);
            }
        }

        // ==================== MODAL COPIAR ====================
        function abrirModalCopiar(valor) {
            modalCopiarValor = valor;
            document.getElementById('modal-copiar-valor').textContent = valor;
            
            const selectZona = document.getElementById('modal-copiar-zona');
            selectZona.innerHTML = Object.entries(zonas).map(([key, z]) => 
                `<option value="${key}">${escapeHtml(z.nombre)}</option>`
            ).join('');
            
            document.getElementById('modal-copiar').classList.add('active');
        }

        function cerrarModalCopiar() {
            document.getElementById('modal-copiar').classList.remove('active');
            modalCopiarValor = null;
        }

        async function confirmarCopiar() {
            if (!modalCopiarValor) return;
            
            const destinoKey = document.getElementById('modal-copiar-zona').value;
            const tipo = document.getElementById('modal-copiar-tipo').value;
            
            const r = await fetch('/api/zona/copiar', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    destinoKey,
                    tipo,
                    valor: modalCopiarValor
                })
            });
            const d = await r.json();
            if (d.ok) {
                toast('✅ Copiado a ' + zonas[destinoKey].nombre);
                cerrarModalCopiar();
                cargarConfig();
            } else {
                toast('❌ ' + (d.error || 'Error'), true);
            }
        }

        async function guardarTelefono() {
            const tel = document.getElementById('phoneInput').value;
            if (!tel) return;

            const confirmar = confirm(
                '⚠️ ATENCIÓN\n\n' +
                'Esto va a:\n' +
                '1. Guardar el número: ' + tel + '\n' +
                '2. Cerrar la sesión actual de WhatsApp\n' +
                '3. Reiniciar el bot\n' +
                '4. Generar un nuevo código de enlace\n\n' +
                '¿Continuar?'
            );
            if (!confirmar) return;

            toast('🔄 Reiniciando bot...');

            const r = await fetch('/api/phone', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ phoneNumber: tel })
            });
            const d = await r.json();
            if (d.ok) {
                let intentos = 0;
                const interval = setInterval(async () => {
                    await cargarStatus();
                    intentos++;
                    if (intentos >= 20) clearInterval(interval);
                }, 2000);
            } else {
                toast('❌ ' + (d.error || 'Error'), true);
            }
        }

        async function regenerarPairing() {
            try {
                const r = await fetch('/api/regenerar-pairing', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'}
                });
                const d = await r.json();
                if (d.error) {
                    toast('❌ ' + d.error, true);
                    return;
                }
                toast('🔄 Código: ' + d.pairingCode);
                await cargarStatus();
            } catch (e) {
                toast('❌ Error', true);
            }
        }

        async function validarLicencia() {
            const key = document.getElementById('licenseKey').value.trim();
            if (!key) return;
            const r = await fetch('/api/license/validate', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ key })
            });
            const d = await r.json();
            if (d.valida) {
                toast('✅ Licencia válida');
                cargarStatus();
            } else {
                toast('❌ ' + (d.razon || 'Error'), true);
            }
        }

        function copiarPairing() {
            const code = document.getElementById('pairing-code').textContent;
            if (!code || code === '----') return;
            if (navigator.clipboard) {
                navigator.clipboard.writeText(code).then(() => toast('📋 Copiado: ' + code));
            }
        }

        // ==================== HISTORIAL ====================
        async function cargarHistorial() {
            try {
                const r = await fetch('/api/historial');
                if (!r.ok) return;
                const lista = await r.json();
                renderHistorial(lista);
                
                // 🔧 Notificar nuevas respuestas
                for (const h of lista) {
                    if (h.id > ultimoHistorialId && !historialNotificado.has(h.id)) {
                        if (ultimoHistorialId > 0) {
                            // Es una respuesta nueva
                            const numCorto = h.numero ? h.numero.slice(-4) : '????';
                            toast(`✅ Bot respondió en ${h.zonaNombre} (…${numCorto})`);
                        }
                        historialNotificado.add(h.id);
                        if (h.id > ultimoHistorialId) ultimoHistorialId = h.id;
                    }
                }
            } catch (e) { console.error(e); }
        }

        function renderHistorial(lista) {
            const cont = document.getElementById('historial');
            if (!lista || lista.length === 0) {
                cont.innerHTML = '<div class="vacio">Aún no hay respuestas registradas.</div>';
                return;
            }
            
            cont.innerHTML = lista.slice(0, 20).map(h => {
                const hace = Math.floor((Date.now() - h.timestamp) / 1000);
                const haceTexto = hace < 60 ? `hace ${hace}s` :
                                  hace < 3600 ? `hace ${Math.floor(hace/60)}min` :
                                  `hace ${Math.floor(hace/3600)}h`;
                const numCorto = h.numero ? h.numero.slice(-4) : '????';
                return `
                    <div class="historial-item">
                        <span class="zona">${escapeHtml(h.zonaNombre)}</span>
                        · 👤 …${numCorto}
                        <br><span class="tiempo">${haceTexto}</span>
                    </div>
                `;
            }).join('');
        }

        // ==================== DETECCIONES ====================
        let zonasLista = [];

        async function cargarZonasLista() {
            try {
                const r = await fetch('/api/zonas-lista');
                zonasLista = await r.json();
            } catch (e) { console.error(e); }
        }

        async function cargarDetectados() {
            try {
                const r = await fetch('/api/detectados');
                const lista = await r.json();
                renderDetectados(lista);
            } catch (e) { console.error(e); }
        }

        function renderDetectados(lista) {
            const cont = document.getElementById('detectados');

            document.querySelectorAll('select[id^="zona-"]').forEach(sel => {
                const jidOriginal = sel.dataset.jid;
                if (jidOriginal) {
                    zonaSeleccionadaPorDetectado[jidOriginal] = sel.value;
                }
            });

            if (!lista || lista.length === 0) {
                cont.innerHTML = '<div class="vacio">Sin detecciones aún.<br>Manda un "." en un grupo para detectarlo.</div>';
                return;
            }

            cont.innerHTML = lista.map(d => {
                const hace = Math.floor((Date.now() - d.ultimaVez) / 1000);
                const haceTexto = hace < 60 ? `hace ${hace}s` :
                                  hace < 3600 ? `hace ${Math.floor(hace/60)}min` :
                                  `hace ${Math.floor(hace/3600)}h`;

                const badgeImg = d.yaEnImageGroups ? '<span class="badge ok">YA EN IMÁGENES</span>' : '';
                const badgeKw = d.yaEnKeywordGroups ? '<span class="badge ok">YA EN KEYWORDS</span>' : '';

                const idLimpio = btoa(d.jid).replace(/=/g, '').replace(/\//g, '_').replace(/\+/g, '-');
                
                const zonaGuardada = zonaSeleccionadaPorDetectado[d.jid];

                const opcionesConSeleccion = zonasLista.map(z => {
                    const isSelected = zonaGuardada === z.key ? 'selected' : '';
                    return `<option value="${z.key}" ${isSelected}>${z.nombre}</option>`;
                }).join('');

                const aliasJid = etiqueta(d.jid);
                const tieneAliasJid = aliasJid !== d.jid;

                const aliasNum = d.numero ? etiqueta(d.numero) : null;
                const tieneAliasNum = aliasNum && aliasNum !== d.numero;

                const nombreGrupo = d.nombreGrupo || (tieneAliasJid ? aliasJid : null);

                return `
                    <div class="detectado">
                        ${nombreGrupo ? `<div class="nombre-grupo">📛 ${escapeHtml(nombreGrupo)}</div>` : ''}
                        <div class="jid">
                            ${escapeHtml(d.jid)}
                            ${tieneAliasJid ? `<small>alias: ${escapeHtml(aliasJid)}</small>` : ''}
                        </div>
                        <div class="meta">
                            ${d.numero ? '👤 ' + escapeHtml(tieneAliasNum ? aliasNum : d.numero) + (tieneAliasNum ? ` <small style="opacity:0.5;">(${d.numero})</small>` : '') + ' | ' : ''}
                            📝 "${escapeHtml(d.ultimoTexto || '')}"
                            <br>${haceTexto} ${badgeImg}${badgeKw}
                        </div>

                        <select id="zona-${idLimpio}" data-jid="${d.jid}" onchange="guardarSeleccionZona('${d.jid}', this.value)">
                            ${opcionesConSeleccion}
                        </select>

                        <div class="acciones">
                            <button onclick="aplicarDetectado('${d.jid}', null, 'image_groups', 'zona-${idLimpio}')">
                                ➕ Imágenes
                            </button>
                            <button onclick="aplicarDetectado('${d.jid}', null, 'keyword_groups', 'zona-${idLimpio}')">
                                ➕ Keywords
                            </button>
                            <button class="secondary" onclick="relabel('${d.jid}')" style="flex: 0 0 auto; min-width: 40px;">✏️</button>
                        </div>
                        ${d.numero ? `
                        <div class="acciones">
                            <button class="secondary" onclick="aplicarDetectado(null, '${d.numero}', 'image_numbers', 'zona-${idLimpio}')">
                                ➕ NumImg
                            </button>
                            <button class="secondary" onclick="aplicarDetectado(null, '${d.numero}', 'keyword_numbers', 'zona-${idLimpio}')">
                                ➕ NumKw
                            </button>
                        </div>` : ''}
                    </div>
                `;
            }).join('');
        }

        function guardarSeleccionZona(jid, zonaKey) {
            zonaSeleccionadaPorDetectado[jid] = zonaKey;
        }

        async function aplicarDetectado(jid, numero, destino, selectId) {
            const select = document.getElementById(selectId);
            const zonaKey = select ? select.value : null;

            if (!zonaKey) {
                toast('❌ Selecciona una zona', true);
                return;
            }

            const r = await fetch('/api/detectados/aplicar', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ jid, numero, destino, zonaKey })
            });
            const d = await r.json();
            if (d.ok) {
                toast('✅ Agregado a ' + destino);
                await cargarDetectados();
                await cargarConfig();
            } else {
                toast('❌ ' + (d.error || 'Error'), true);
            }
        }

        async function limpiarDetectados() {
            if (!confirm('¿Limpiar toda la lista de detectados?')) return;
            await fetch('/api/detectados/limpiar', { method: 'POST' });
            await cargarDetectados();
            toast('🗑️ Lista limpiada');
        }

        cargarTodo();
        cargarZonasLista().then(() => cargarDetectados());
        
        setInterval(cargarStatus, 5000);
        setInterval(() => {
            const haySelectAbierto = document.activeElement?.tagName === 'SELECT';
            if (!haySelectAbierto) {
                cargarDetectados();
                cargarHistorial();  // 🔧 Recargar historial
            }
        }, 5000);
    </script>

    <!-- Registro del Service Worker -->
    <script>
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js')
                    .then(reg => console.log('✅ SW registrado:', reg.scope))
                    .catch(err => console.warn('⚠️ SW falló:', err));
            });
        }

        const isStandalone = window.matchMedia('(display-mode: standalone)').matches
                          || window.navigator.standalone === true;

        if (isStandalone) {
            document.body.classList.add('pwa-mode');
        }
    </script>

    <!-- Banner de instalación PWA -->
    <script>
        let deferredPrompt = null;

        window.addEventListener('beforeinstallprompt', (e) => {
            console.log('✅ PWA instalable detectada');
            e.preventDefault();
            deferredPrompt = e;
            mostrarBannerInstalacion();
        });

        function mostrarBannerInstalacion() {
            if (window.matchMedia('(display-mode: standalone)').matches) return;
            if (localStorage.getItem('install-banner-cerrado') === '1') return;
            if (document.getElementById('install-banner')) return;

            const banner = document.createElement('div');
            banner.id = 'install-banner';
            banner.style.cssText = `
                position: fixed;
                bottom: 16px;
                left: 16px;
                right: 16px;
                background: linear-gradient(135deg, #22c55e, #16a34a);
                color: #fff;
                padding: 14px 16px;
                border-radius: 12px;
                font-weight: 600;
                z-index: 1000;
                display: flex;
                justify-content: space-between;
                align-items: center;
                box-shadow: 0 8px 24px rgba(34, 197, 94, 0.4);
                animation: slideUp 0.3s ease;
            `;
            banner.innerHTML = `
                <div style="display:flex;flex-direction:column;gap:2px;">
                    <span style="font-size:14px;">📲 Instalar BotClientes</span>
                    <span style="font-size:11px;opacity:0.85;font-weight:400;">Accede más rápido desde tu pantalla</span>
                </div>
                <div style="display:flex;gap:8px;">
                    <button onclick="instalarPWA()" style="
                        background:#000;color:#fff;border:none;padding:10px 18px;
                        border-radius:8px;font-weight:bold;font-size:13px;
                        width:auto;margin:0;cursor:pointer;
                    ">Instalar</button>
                    <button onclick="cerrarBanner()" style="
                        background:transparent;color:#fff;border:none;padding:10px;
                        font-size:16px;width:auto;margin:0;cursor:pointer;opacity:0.7;
                    ">✕</button>
                </div>
            `;

            document.body.appendChild(banner);
        }

        async function instalarPWA() {
            if (!deferredPrompt) {
                toast('No disponible. Usa el menú de Chrome → Instalar', true);
                return;
            }
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            console.log('Resultado instalación:', outcome);
            if (outcome === 'accepted') {
                toast('✅ Instalada correctamente');
                document.getElementById('install-banner')?.remove();
            }
            deferredPrompt = null;
        }

        function cerrarBanner() {
            localStorage.setItem('install-banner-cerrado', '1');
            document.getElementById('install-banner')?.remove();
        }

        window.addEventListener('appinstalled', () => {
            console.log('✅ PWA instalada');
            document.getElementById('install-banner')?.remove();
            toast('🎉 App instalada en tu pantalla de inicio');
        });

        if (window.matchMedia('(display-mode: standalone)').matches) {
            document.getElementById('install-banner')?.remove();
        }
    </script>
</body>
</html>
