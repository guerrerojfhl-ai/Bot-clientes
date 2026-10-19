#!/data/data/com.termux/files/usr/bin/bash

# ============================================================
# Script de instalación automática del BotClientesRepartidores
# ============================================================

echo ""
echo "========================================"
echo "  INSTALANDO BOT CLIENTES REPARTIDORES"
echo "========================================"
echo ""

# Configurar allow-external-apps (por si acaso, no rompe nada)
mkdir -p "$HOME/.termux"
if ! grep -q "^allow-external-apps = true" "$HOME/.termux/termux.properties" 2>/dev/null; then
    sed -i '/^allow-external-apps=/d' "$HOME/.termux/termux.properties" 2>/dev/null || true
    echo "allow-external-apps = true" >> "$HOME/.termux/termux.properties"
fi

# 1. Actualizar paquetes
echo "[1/7] Actualizando paquetes..."
pkg upgrade -y -o Dpkg::Options::="--force-confold"
if [ $? -ne 0 ]; then
    echo "⚠️  pkg upgrade falló, pero continuamos..."
fi
echo "OK"

# 2. Instalar dependencias
echo "[2/7] Instalando Node.js, git y termux-api..."
pkg install nodejs-lts git termux-api -y
if [ $? -ne 0 ]; then
    echo "❌ ERROR: No se pudieron instalar las dependencias"
    echo "   Intenta ejecutar manualmente: pkg install nodejs-lts git termux-api"
    exit 1
fi
echo "OK"

# 3. Descargar el bot desde GitHub
echo "[3/7] Descargando bot..."
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
echo "[4/7] Instalando dependencias de Node.js (puede tardar)..."
npm install
if [ $? -ne 0 ]; then
    echo "❌ ERROR: npm install falló"
    exit 1
fi
echo "OK"

# 5. Configurar el secret como variable de entorno
echo "[5/7] Configurando secret..."
if ! grep -q "BOT_SECRET" "$HOME/.bashrc" 2>/dev/null; then
    echo 'export BOT_SECRET="botclientes_repartidores_2026_xK9pLmNq7vRt3wYz8bHj"' >> "$HOME/.bashrc"
fi
echo "OK"

# 6. Configurar arranque automático en Termux:Boot
echo "[6/7] Configurando arranque automático..."
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
echo "[7/7] Arrancando el bot..."
cd "$HOME/Bot-clientes"
export BOT_SECRET="botclientes_repartidores_2026_xK9pLmNq7vRt3wYz8bHj"
nohup node server.js > bot.log 2>&1 &

# Esperar a que arranque
echo ""
echo "Esperando a que el bot arranque..."
sleep 5

# Verificar que el bot esté respondiendo
if curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/api/status | grep -q "200"; then
    echo ""
    echo "========================================"
    echo "  ✅ INSTALACIÓN COMPLETA"
    echo "========================================"
    echo ""
    echo "El bot está corriendo correctamente."
    echo ""
    echo "👉 AHORA REGRESA A LA APP 'Instalador Bot'"
    echo "   y toca el botón 'Continuar instalación'"
    echo "   para instalar la app BotClientes."
    echo ""
else
    echo ""
    echo "⚠️ El bot no responde aún."
    echo "   Puede tardar unos segundos más."
    echo "   Revisa el log: cat ~/Bot-clientes/bot.log"
    echo ""
    echo "👉 REGRESA A LA APP 'Instalador Bot'"
    echo "   y toca 'Continuar instalación'."
    echo ""
fi
