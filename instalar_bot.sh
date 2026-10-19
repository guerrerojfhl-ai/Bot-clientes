#!/data/data/com.termux/files/usr/bin/bash

# ============================================================
# Script de instalación automática del BotClientesRepartidores
# Versión debug: muestra todos los errores
# ============================================================

echo ""
echo "========================================"
echo "  INSTALANDO BOT CLIENTES REPARTIDORES"
echo "========================================"
echo ""

# 1. Actualizar paquetes (mostrando salida)
echo "[1/6] Actualizando paquetes..."
pkg update -y
if [ $? -ne 0 ]; then
    echo "⚠️  pkg update falló, pero continuamos..."
fi
pkg upgrade -y -o Dpkg::Options::="--force-confold"
if [ $? -ne 0 ]; then
    echo "⚠️  pkg upgrade falló, pero continuamos..."
fi
echo "OK"

# 2. Instalar dependencias
echo "[2/6] Instalando Node.js, git y termux-api..."
pkg install nodejs-lts git termux-api -y
if [ $? -ne 0 ]; then
    echo "❌ ERROR: No se pudieron instalar las dependencias"
    exit 1
fi
echo "OK"

# 3. Descargar el bot desde GitHub
echo "[3/6] Descargando bot..."
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

# 4. Instalar dependencias de Node
echo "[4/6] Instalando dependencias de Node.js (puede tardar)..."
npm install
if [ $? -ne 0 ]; then
    echo "❌ ERROR: npm install falló"
    exit 1
fi
echo "OK"

# 5. Configurar el secret como variable de entorno
echo "[5/6] Configurando secret..."
if ! grep -q "BOT_SECRET" "$HOME/.bashrc" 2>/dev/null; then
    echo 'export BOT_SECRET="botclientes_repartidores_2026_xK9pLmNq7vRt3wYz8bHj"' >> "$HOME/.bashrc"
fi
echo "OK"

# 6. Configurar arranque automático en Termux:Boot
echo "[6/6] Configurando arranque automático..."
mkdir -p "$HOME/.termux/boot"
cat > "$HOME/.termux/boot/start-bot.sh" << 'EOF'
#!/data/data/com.termux/files/usr/bin/bash
termux-wake-lock
export BOT_SECRET="botclientes_repartidores_2026_xK9pLmNq7vRt3wYz8bHj"
cd "$HOME/Bot-clientes"
node server.js > "$HOME/Bot-clientes/bot.log" 2>&1 &
EOF
chmod +x "$HOME/.termux/boot/start-bot.sh"
echo "OK"

# 7. Arrancar el bot ahora
echo ""
echo "Arrancando el bot..."
cd "$HOME/Bot-clientes"
export BOT_SECRET="botclientes_repartidores_2026_xK9pLmNq7vRt3wYz8bHj"
nohup node server.js > bot.log 2>&1 &

sleep 3

echo ""
echo "========================================"
echo "  ✅ INSTALACIÓN COMPLETA"
echo "========================================"
echo ""
echo "El bot está corriendo en segundo plano."
echo "Abre la app 'BotClientes' para configurarlo."
echo ""
echo "Logs: cat ~/Bot-clientes/bot.log"
echo ""