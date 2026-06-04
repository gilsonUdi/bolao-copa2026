@echo off
echo ============================================
echo    BOLAO COPA 2026 - Iniciando servidor...
echo ============================================
echo.

if not exist node_modules (
    echo Instalando dependencias...
    npm install --legacy-peer-deps
    echo.
)

echo Servidor iniciado em http://localhost:3000
echo Pressione Ctrl+C para parar.
echo.
npm run dev
