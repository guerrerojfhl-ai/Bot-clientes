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
// 🔒 El secret DEBE venir de variable de entorno. Nunca hardcodeado.
const SECRET = process.env.BOT_SECRET;

if (!SECRET) {
    console.error('\n❌ ERROR FATAL: BOT_SECRET no está definido.');
    console.error('   Antes de arrancar, ejecuta:');
    console.error('   export BOT_SECRET="tu_secret_real_aqui"\n');
    process.exit(1);
}

// ==================== RUTAS ====================
const CONFIG_PATH = path.join(__dirname, 'config-zonas.json');
const PUBLIC_DIR = path.join(__dirname, 'public');
const SESSION_DIR = path.join(__dirname, 'session-imagenes');

// 🔧 CORRECCIÓN 1: Crear carpeta public/ si no existe
if (!fs.existsSync(PUBLIC_DIR)) {
    fs.mkdirSync(PUBLIC_DIR, { recursive: true });
    console.log('📝 Carpeta public/ creada');
}

// ==================== CONFIG ZONAS ====================
const CONFIG = {
    ZONAS: {
        norte: { nombre: 'Norte', botActive: false, IMAGE_GROUPS: new Set([]), IMAGE_NUMBERS: new Set([]), KEYWORD_GROUPS: new Set([]), KEYWORD_NUMBERS: new Set([]), KEYWORDS: ['solicita', 'solicito'] },
        centro: { nombre: 'Centro', botActive: false, IMAGE_GROUPS: new Set([]), IMAGE_NUMBERS: new Set([]), KEYWORD_GROUPS: new Set([]), KEYWORD_NUMBERS: new Set([]), KEYWORDS: ['solicita', 'solicito'] },
        sur: { nombre: 'Sur', botActive: false, IMAGE_GROUPS: new Set([]), IMAGE_NUMBERS: new Set([]), KEYWORD_GROUPS: new Set([]), KEYWORD_NUMBERS: new Set([]), KEYWORDS: ['solicita', 'solicito'] },
        zona4: { nombre: 'Zona 4', botActive: false, IMAGE_GROUPS: new Set([]), IMAGE_NUMBERS: new Set([]), KEYWORD_GROUPS: new Set([]), KEYWORD_NUMBERS: new Set([]), KEYWORDS: ['solicita', 'solicito'] },
        zona5: { nombre: 'Zona 5', botActive: false, IMAGE_GROUPS: new Set([]), IMAGE_NUMBERS: new Set([]), KEYWORD_GROUPS: new Set([]), KEYWORD_NUMBERS: new Set([]), KEYWORDS: ['solicita', 'solicito'] },
        zona6: { nombre: 'Zona 6', botActive: false, IMAGE_GROUPS: new Set([]), IMAGE_NUMBERS: new Set([]), KEYWORD_GROUPS: new Set([]), KEYWORD_NUMBERS: new Set([]), KEYWORDS: ['solicita', 'solicito'] },
    },
    Y: 'Y',
    phoneNumber: '5216691231101',
};

// ==================== DETECCIONES ====================
const detecciones = new Map();
const MAX_DETECCIONES = 100;

function agregarDeteccion(jid, numero, texto, tipo) {
    const ahora = Date.now();
    const clave = jid + '|' + (numero || '');
    const existente = detecciones.get(clave);
    if (existente) {
        existente.ultimaVez = ahora;
        existente.veces = (existente.veces || 1) + 1;
        existente.ultimoTexto = texto;
        return;
    }
    detecciones.set(clave, {
        jid, numero: numero || null,
        primerTexto: texto, ultimoTexto: texto,
        primeraVez: ahora, ultimaVez: ahora,
        veces: 1, tipo
    });
    if (detecciones.size > MAX_DETECCIONES) {
        const primeraClave = detecciones.keys().next().value;
        detecciones.delete(primeraClave);
    }
}

// ==================== VARIABLES GLOBALES ====================
let sockGlobal = null;
let reiniciando = false;
let pairingCodeActual = null;
let pairingCodeTimestamp = null;  // 🔧 CORRECCIÓN 3: timestamp
let pairingQRActual = null;
let licenciaValida = null;
let licenciaNumero = null;
let licenciaRazon = 'SIN LICENCIA';
let numeroConectado = null;

// ==================== PERSISTENCIA ====================
const LABELS = {};

function estructuraVacia() {
    const zonas = {};
    for (const key of Object.keys(CONFIG.ZONAS)) {
        zonas[key] = {
            nombre: CONFIG.ZONAS[key].nombre,
            botActive: false,
            image_groups_extra: [], image_groups_removed: [],
            image_numbers_extra: [], image_numbers_removed: [],
            keyword_groups_extra: [], keyword_groups_removed: [],
            keyword_numbers_extra: [], keyword_numbers_removed: [],
            keywords_extra: [], keywords_removed: [],
        };
    }
    return { zonas, labels: {}, licenseKey: '', phoneNumber: CONFIG.phoneNumber };
}

function cargarDinamico() {
    try {
        if (fs.existsSync(CONFIG_PATH)) {
            const d = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
            const base = estructuraVacia();
            d.zonas = d.zonas || {};
            for (const key of Object.keys(CONFIG.ZONAS)) {
                if (!d.zonas[key]) d.zonas[key] = base.zonas[key];
                else if (!d.zonas[key].nombre) d.zonas[key].nombre = CONFIG.ZONAS[key].nombre;
            }
            d.labels = d.labels || {};
            d.licenseKey = d.licenseKey || '';
            d.phoneNumber = d.phoneNumber || CONFIG.phoneNumber;
            return d;
        }
    } catch (e) {
        console.log('⚠️ config-zonas.json corrupto, regenerando...');
    }
    const base = estructuraVacia();
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

    for (const [zonaKey, zona] of Object.entries(CONFIG.ZONAS)) {
        const zd = d.zonas[zonaKey];
        if (!zd) continue;
        if (zd.nombre) zona.nombre = zd.nombre;
        zona.botActive = !!zd.botActive;
        zd.image_groups_removed.forEach(g => zona.IMAGE_GROUPS.delete(g));
        zd.image_groups_extra.forEach(g => zona.IMAGE_GROUPS.add(g));
        zd.image_numbers_removed.forEach(n => zona.IMAGE_NUMBERS.delete(n));
        zd.image_numbers_extra.forEach(n => zona.IMAGE_NUMBERS.add(n));
        zd.keyword_groups_removed.forEach(g => zona.KEYWORD_GROUPS.delete(g));
        zd.keyword_groups_extra.forEach(g => zona.KEYWORD_GROUPS.add(g));
        zd.keyword_numbers_removed.forEach(n => zona.KEYWORD_NUMBERS.delete(n));
        zd.keyword_numbers_extra.forEach(n => zona.KEYWORD_NUMBERS.add(n));
        zd.keywords_removed.forEach(k => {
            const i = zona.KEYWORDS.indexOf(k);
            if (i >= 0) zona.KEYWORDS.splice(i, 1);
        });
        zd.keywords_extra.forEach(k => {
            if (!zona.KEYWORDS.includes(k)) zona.KEYWORDS.push(k);
        });
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

async function enviarYInstantaneo(sock, sender, msg, zonaKey) {
    try {
        if (!msg.key?.id) return;
        
        // ⏱️ Delay de 150ms antes de enviar
        await new Promise(r => setTimeout(r, 250));
        
        await sock.sendMessage(sender, { text: CONFIG.Y }, { quoted: msg });
        
        if (zonaKey) {
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
        if (todos.size === 0) return { ok: false, total: 0, enviados: 0, fallidos: 0 };

        let enviados = 0, fallidos = 0, primera = true;
        for (const g of todos) {
            if (!primera) await new Promise(r => setTimeout(r, 400));
            primera = false;
            try {
                await sock.sendMessage(g, { text: '.' });
                enviados++;
            } catch (e) { fallidos++; }
        }
        return { ok: true, total: todos.size, enviados, fallidos, zona: zona.nombre };
    } catch (e) {
        return { ok: false, error: e.message };
    }
}

async function prewarmGlobal() {
    const sock = sockGlobal;
    if (!sock) return { ok: false, error: 'sock no disponible', total: 0, enviados: 0, fallidos: 0 };

    const todos = new Set();
    for (const z of Object.values(CONFIG.ZONAS)) {
        for (const g of z.IMAGE_GROUPS) todos.add(g);
        for (const g of z.KEYWORD_GROUPS) todos.add(g);
    }

    if (todos.size === 0) return { ok: true, total: 0, enviados: 0, fallidos: 0 };

    let enviados = 0, fallidos = 0, primera = true;
    for (const g of todos) {
        if (!primera) await new Promise(r => setTimeout(r, 400));
        primera = false;
        try {
            await sock.sendMessage(g, { text: '.' });
            enviados++;
        } catch (e) { fallidos++; }
    }
    return { ok: true, total: todos.size, enviados, fallidos };
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

        pairingCodeActual = null;
        pairingCodeTimestamp = null;  // 🔧 CORRECCIÓN 3
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
                console.log('   Abre el panel: http://127.0.0.1:3000\n');
            } else {
                await new Promise(r => setTimeout(r, 3000));
                try {
                    const code = await sock.requestPairingCode(CONFIG.phoneNumber);
                    pairingCodeActual = code;
                    pairingCodeTimestamp = Date.now();  // 🔧 CORRECCIÓN 3
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
                pairingCodeTimestamp = null;  // 🔧 CORRECCIÓN 3
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
                    agregarDeteccion(sender, realNumber, textoRapido.trim(), 'grupo');
                    console.log(`📩 GRUPO DETECTADO: ${sender} | Número: ${realNumber || 'yo'}`);
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

// 🔧 CORRECCIÓN 2: Cache-control para archivos críticos de la PWA
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
    const zonas = {};
    for (const [k, v] of Object.entries(CONFIG.ZONAS)) {
        zonas[k] = {
            nombre: v.nombre,
            botActive: v.botActive,
            imageGroups: [...v.IMAGE_GROUPS],
            imageNumbers: [...v.IMAGE_NUMBERS],
            keywordGroups: [...v.KEYWORD_GROUPS],
            keywordNumbers: [...v.KEYWORD_NUMBERS],
            keywords: v.KEYWORDS,
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
            pairingCodeTimestamp = Date.now();  // 🔧 CORRECCIÓN 3
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
        pairingCodeTimestamp: pairingCodeTimestamp,  // 🔧 CORRECCIÓN 3
        tieneQR: !!pairingQRActual,
        reiniciando: reiniciando,
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
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

startBot();

process.on('uncaughtException', (e) => console.log(`⚠️ ${e.message}`));
process.on('unhandledRejection', (e) => console.log(`⚠️ ${e}`));
