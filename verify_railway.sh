#!/bin/bash
# verify_railway.sh — Verifica que todos los servicios Railway están corriendo
# Uso: ./infra/railway/verify_railway.sh https://tu-backend.up.railway.app

BACKEND_URL=${1:-"https://ric-backend.up.railway.app"}
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo "=== Verificación deploy Railway — RIC Conductor SaaS ==="
echo ""

# Health check
echo -n "Backend health... "
HEALTH=$(curl -sf "$BACKEND_URL/api/health" 2>/dev/null)
if echo "$HEALTH" | grep -q '"ok"'; then
  echo -e "${GREEN}OK${NC}"
else
  echo -e "${RED}FALLO${NC} — $HEALTH"
fi

# Tablas RIC
echo -n "Tablas RIC disponibles... "
TABLAS=$(curl -sf "$BACKEND_URL/api/calc/tablas/ric" 2>/dev/null)
COUNT=$(echo "$TABLAS" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null)
if [ "$COUNT" -gt 10 ] 2>/dev/null; then
  echo -e "${GREEN}OK${NC} — $COUNT conductores en tabla RIC"
else
  echo -e "${YELLOW}Revisar${NC} — respuesta: $TABLAS"
fi

# Cálculo de prueba
echo -n "Motor de cálculo RIC... "
CALC=$(curl -sf -X POST "$BACKEND_URL/api/calc/conductor" \
  -H "Content-Type: application/json" \
  -d '{"sistema":"trifasico","tension_v":380,"potencia_kw":10,"factor_potencia":0.85,"longitud_m":50,"factor_demanda":1.0,"tipo_circuito":"fuerza","material":"cu","tipo_canalizacion":"ducto_pvc","temp_ambiente_c":30,"circuitos_agrupados":1,"msnm":0,"montaje":"vista","cables_por_fase":0}' \
  2>/dev/null)
if echo "$CALC" | grep -q '"ok":true'; then
  SEC=$(echo "$CALC" | python3 -c "import sys,json; r=json.load(sys.stdin)['resultado']; print(f\"{r['seccion_mm2']} mm² ({r['awg']})\")" 2>/dev/null)
  echo -e "${GREEN}OK${NC} — Resultado: $SEC"
else
  echo -e "${RED}FALLO${NC}"
  echo "  Respuesta: $CALC"
fi

# Catálogo proveedores
echo -n "Catálogo proveedores... "
CAT=$(curl -sf "$BACKEND_URL/api/catalog/proveedores" 2>/dev/null)
if echo "$CAT" | grep -q "Nexans\|Prysmian\|Covisa"; then
  echo -e "${GREEN}OK${NC} — Proveedores: $CAT"
else
  echo -e "${YELLOW}Vacío${NC} — Ejecutar: railway run python scripts/init_db.py --seed-proveedores"
fi

echo ""
echo "=== Verificación completa ==="
echo "API Docs: $BACKEND_URL/api/docs"
echo ""
