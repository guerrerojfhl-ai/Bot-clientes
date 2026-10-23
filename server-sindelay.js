const {
    makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    fetchLatestWaWebVersion,
    Browsers,
    getContentType
} = require('@musteqeem/baileys');

const qrcode = require('qrcode-terminal');
const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ⚡ OPTIMIZACIONES
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
process.env.UV_THREADPOOL_SIZE = '512';
process.env.NODE_NO_WARNINGS = '1';
process.env.BAILEYS_LOG_LEVEL = 'silent';

require('dotenv').config();

// ==================== SECRETO ====================
const SECRET = process.env.BOT_SECRET;

if (!SECRET) {
    console.error('\n❌ ERROR FATAL: BOT_SECRET no está definido.');
    console.error('   Antes de arrancar, ejecuta:');
    console.error('   export BOT_SECRET="tu_secret_real_aqui"\n');
    process.exit(1);
}

// ==================== RUTAS ====================
const CONFIG_PATH = path.join(__dirname, 'config-zonas.json');
const CARTERA_PATH = path.join(__dirname, 'config-cartera.json');
const PUBLIC_DIR = path.join(__dirname, 'public');
const SESSION_DIR = path.join(__dirname, 'session-imagenes');

if (!fs.existsSync(PUBLIC_DIR)) {
    fs.mkdirSync(PUBLIC_DIR, { recursive: true });
    console.log('📝 Carpeta public/ creada');
}

// ==================== CONFIG ZONAS (DINÁMICO) ====================
const CONFIG = {
    ZONAS: {},
    Y: 'Y',
    phoneNumber: '',
};

// ==================== CARTERA VIRTUAL ====================
function carteraVacia() {
    return {
        activa: false,
        fechaCorte: new Date().toISOString().slice(0, 10),
        pedidosHoy: 0,
        ingresosHoy: 0,
        historial: []
    };
}

function cargarCartera() {
    try {
        if (fs.existsSync(CARTERA_PATH)) {
            const c = JSON.parse(fs.readFileSync(CARTERA_PATH, 'utf8'));
            c.activa = !!c.activa;
            c.pedidosHoy = c.pedidosHoy || 0;
            c.ingresosHoy = c.ingresosHoy || 0;
            c.historial = c.historial || [];
            c.fechaCorte = c.fechaCorte || new Date().toISOString().slice(0, 10);
            return c;
        }
    } catch (e) {
        console.log('⚠️ config-cartera.json corrupto, regenerando...');
    }
    const base = carteraVacia();
    try {
        fs.writeFileSync(CARTERA_PATH, JSON.stringify(base, null, 2));
    } catch (e) {}
    return base;
}

function guardarCartera(c) {
    fs.writeFileSync(CARTERA_PATH, JSON.stringify(c, null, 2));
}

// Pedidos pendientes (en memoria)
const pedidosPendientes = [];
const MAX_PENDIENTES = 50;

function agregarPendiente(zonaNombre, grupo, numero) {
    const item = {
        id: Date.now() + Math.random(),
        timestamp: Date.now(),
        zonaNombre,
        grupo,
        numero
    };
    pedidosPendientes.push(item);
    if (pedidosPendientes.length > MAX_PENDIENTES) pedidosPendientes.shift();
    return item;
}

// Reinicio automático: 12:00 UTC = 6:00 AM CDMX
function verificarCorteDiario() {
    const ahora = new Date();
    const fechaHoy = ahora.toISOString().slice(0, 10);
    const horaUTC = ahora.getUTCHours();

    const c = cargarCartera();

    if (horaUTC >= 12 && c.fechaCorte !== fechaHoy) {
        if (c.pedidosHoy > 0 || c.ingresosHoy > 0) {
            console.log(`🔄 Corte diario: reiniciando cartera (${c.pedidosHoy} pedidos, $${c.ingresosHoy})`);
        }
        c.pedidosHoy = 0;
        c.ingresosHoy = 0;
        c.fechaCorte = fechaHoy;
        guardarCartera(c);
    }
}
setInterval(verificarCorteDiario, 60 * 1000);

// ==================== DETECCIONES ====================
const detecciones = new Map();
const MAX_DETECCIONES = 100;

function agregarDeteccion(jid, numero, texto, tipo, nombreGrupo = null) {
    const ahora = Date.now();
    const clave = jid + '|' + (numero || '');
    const existente = detecciones.get(clave);
    if (existente) {
        existente.ultimaVez = ahora;
        existente.veces = (existente.veces || 1) + 1;
        existente.ultimoTexto = texto;
        if (nombreGrupo) existente.nombreGrupo = nombreGrupo;
        return;
    }
    detecciones.set(clave, {
        jid, numero: numero || null,
        nombreGrupo: nombreGrupo,
        primerTexto: texto, ultimoTexto: texto,
        primeraVez: ahora, ultimaVez: ahora,
        veces: 1, tipo
    });
    if (detecciones.size > MAX_DETECCIONES) {
        const primeraClave = detecciones.keys().next().value;
        detecciones.delete(primeraClave);
    }
}

// ==================== HISTORIAL DE RESPUESTAS ====================
const historial = [];
const MAX_HISTORIAL = 50;

function agregarHistorial(zonaKey, zonaNombre, grupo, numero, texto) {
    const item = {
        id: Date.now() + Math.random(),
        timestamp: Date.now(),
        zonaKey,
        zonaNombre,
        grupo,
        numero,
        texto
    };
    historial.push(item);
    if (historial.length > MAX_HISTORIAL) {
        historial.shift();
    }
    return item;
}

// ==================== GRUPOS PREWARMENTADOS ====================
const prewarmsRecientes = new Map();
const PREWARM_TTL_MS = 30 * 60 * 1000;
const BOT_INSTANCE_ID = Date.now();

function yaFuePrewarmed(grupo) {
    const ts = prewarmsRecientes.get(grupo);
    if (!ts) return false;
    if (Date.now() - ts > PREWARM_TTL_MS) {
        prewarmsRecientes.delete(grupo);
        return false;
    }
    return true;
}

function marcarPrewarmed(grupo) {
    prewarmsRecientes.set(grupo, Date.now());
}

function limpiarPrewarmsExpirados() {
    const ahora = Date.now();
    for (const [grupo, ts] of prewarmsRecientes) {
        if (ahora - ts > PREWARM_TTL_MS) {
            prewarmsRecientes.delete(grupo);
        }
    }
}

function limpiarTodosLosPrewarms() {
    const cantidad = prewarmsRecientes.size;
    prewarmsRecientes.clear();
    if (cantidad > 0) {
        console.log(`🧹 Registro de prewarms limpiado (${cantidad} grupos) — bot reiniciado`);
    }
}

setInterval(limpiarPrewarmsExpirados, 60 * 1000);

// ==================== VARIABLES GLOBALES ====================
let sockGlobal = null;
let reiniciando = false;
let pairingCodeActual = null;
let pairingCodeTimestamp = null;
let pairingQRActual = null;
let licenciaValida = null;
let licenciaNumero = null;
let licenciaRazon = 'SIN LICENCIA';
let numeroConectado = null;

// ==================== PERSISTENCIA ====================
const LABELS = {};

function crearEstructuraZona(nombre) {
    return {
        nombre: nombre,
        botActive: false,
        orden: Date.now(),
        image_groups_extra: [], image_groups_removed: [],
        image_numbers_extra: [], image_numbers_removed: [],
        keyword_groups_extra: [], keyword_groups_removed: [],
        keyword_numbers_extra: [], keyword_numbers_removed: [],
        keywords_extra: [], keywords_removed: [],
    };
}

function zonasPorDefecto() {
    return {
        norte: crearEstructuraZona('Norte'),
        centro: crearEstructuraZona('Centro'),
        sur: crearEstructuraZona('Sur'),
        zona4: crearEstructuraZona('Zona 4'),
        zona5: crearEstructuraZona('Zona 5'),
        zona6: crearEstructuraZona('Zona 6'),
    };
}

function estructuraVacia() {
    return {
        zonas: {},
        labels: {},
        licenseKey: '',
        phoneNumber: '',
    };
}

function cargarDinamico() {
    try {
        if (fs.existsSync(CONFIG_PATH)) {
            const d = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
            d.zonas = d.zonas || {};
            d.labels = d.labels || {};
            d.licenseKey = d.licenseKey || '';
            d.phoneNumber = d.phoneNumber || '';

            if (Object.keys(d.zonas).length === 0) {
                d.zonas = zonasPorDefecto();
                fs.writeFileSync(CONFIG_PATH, JSON.stringify(d, null, 2));
            }

            let necesitaGuardar = false;
            Object.keys(d.zonas).forEach((k, i) => {
                if (typeof d.zonas[k].orden !== 'number') {
                    d.zonas[k].orden = i + 1;
                    necesitaGuardar = true;
                }
            });
            if (necesitaGuardar) {
                fs.writeFileSync(CONFIG_PATH, JSON.stringify(d, null, 2));
            }

            return d;
        }
    } catch (e) {
        console.log('⚠️ config-zonas.json corrupto, regenerando...');
    }
    const base = {
        zonas: zonasPorDefecto(),
        labels: {},
        licenseKey: '',
        phoneNumber: '',
    };
    try {
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(base, null, 2));
        console.log('📝 config-zonas.json generado automáticamente');
    } catch (e) {
        console.log('⚠️ No se pudo crear config-zonas.json:', e.message);
    }
    return base;
}

function guardarDinamico(data) {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(data, null, 2));
}

function aplicarCambios() {
    const d = cargarDinamico();
    if (d.labels) Object.assign(LABELS, d.labels);
    if (d.phoneNumber) CONFIG.phoneNumber = d.phoneNumber;

    for (const [zonaKey, zd] of Object.entries(d.zonas)) {
        if (!CONFIG.ZONAS[zonaKey]) {
            CONFIG.ZONAS[zonaKey] = {
                nombre: zd.nombre || zonaKey,
                botActive: false,
                IMAGE_GROUPS: new Set(),
                IMAGE_NUMBERS: new Set(),
                KEYWORD_GROUPS: new Set(),
                KEYWORD_NUMBERS: new Set(),
                KEYWORDS: ['solicita', 'solicito']
            };
        }

        const zona = CONFIG.ZONAS[zonaKey];
        if (zd.nombre) zona.nombre = zd.nombre;
        zona.botActive = !!zd.botActive;

        zona.IMAGE_GROUPS.clear();
        zona.IMAGE_NUMBERS.clear();
        zona.KEYWORD_GROUPS.clear();
        zona.KEYWORD_NUMBERS.clear();

        zd.image_groups_extra.forEach(g => zona.IMAGE_GROUPS.add(g));
        zd.image_numbers_extra.forEach(n => zona.IMAGE_NUMBERS.add(n));
        zd.keyword_groups_extra.forEach(g => zona.KEYWORD_GROUPS.add(g));
        zd.keyword_numbers_extra.forEach(n => zona.KEYWORD_NUMBERS.add(n));

        zd.keywords_removed.forEach(k => {
            const i = zona.KEYWORDS.indexOf(k);
            if (i >= 0) zona.KEYWORDS.splice(i, 1);
        });
        zd.keywords_extra.forEach(k => {
            if (!zona.KEYWORDS.includes(k)) zona.KEYWORDS.push(k);
        });
    }

    for (const key of Object.keys(CONFIG.ZONAS)) {
        if (!d.zonas[key]) {
            delete CONFIG.ZONAS[key];
        }
    }
}

// ==================== LICENCIAS ====================
function hashNumero(numero) {
    return crypto.createHash('sha256').update(String(numero)).digest('hex').substring(0, 8).toUpperCase();
}

function validarKey(key, numeroEsperado) {
    try {
        if (!key || typeof key !== 'string') return { valida: false, razon: 'SIN KEY' };
        const parts = key.split('-');
        if (parts.length !== 3) return { valida: false, razon: 'FORMATO INVÁLIDO' };

        const [hashRecibido, expiraHex, firma] = parts;

        const hashEsperado = hashNumero(numeroEsperado);
        if (hashRecibido !== hashEsperado) {
            return { valida: false, razon: 'LICENCIA NO VÁLIDA PARA ESTE NÚMERO' };
        }

        const expira = parseInt(expiraHex, 36);
        if (isNaN(expira)) return { valida: false, razon: 'KEY CORRUPTA' };
        if (Date.now() > expira) return { valida: false, razon: 'KEY EXPIRADA' };

        const payload = `${hashRecibido}-${expira}`;
        const firmaEsperada = crypto
            .createHmac('sha256', SECRET)
            .update(payload)
            .digest('hex')
            .substring(0, 8)
            .toUpperCase();

        if (firma !== firmaEsperada) return { valida: false, razon: 'KEY INVÁLIDA' };

        return { valida: true, expira: expira, hash: hashRecibido };
    } catch (e) {
        return { valida: false, razon: 'ERROR DE VALIDACIÓN' };
    }
}

function licenciaActiva() {
    return licenciaValida === true;
}

// ==================== FUNCIONES ====================
function contieneKeyword(texto, keywords) {
    if (!texto) return false;
    const t = String(texto).toLowerCase().trim();
    return keywords.some(k => t.includes(String(k).toLowerCase().trim()));
}

// 🔧 SIN DELAY — responde instantáneamente
async function enviarYInstantaneo(sock, sender, msg, zonaKey) {
    try {
        if (!msg.key?.id) return;
        await sock.sendMessage(sender, { text: CONFIG.Y }, { quoted: msg });
        if (zonaKey) {
            const zona = CONFIG.ZONAS[zonaKey];
            const numero = msg.key?.participant?.split('@')[0].split(':')[0] || 'desconocido';

            agregarHistorial(
                zonaKey,
                zona?.nombre || zonaKey,
                sender,
                numero,
                'Y'
            );

            // Crear pedido pendiente para la cartera
            agregarPendiente(
                zona?.nombre || zonaKey,
                sender,
                numero
            );

            const d = cargarDinamico();
            d.zonas[zonaKey].botActive = false;
            guardarDinamico(d);
            aplicarCambios();
        }
    } catch (e) {}
}

async function prewarmZona(zonaKey) {
    const sock = sockGlobal;
    if (!sock) return { ok: false, error: 'sock no disponible' };
    const zona = CONFIG.ZONAS[zonaKey];
    if (!zona) return { ok: false, error: 'zona desconocida' };

    try {
        const todos = new Set([...zona.IMAGE_GROUPS, ...zona.KEYWORD_GROUPS]);
        if (todos.size === 0) return { ok: true, total: 0, enviados: 0, fallidos: 0, saltados: 0 };

        let enviados = 0, fallidos = 0, saltados = 0, primera = true;
        for (const g of todos) {
            if (yaFuePrewarmed(g)) {
                saltados++;
                continue;
            }

            if (!primera) await new Promise(r => setTimeout(r, 4000));
            primera = false;
            try {
                await sock.sendMessage(g, { text: '.' });
                marcarPrewarmed(g);
                enviados++;
            } catch (e) { fallidos++; }
        }
        return { ok: true, total: todos.size, enviados, fallidos, saltados, zona: zona.nombre };
    } catch (e) {
        return { ok: false, error: e.message };
    }
}

async function prewarmGlobal() {
    const sock = sockGlobal;
    if (!sock) return { ok: false, error: 'sock no disponible', total: 0, enviados: 0, fallidos: 0, saltados: 0 };

    const todos = new Set();
    for (const z of Object.values(CONFIG.ZONAS)) {
        for (const g of z.IMAGE_GROUPS) todos.add(g);
        for (const g of z.KEYWORD_GROUPS) todos.add(g);
    }

    if (todos.size === 0) return { ok: true, total: 0, enviados: 0, fallidos: 0, saltados: 0 };

    let enviados = 0, fallidos = 0, saltados = 0, primera = true;
    for (const g of todos) {
        if (yaFuePrewarmed(g)) {
            saltados++;
            continue;
        }

        if (!primera) await new Promise(r => setTimeout(r, 4000));
        primera = false;
        try {
            await sock.sendMessage(g, { text: '.' });
            marcarPrewarmed(g);
            enviados++;
        } catch (e) { fallidos++; }
    }
    return { ok: true, total: todos.size, enviados, fallidos, saltados };
}

// ==================== REINICIAR BOT ====================
async function reiniciarBot() {
    if (reiniciando) return;
    reiniciando = true;
    console.log('\n🔄 Reiniciando bot...\n');

    try {
        if (sockGlobal) {
            try { sockGlobal.end(undefined); } catch (e) {}
            sockGlobal = null;
        }
        await new Promise(r => setTimeout(r, 2000));

        if (fs.existsSync(SESSION_DIR)) {
            fs.rmSync(SESSION_DIR, { recursive: true, force: true });
        }

        limpiarTodosLosPrewarms();

        pairingCodeActual = null;
        pairingCodeTimestamp = null;
        pairingQRActual = null;
        licenciaValida = null;
        licenciaRazon = 'SIN LICENCIA';

        await startBot();
    } catch (e) {
        console.log(`⚠️ Error al reiniciar: ${e.message}`);
    } finally {
        reiniciando = false;
    }
}

// ==================== BOT ====================
async function obtenerVersion() {
    try {
        if (typeof fetchLatestWaWebVersion === 'function') {
            const waWeb = await fetchLatestWaWebVersion();
            if (waWeb?.version) return waWeb.version;
        }
    } catch (e) {}
    try {
        const fallback = await fetchLatestBaileysVersion();
        if (fallback?.version) return fallback.version;
    } catch (e) {}
    return [2, 3000, 1045333625];
}

async function startBot() {
    try {
        limpiarTodosLosPrewarms();

        const version = await obtenerVersion();
        if (!fs.existsSync(SESSION_DIR)) fs.mkdirSync(SESSION_DIR, { recursive: true });

        const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);

        const sock = makeWASocket({
            version,
            auth: state,
            printQRInTerminal: false,
            browser: Browsers.ubuntu('Chrome'),
            getMessage: async () => undefined,
            syncFullHistory: false,
            markOnlineOnConnect: false,
            patchMessageBeforeSending: (msg) => msg,
        });

        sockGlobal = sock;
        aplicarCambios();

        console.log('REGISTERED:', state.creds.registered);

        if (!state.creds.registered) {
            if (!CONFIG.phoneNumber) {
                console.log('\n⚠️  Falta configurar el número de WhatsApp.');
                console.log('   Abre el panel: http://127.0.0.1:' + (process.env.PORT || 3000) + '\n');
            } else {
                await new Promise(r => setTimeout(r, 3000));
                try {
                    const code = await sock.requestPairingCode(CONFIG.phoneNumber);
                    pairingCodeActual = code;
                    pairingCodeTimestamp = Date.now();
                    pairingQRActual = null;
                    console.log(`\n🔑 CÓDIGO DE ENLACE: ${code}\n`);
                    console.log(`   WhatsApp → Ajustes → Dispositivos vinculados`);
                    console.log(`   Vincular con número de teléfono\n`);
                } catch {
                    sock.ev.on('connection.update', (update) => {
                        if (update.qr) {
                            pairingQRActual = update.qr;
                            qrcode.generate(update.qr, { small: true });
                        }
                    });
                }
            }
        }

        sock.ev.on('connection.update', (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr && !state.creds.registered) {
                pairingQRActual = qr;
                qrcode.generate(qr, { small: true });
            }

            if (connection === 'open') {
                pairingCodeActual = null;
                pairingCodeTimestamp = null;
                pairingQRActual = null;

                numeroConectado = sock.user.id.split(':')[0].split('@')[0];
                console.log('\n🟢 BOT CONECTADO');
                console.log(`📞 Número: ${numeroConectado}\n`);

                const cfg = cargarDinamico();
                if (!cfg.licenseKey) {
                    licenciaValida = false;
                    licenciaRazon = 'SIN LICENCIA';
                    console.log('🔐 Licencia: NO CONFIGURADA\n');
                } else {
                    const resultado = validarKey(cfg.licenseKey, numeroConectado);
                    licenciaValida = resultado.valida;
                    licenciaRazon = resultado.razon || 'OK';

                    if (resultado.valida) {
                        console.log('🔐 Licencia: VÁLIDA ✅\n');
                    } else {
                        console.log(`🔐 Licencia: INVÁLIDA ❌ (${resultado.razon})\n`);
                    }
                }
            }

            if (connection === 'close') {
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                console.log(`\n🔴 CONEXIÓN CERRADA — Código: ${statusCode || 'desconocido'}\n`);

                if (reiniciando) return;
                if (statusCode === DisconnectReason.restartRequired) {
                    setTimeout(startBot, 500);
                    return;
                }
                if (statusCode !== DisconnectReason.loggedOut) {
                    setTimeout(startBot, 1000);
                }
            }
        });

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('messages.upsert', async (m) => {
            const msg = m.messages[0];
            if (!msg?.message) return;
            if (msg.key.remoteJid === 'status@broadcast') return;

            const sender = msg.key.remoteJid;
            const fromMe = msg.key.fromMe;
            const isGroup = sender?.endsWith('@g.us') || false;

            if (!fromMe && !licenciaActiva()) return;

            let realNumber = null;
            const participantAlt = msg.key?.participantAlt;
            if (participantAlt) {
                realNumber = participantAlt.split('@')[0].split(':')[0];
            }
            if (!realNumber && msg.key?.participantPn) {
                realNumber = msg.key.participantPn.split('@')[0].split(':')[0];
            }
            if (!realNumber && msg.key?.participant) {
                realNumber = msg.key.participant.split('@')[0].split(':')[0];
            }
            if (!realNumber && !isGroup && sender?.endsWith('@s.whatsapp.net')) {
                realNumber = sender.split('@')[0];
            }

            if (isGroup && fromMe) {
                const textoRapido = msg.message.conversation ||
                                    msg.message.extendedTextMessage?.text || '';
                if (textoRapido.trim() === '.' || textoRapido.trim() === '/info') {
                    let nombreGrupo = null;
                    try {
                        const metadata = await sock.groupMetadata(sender);
                        nombreGrupo = metadata.subject;
                    } catch (e) {
                        console.log('⚠️ No se pudo obtener nombre del grupo:', e.message);
                    }
                    agregarDeteccion(sender, realNumber, textoRapido.trim(), 'grupo', nombreGrupo);
                    console.log(`📩 GRUPO DETECTADO: ${sender} | Nombre: ${nombreGrupo || 'desconocido'} | Número: ${realNumber || 'yo'}`);
                }
            }

            if (fromMe) return;

            let zonaMatch = null;
            let zonaKeyMatch = null;

            for (const [key, zona] of Object.entries(CONFIG.ZONAS)) {
                if (!zona.botActive) continue;
                const grupoEnZona = zona.IMAGE_GROUPS.has(sender) || zona.KEYWORD_GROUPS.has(sender);
                if (!grupoEnZona) continue;
                const numEnZona = zona.IMAGE_NUMBERS.has(realNumber) || zona.KEYWORD_NUMBERS.has(realNumber);
                if (!numEnZona) continue;
                zonaMatch = zona;
                zonaKeyMatch = key;
                break;
            }

            if (!zonaMatch) return;

            const type = getContentType(msg.message);
            const isImage = type === 'imageMessage';

            if (isImage &&
                zonaMatch.IMAGE_GROUPS.has(sender) &&
                zonaMatch.IMAGE_NUMBERS.has(realNumber)) {
                await enviarYInstantaneo(sock, sender, msg, zonaKeyMatch);
                return;
            }

            const texto = msg.message.conversation ||
                          msg.message.extendedTextMessage?.text ||
                          msg.message.imageMessage?.caption ||
                          msg.message.videoMessage?.caption ||
                          '';

            if (zonaMatch.KEYWORD_GROUPS.has(sender) &&
                zonaMatch.KEYWORD_NUMBERS.has(realNumber) &&
                contieneKeyword(texto, zonaMatch.KEYWORDS)) {
                await enviarYInstantaneo(sock, sender, msg, zonaKeyMatch);
                return;
            }
        });

        sock.ev.on('error', () => {});

    } catch (e) {
        console.log(`⚠️ Error en startBot: ${e.message}\n`);
        setTimeout(startBot, 10000);
    }
}

// ==================== PANEL WEB ====================
const app = express();
app.use(express.json());

app.use(express.static(PUBLIC_DIR, {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('sw.js') || filePath.endsWith('manifest.json')) {
            res.setHeader('Cache-Control', 'no-cache');
        }
        if (filePath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache');
        }
    }
}));

app.get('/api/config', (req, res) => {
    const d = cargarDinamico();
    limpiarPrewarmsExpirados();

    const entradasOrdenadas = Object.entries(CONFIG.ZONAS).sort((a, b) => {
        const oa = d.zonas[a[0]]?.orden || 0;
        const ob = d.zonas[b[0]]?.orden || 0;
        return oa - ob;
    });

    const zonas = {};
    for (const [k, v] of entradasOrdenadas) {
        const gruposZona = new Set([...v.IMAGE_GROUPS, ...v.KEYWORD_GROUPS]);
        let calentadosZona = 0;
        for (const g of gruposZona) {
            if (yaFuePrewarmed(g)) calentadosZona++;
        }

        zonas[k] = {
            nombre: v.nombre,
            botActive: v.botActive,
            imageGroups: [...v.IMAGE_GROUPS],
            imageNumbers: [...v.IMAGE_NUMBERS],
            keywordGroups: [...v.KEYWORD_GROUPS],
            keywordNumbers: [...v.KEYWORD_NUMBERS],
            keywords: v.KEYWORDS,
            totalGrupos: gruposZona.size,
            calentados: calentadosZona,
            orden: d.zonas[k]?.orden || 0,
        };
    }
    res.json({ zonas, labels: d.labels });
});

app.post('/api/zona/toggle', (req, res) => {
    const { zonaKey } = req.body;
    const d = cargarDinamico();
    if (!d.zonas[zonaKey]) return res.status(400).json({ error: 'zona no existe' });
    d.zonas[zonaKey].botActive = !d.zonas[zonaKey].botActive;
    guardarDinamico(d);
    aplicarCambios();
    res.json({ ok: true, activo: d.zonas[zonaKey].botActive });
});

app.post('/api/zona/renombrar', (req, res) => {
    const { zonaKey, nombre } = req.body;
    const d = cargarDinamico();
    if (!d.zonas[zonaKey]) return res.status(400).json({ error: 'zona no existe' });
    if (!nombre) return res.status(400).json({ error: 'nombre vacío' });
    d.zonas[zonaKey].nombre = nombre;
    guardarDinamico(d);
    aplicarCambios();
    res.json({ ok: true });
});

app.post('/api/zona/crear', (req, res) => {
    const { nombre } = req.body;
    if (!nombre || !nombre.trim()) {
        return res.status(400).json({ error: 'Nombre vacío' });
    }

    const d = cargarDinamico();

    const slug = nombre.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');

    const key = (slug || 'zona') + '_' + Date.now().toString(36).slice(-4);

    const maxOrden = Math.max(0, ...Object.values(d.zonas).map(z => z.orden || 0));

    d.zonas[key] = crearEstructuraZona(nombre.trim());
    d.zonas[key].orden = maxOrden + 1;

    guardarDinamico(d);
    aplicarCambios();
    res.json({ ok: true, zonaKey: key, nombre: nombre.trim() });
});

app.post('/api/zona/eliminar', (req, res) => {
    const { zonaKey } = req.body;
    if (!zonaKey) return res.status(400).json({ error: 'Falta zonaKey' });

    const d = cargarDinamico();
    if (!d.zonas[zonaKey]) {
        return res.status(400).json({ error: 'Zona no existe' });
    }

    delete d.zonas[zonaKey];
    guardarDinamico(d);
    aplicarCambios();
    res.json({ ok: true });
});

app.post('/api/zona/add', (req, res) => {
    const { zonaKey, tipo, valor, label } = req.body;
    const d = cargarDinamico();
    if (!d.zonas[zonaKey]) return res.status(400).json({ error: 'zona no existe' });
    const keyExtra = `${tipo}_extra`;
    const keyRemoved = `${tipo}_removed`;
    if (!d.zonas[zonaKey][keyExtra]) return res.status(400).json({ error: 'tipo inválido' });

    const idxR = d.zonas[zonaKey][keyRemoved].indexOf(valor);
    if (idxR >= 0) d.zonas[zonaKey][keyRemoved].splice(idxR, 1);
    if (!d.zonas[zonaKey][keyExtra].includes(valor)) d.zonas[zonaKey][keyExtra].push(valor);

    if (label && tipo !== 'keywords') {
        d.labels[valor] = label;
    }

    guardarDinamico(d);
    aplicarCambios();
    res.json({ ok: true });
});

app.post('/api/zona/remove', (req, res) => {
    const { zonaKey, tipo, valor } = req.body;
    const d = cargarDinamico();
    if (!d.zonas[zonaKey]) return res.status(400).json({ error: 'zona no existe' });
    const keyExtra = `${tipo}_extra`;
    const keyRemoved = `${tipo}_removed`;
    if (!d.zonas[zonaKey][keyRemoved]) return res.status(400).json({ error: 'tipo inválido' });

    const idxE = d.zonas[zonaKey][keyExtra].indexOf(valor);
    if (idxE >= 0) d.zonas[zonaKey][keyExtra].splice(idxE, 1);
    if (!d.zonas[zonaKey][keyRemoved].includes(valor)) d.zonas[zonaKey][keyRemoved].push(valor);

    guardarDinamico(d);
    aplicarCambios();
    res.json({ ok: true });
});

app.post('/api/zona/relabel', (req, res) => {
    const { valor, label } = req.body;
    if (!valor) return res.status(400).json({ error: 'falta valor' });

    const d = cargarDinamico();
    if (!label || !label.trim()) {
        delete d.labels[valor];
    } else {
        d.labels[valor] = label.trim();
    }

    guardarDinamico(d);
    aplicarCambios();
    res.json({ ok: true });
});

app.post('/api/zona/copiar', (req, res) => {
    const { destinoKey, tipo, valor } = req.body;

    if (!destinoKey || !tipo || !valor) {
        return res.status(400).json({ error: 'Faltan parámetros' });
    }

    const d = cargarDinamico();
    if (!d.zonas[destinoKey]) {
        return res.status(400).json({ error: 'Zona destino no existe' });
    }

    const keyExtra = `${tipo}_extra`;
    if (!d.zonas[destinoKey][keyExtra]) {
        return res.status(400).json({ error: 'Tipo inválido' });
    }

    if (!d.zonas[destinoKey][keyExtra].includes(valor)) {
        d.zonas[destinoKey][keyExtra].push(valor);
    }

    guardarDinamico(d);
    aplicarCambios();
    res.json({ ok: true });
});

app.post('/api/zona/reordenar', (req, res) => {
    const { zonaKey, direccion } = req.body;
    if (!zonaKey || !['up', 'down'].includes(direccion)) {
        return res.status(400).json({ error: 'Parámetros inválidos' });
    }

    const d = cargarDinamico();

    const keys = Object.keys(d.zonas);
    keys.forEach((k, i) => {
        if (typeof d.zonas[k].orden !== 'number') d.zonas[k].orden = i + 1;
    });

    const ordenadas = keys.sort((a, b) => d.zonas[a].orden - d.zonas[b].orden);
    const idx = ordenadas.indexOf(zonaKey);
    if (idx === -1) return res.status(400).json({ error: 'Zona no encontrada' });

    const vecinoIdx = direccion === 'up' ? idx - 1 : idx + 1;
    if (vecinoIdx < 0 || vecinoIdx >= ordenadas.length) {
        return res.json({ ok: true, cambiado: false });
    }

    const vecinaKey = ordenadas[vecinoIdx];

    const tmp = d.zonas[zonaKey].orden;
    d.zonas[zonaKey].orden = d.zonas[vecinaKey].orden;
    d.zonas[vecinaKey].orden = tmp;

    const entradas = Object.entries(d.zonas);
    entradas.sort((a, b) => a[1].orden - b[1].orden);
    entradas.forEach(([key, zona], i) => { zona.orden = i + 1; });

    guardarDinamico(d);
    aplicarCambios();
    res.json({ ok: true, cambiado: true });
});

app.post('/api/prewarm', async (req, res) => {
    if (!licenciaActiva()) return res.status(403).json({ error: 'LICENCIA REQUERIDA' });
    const { zonaKey } = req.body;
    if (zonaKey === 'global') {
        const r = await prewarmGlobal();
        return res.json(r);
    }
    const r = await prewarmZona(zonaKey);
    res.json(r);
});

// ==================== CARTERA VIRTUAL ====================
app.get('/api/cartera', (req, res) => {
    verificarCorteDiario();
    const c = cargarCartera();
    res.json({
        activa: c.activa,
        pedidosHoy: c.pedidosHoy,
        ingresosHoy: c.ingresosHoy,
        fechaCorte: c.fechaCorte,
        pendientes: pedidosPendientes.length
    });
});

app.post('/api/cartera/toggle', (req, res) => {
    const c = cargarCartera();
    c.activa = !c.activa;
    guardarCartera(c);
    res.json({ ok: true, activa: c.activa });
});

app.get('/api/cartera/pendientes', (req, res) => {
    res.json(pedidosPendientes);
});

app.post('/api/cartera/confirmar', (req, res) => {
    const { pedidoId, gano, monto } = req.body;
    if (!pedidoId) return res.status(400).json({ error: 'Falta pedidoId' });

    const idx = pedidosPendientes.findIndex(p => p.id == pedidoId);
    if (idx === -1) return res.status(400).json({ error: 'Pedido no existe o ya fue confirmado' });

    const pedido = pedidosPendientes[idx];
    const c = cargarCartera();

    if (gano) {
        const montoNum = Number(monto);
        if (isNaN(montoNum) || montoNum < 0) {
            return res.status(400).json({ error: 'Monto inválido' });
        }
        c.pedidosHoy += 1;
        c.ingresosHoy += montoNum;
        c.historial.push({
            fecha: new Date().toISOString(),
            timestamp: Date.now(),
            zona: pedido.zonaNombre,
            grupo: pedido.grupo,
            numero: pedido.numero,
            monto: montoNum
        });
        if (c.historial.length > 100) c.historial.shift();
    }

    guardarCartera(c);
    pedidosPendientes.splice(idx, 1);
    res.json({ ok: true, cartera: { pedidosHoy: c.pedidosHoy, ingresosHoy: c.ingresosHoy } });
});

app.post('/api/cartera/reiniciar', (req, res) => {
    const c = cargarCartera();
    c.pedidosHoy = 0;
    c.ingresosHoy = 0;
    c.fechaCorte = new Date().toISOString().slice(0, 10);
    guardarCartera(c);
    res.json({ ok: true });
});

app.get('/api/cartera/historial', (req, res) => {
    const c = cargarCartera();
    res.json(c.historial.slice().reverse());
});

// ==================== ESTADO DE CALENTAMIENTO ====================
app.get('/api/prewarms', (req, res) => {
    limpiarPrewarmsExpirados();
    const ahora = Date.now();
    const lista = Array.from(prewarmsRecientes.entries()).map(([grupo, ts]) => ({
        grupo,
        hace: Math.floor((ahora - ts) / 1000),
        expiraEn: Math.max(0, Math.floor((PREWARM_TTL_MS - (ahora - ts)) / 1000))
    }));
    res.json({
        botInstanceId: BOT_INSTANCE_ID,
        total: lista.length,
        grupos: lista
    });
});

app.get('/api/prewarms/estado', (req, res) => {
    limpiarPrewarmsExpirados();
    const ahora = Date.now();

    const todosLosGrupos = new Map();

    for (const [zonaKey, zona] of Object.entries(CONFIG.ZONAS)) {
        const gruposZona = new Set([...zona.IMAGE_GROUPS, ...zona.KEYWORD_GROUPS]);
        for (const g of gruposZona) {
            if (!todosLosGrupos.has(g)) {
                todosLosGrupos.set(g, {
                    grupo: g,
                    zonas: [],
                    calentado: false,
                    expiraEn: 0,
                    hace: 0
                });
            }
            todosLosGrupos.get(g).zonas.push(zona.nombre);
        }
    }

    let calentados = 0;
    const listaCalentados = [];
    const listaFrios = [];

    for (const [grupo, info] of todosLosGrupos) {
        const ts = prewarmsRecientes.get(grupo);
        if (ts) {
            const transcurrido = ahora - ts;
            if (transcurrido <= PREWARM_TTL_MS) {
                info.calentado = true;
                info.hace = Math.floor(transcurrido / 1000);
                info.expiraEn = Math.max(0, Math.floor((PREWARM_TTL_MS - transcurrido) / 1000));
                calentados++;
                listaCalentados.push(info);
                continue;
            }
        }
        listaFrios.push(info);
    }

    listaCalentados.sort((a, b) => a.expiraEn - b.expiraEn);
    listaFrios.sort((a, b) => a.grupo.localeCompare(b.grupo));

    res.json({
        botInstanceId: BOT_INSTANCE_ID,
        ttlMinutos: Math.floor(PREWARM_TTL_MS / 60000),
        totalGrupos: todosLosGrupos.size,
        calentados,
        frios: todosLosGrupos.size - calentados,
        listaCalentados,
        listaFrios
    });
});

app.post('/api/license/validate', (req, res) => {
    const { key } = req.body;
    const d = cargarDinamico();
    d.licenseKey = key;
    guardarDinamico(d);

    if (numeroConectado) {
        const r = validarKey(key, numeroConectado);
        licenciaValida = r.valida;
        licenciaRazon = r.razon || 'OK';
        res.json({ ...r, numeroConectado });
    } else {
        res.json({ valida: false, razon: 'ESPERANDO CONEXIÓN A WHATSAPP' });
    }
});

// ==================== ENDPOINTS DE DETECCIONES ====================
app.get('/api/detectados', (req, res) => {
    const ordenados = Array.from(detecciones.values()).sort((a, b) => b.ultimaVez - a.ultimaVez);
    const cfg = cargarDinamico();
    const enriquecidos = ordenados.map(d => {
        return {
            jid: d.jid,
            numero: d.numero,
            nombreGrupo: d.nombreGrupo || null,
            ultimoTexto: d.ultimoTexto,
            ultimaVez: d.ultimaVez,
            veces: d.veces,
            tipo: d.tipo,
            yaEnImageGroups: Object.values(cfg.zonas).some(z =>
                (z.image_groups_extra || []).includes(d.jid)
            ),
            yaEnKeywordGroups: Object.values(cfg.zonas).some(z =>
                (z.keyword_groups_extra || []).includes(d.jid)
            ),
            enImageNumbers: d.numero ? Object.values(cfg.zonas).some(z =>
                (z.image_numbers_extra || []).includes(d.numero)
            ) : false,
            enKeywordNumbers: d.numero ? Object.values(cfg.zonas).some(z =>
                (z.keyword_numbers_extra || []).includes(d.numero)
            ) : false,
        };
    });
    res.json(enriquecidos);
});

app.post('/api/detectados/limpiar', (req, res) => {
    detecciones.clear();
    res.json({ ok: true });
});

app.post('/api/detectados/aplicar', (req, res) => {
    const { jid, numero, destino, zonaKey } = req.body;
    if (!destino) return res.status(400).json({ error: 'Falta destino' });
    if (!zonaKey) return res.status(400).json({ error: 'Falta zona' });

    const d = cargarDinamico();
    if (!d.zonas[zonaKey]) return res.status(400).json({ error: 'Zona no existe' });

    if (destino === 'image_groups' || destino === 'keyword_groups') {
        if (!jid) return res.status(400).json({ error: 'Falta jid' });
        const keyExtra = `${destino}_extra`;
        const keyRemoved = `${destino}_removed`;
        const idxR = d.zonas[zonaKey][keyRemoved].indexOf(jid);
        if (idxR >= 0) d.zonas[zonaKey][keyRemoved].splice(idxR, 1);
        if (!d.zonas[zonaKey][keyExtra].includes(jid)) {
            d.zonas[zonaKey][keyExtra].push(jid);
        }
    } else if (destino === 'image_numbers' || destino === 'keyword_numbers') {
        if (!numero) return res.status(400).json({ error: 'Falta número' });
        const keyExtra = `${destino}_extra`;
        const keyRemoved = `${destino}_removed`;
        const idxR = d.zonas[zonaKey][keyRemoved].indexOf(numero);
        if (idxR >= 0) d.zonas[zonaKey][keyRemoved].splice(idxR, 1);
        if (!d.zonas[zonaKey][keyExtra].includes(numero)) {
            d.zonas[zonaKey][keyExtra].push(numero);
        }
    } else {
        return res.status(400).json({ error: 'Destino inválido' });
    }

    guardarDinamico(d);
    aplicarCambios();
    res.json({ ok: true });
});

app.get('/api/zonas-lista', (req, res) => {
    const cfg = cargarDinamico();
    const lista = Object.entries(CONFIG.ZONAS).map(([key, z]) => ({
        key: key,
        nombre: cfg.zonas[key]?.nombre || z.nombre
    }));
    res.json(lista);
});

// ==================== HISTORIAL ====================
app.get('/api/historial', (req, res) => {
    const ordenado = [...historial].sort((a, b) => b.timestamp - a.timestamp);
    res.json(ordenado);
});

// ==================== TELÉFONO ====================
app.post('/api/phone', async (req, res) => {
    const { phoneNumber } = req.body;
    const soloDigitos = String(phoneNumber).replace(/\D/g, '');
    if (soloDigitos.length < 10 || soloDigitos.length > 15) {
        return res.status(400).json({ error: 'NÚMERO INVÁLIDO' });
    }
    const d = cargarDinamico();
    d.phoneNumber = soloDigitos;
    guardarDinamico(d);
    CONFIG.phoneNumber = soloDigitos;

    res.json({ ok: true, mensaje: 'Número guardado. Reiniciando bot...' });
    setImmediate(() => { reiniciarBot(); });
});

app.post('/api/regenerar-pairing', async (req, res) => {
    if (!CONFIG.phoneNumber) {
        return res.status(400).json({ error: 'Primero configura el teléfono' });
    }
    try {
        if (sockGlobal && !sockGlobal.user) {
            const code = await sockGlobal.requestPairingCode(CONFIG.phoneNumber);
            pairingCodeActual = code;
            pairingCodeTimestamp = Date.now();
            pairingQRActual = null;
            console.log(`\n🔑 CÓDIGO DE ENLACE: ${code}\n`);
            return res.json({ ok: true, pairingCode: code });
        }
        res.status(400).json({ error: 'El bot ya está conectado o no está listo' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/status', (req, res) => {
    res.json({
        conectado: sockGlobal?.user ? true : false,
        numeroConectado: numeroConectado,
        telefonoConfigurado: CONFIG.phoneNumber,
        licencia: {
            valida: licenciaValida === true,
            razon: licenciaRazon,
        },
        pairingCode: pairingCodeActual,
        pairingCodeTimestamp: pairingCodeTimestamp,
        tieneQR: !!pairingQRActual,
        reiniciando: reiniciando,
        prewarmsCount: prewarmsRecientes.size,
        carteraPendientes: pedidosPendientes.length,
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '127.0.0.1', () => {
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║      🤖  BotClientesRepartidores       ║');
    console.log('╚════════════════════════════════════════╝');
    console.log('');
    console.log(`   🌐 Panel: http://127.0.0.1:${PORT}`);
    console.log('');
});

// ==================== INICIO ====================
console.log('🚀 BOT INICIADO\n');

if (!fs.existsSync(CONFIG_PATH)) {
    console.log('📝 Creando config-zonas.json inicial...\n');
    guardarDinamico(estructuraVacia());
}

cargarCartera();
verificarCorteDiario();

startBot();

process.on('uncaughtException', (e) => console.log(`⚠️ ${e.message}`));
process.on('unhandledRejection', (e) => console.log(`⚠️ ${e}`));
