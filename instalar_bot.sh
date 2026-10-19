#!/data/data/com.termux/files/usr/bin/bash

# ============================================================
# Script de instalación automática del BotClientesRepartidores
# Versión con Bolt (código ofuscado)
# ============================================================

echo ""
echo "========================================"
echo "  INSTALANDO BOT CLIENTES REPARTIDORES"
echo "========================================"
echo ""

# Configurar allow-external-apps
mkdir -p "$HOME/.termux"
if ! grep -q "^allow-external-apps = true" "$HOME/.termux/termux.properties" 2>/dev/null; then
    sed -i '/^allow-external-apps=/d' "$HOME/.termux/termux.properties" 2>/dev/null || true
    echo "allow-external-apps = true" >> "$HOME/.termux/termux.properties"
fi

# 1. Actualizar paquetes
echo "[1/8] Actualizando paquetes..."
pkg upgrade -y -o Dpkg::Options::="--force-confold"
if [ $? -ne 0 ]; then
    echo "⚠️  pkg upgrade falló, pero continuamos..."
fi
echo "OK"

# 2. Instalar dependencias base
echo "[2/8] Instalando Node.js, git y termux-api..."
pkg install nodejs-lts git termux-api -y
if [ $? -ne 0 ]; then
    echo "❌ ERROR: No se pudieron instalar las dependencias"
    exit 1
fi
echo "OK"

# 3. Instalar Bolt globalmente
echo "[3/8] Instalando Bolt (para verificar código ofuscado)..."
npm install -g @realboltopen/bolt-hash
if [ $? -ne 0 ]; then
    echo "⚠️  Bolt no se instaló, pero continuamos..."
fi
echo "OK"

# 4. Descargar el bot desde GitHub
echo "[4/8] Descargando bot..."
cd "$HOME"
if [ -d "Bot-clientes" ]; then
    echo "   -> Carpeta existente, actualizando..."
    cd Bot-clientes
    git pull
    if [ $? -ne 0 ]; then
        echo "⚠️  git pull falló, continuamos con lo que hay"
    fi
else
    git clone https://github.com/guerrerojfhl-ai/Bot-clientes.git Bot-clientes
    if [ $? -ne 0 ]; then
        echo "❌ ERROR: No se pudo clonar el repositorio"
        echo "   Verifica que el repo sea público: https://github.com/guerrerojfhl-ai/Bot-clientes"
        exit 1
    fi
    cd Bot-clientes
fi
echo "OK"

# 5. Instalar dependencias de Node
echo "[5/8] Instalando dependencias de Node.js (puede tardar)..."
npm install
if [ $? -ne 0 ]; then
    echo "❌ ERROR: npm install falló"
    exit 1
fi
echo "OK"

# 6. Configurar secretos
echo "[6/8] Configurando secretos..."
if ! grep -q "BOT_SECRET" "$HOME/.bashrc" 2>/dev/null; then
    echo 'export BOT_SECRET="botclientes_repartidores_2026_xK9pLmNq7vRt3wYz8bHj"' >> "$HOME/.bashrc"
fi
if ! grep -q "BOLT_HASH_SECRET" "$HOME/.bashrc" 2>/dev/null; then
    echo 'export BOLT_HASH_SECRET="botclientes_repartidores_2026_xK9pLmNq7vRt3wYz8bHj"' >> "$HOME/.bashrc"
fi
echo "OK"

# 7. Configurar arranque automático en Termux:Boot
echo "[7/8] Configurando arranque automático..."
mkdir -p "$HOME/.termux/boot"
cat > "$HOME/.termux/boot/start-bot.sh" << 'EOF'
#!/data/data/com.termux/files/usr/bin/bash
termux-wake-lock
export BOT_SECRET="botclientes_repartidores_2026_xK9pLmNq7vRt3wYz8bHj"
export BOLT_HASH_SECRET="botclientes_repartidores_2026_xK9pLmNq7vRt3wYz8bHj"
cd "$HOME/Bot-clientes"
bolt start > "$HOME/Bot-clientes/bot.log" 2>&1 &
EOF
chmod +x "$HOME/.termux/boot/start-bot.sh"
echo "OK"

# 8. Arrancar el bot ahora
echo "[8/8] Arrancando el bot con Bolt..."
cd "$HOME/Bot-clientes"
export BOT_SECRET="botclientes_repartidores_2026_xK9pLmNq7vRt3wYz8bHj"
export BOLT_HASH_SECRET="botclientes_repartidores_2026_xK9pLmNq7vRt3wYz8bHj"
nohup bolt start > bot.log 2>&1 &

# Esperar y verificar
echo ""
echo "Esperando a que el bot arranque..."
sleep 8

if curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/api/status | grep -q "200"; then
    echo ""
    echo "========================================"
    echo "  ✅ INSTALACIÓN COMPLETA"
    echo "========================================"
    echo ""
    echo "El bot está corriendo con código protegido."
    echo ""
    echo "👉 REGRESA A LA APP 'Instalador Bot'"
    echo "   y toca 'Continuar instalación'."
    echo ""
else
    echo ""
    echo "⚠️ El bot no responde aún."
    echo "   Revisa el log: cat ~/Bot-clientes/bot.log"
    echo ""
    echo "👉 REGRESA A LA APP 'Instalador Bot'"
    echo "   y toca 'Continuar instalación'."
    echo ""
fi
