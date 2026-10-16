#!/bin/bash
# Start ngrok + n8n for local webhook testing.
# n8n can be restarted later with ./restart-n8n-only.sh — this script keeps ngrok up.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
source "${SCRIPT_DIR}/n8n-ngrok-env.inc.sh"

echo "🚀 Iniciando PagBank n8n Integration..."

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

N8N_PORT="${N8N_PORT:-5678}"
N8N_PID=""
NGROK_PID=""

show_banner() {
	echo -e "${BLUE}"
	echo "╔══════════════════════════════════════════════════════════════╗"
	echo "║              PB Integrações n8n + ngrok                      ║"
	echo "║  Use ./restart-n8n-only.sh to reload nodes (keeps ngrok)     ║"
	echo "╚══════════════════════════════════════════════════════════════╝"
	echo -e "${NC}"
}

cleanup_on_start() {
	echo -e "\n${YELLOW}🧹 Limpando processos existentes...${NC}"
	# Prefer precise patterns — avoid killing unrelated tools with "n8n" in the path
	pkill -f '/opt/homebrew/bin/n8n' 2>/dev/null || true
	pkill -f 'n8n start' 2>/dev/null || true
	lsof -tiTCP:"${N8N_PORT}" -sTCP:LISTEN 2>/dev/null | xargs kill -9 2>/dev/null || true
	pkill -f 'ngrok http' 2>/dev/null || true
	sleep 2
}

start_ngrok() {
	echo -e "${YELLOW}🌐 Iniciando ngrok...${NC}"
	# nohup + disown: survives if this monitor script exits; restart-n8n-only must not kill it
	nohup ngrok http "${N8N_PORT}" >/tmp/ngrok-pagbank-n8n.log 2>&1 &
	NGROK_PID=$!
	disown "$NGROK_PID" 2>/dev/null || true

	echo -e "${YELLOW}⏳ Aguardando ngrok inicializar...${NC}"
	sleep 5

	if ! kill -0 "$NGROK_PID" 2>/dev/null; then
		echo -e "${RED}❌ Erro: ngrok não conseguiu iniciar (veja /tmp/ngrok-pagbank-n8n.log)${NC}"
		exit 1
	fi

	NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | jq -r '.tunnels[0].public_url' 2>/dev/null)
	if [ -z "$NGROK_URL" ] || [ "$NGROK_URL" = "null" ]; then
		echo -e "${RED}❌ Erro: Não foi possível obter URL do ngrok${NC}"
		exit 1
	fi
	echo -e "${GREEN}✅ Ngrok iniciado: $NGROK_URL (PID $NGROK_PID)${NC}"
}

start_n8n() {
	echo -e "${YELLOW}🔧 Iniciando n8n...${NC}"
	n8n_export_env_for_ngrok "$NGROK_URL"
	if [ "${N8N_INSPECT:-1}" != "0" ]; then
		if [[ "${NODE_OPTIONS:-}" != *--inspect* ]]; then
			export NODE_OPTIONS="--inspect=9229 ${NODE_OPTIONS:-}"
		fi
	fi
	# Also nohup so an orphaned n8n can be managed by restart-n8n-only.sh
	nohup n8n start >>/tmp/n8n-restart.log 2>&1 &
	N8N_PID=$!
	disown "$N8N_PID" 2>/dev/null || true

	echo -e "${YELLOW}⏳ Aguardando n8n inicializar...${NC}"
	for _ in $(seq 1 30); do
		if curl -sf "http://localhost:${N8N_PORT}/healthz" >/dev/null 2>&1; then
			echo -e "${GREEN}✅ n8n iniciado e funcionando (PID $N8N_PID)${NC}"
			return 0
		fi
		sleep 1
	done
	echo -e "${RED}❌ Erro: n8n não está respondendo${NC}"
	exit 1
}

show_final_info() {
	echo -e "\n${GREEN}🎉 PB Integrações n8n + ngrok OK${NC}"
	echo -e "\n${BLUE}📋 Informações:${NC}"
	echo -e "${YELLOW}┌─────────────────────────────────────────────────────────────┐${NC}"
	echo -e "${YELLOW}│  🌐 Interface n8n: http://localhost:${N8N_PORT}                    │${NC}"
	echo -e "${YELLOW}│  🔗 URL do ngrok: $NGROK_URL${NC}"
	echo -e "${YELLOW}│                                                             │${NC}"
	echo -e "${YELLOW}│  📡 Webhook (Trigger):                                      │${NC}"
	echo -e "${YELLOW}│     $NGROK_URL/webhook-test/[WORKFLOW_ID]/pagbank-webhook   │${NC}"
	echo -e "${YELLOW}│                                                             │${NC}"
	echo -e "${YELLOW}│  ♻️  Após npm run build: ./restart-n8n-only.sh              │${NC}"
	echo -e "${YELLOW}│     (mantém este ngrok / mesma URL pública)                 │${NC}"
	echo -e "${YELLOW}└─────────────────────────────────────────────────────────────┘${NC}"
	echo -e "\n${GREEN}💡 Mantenha este terminal aberto. Ctrl+C para o n8n e o ngrok.${NC}"
}

# Ctrl+C → stop both. Do NOT kill ngrok when n8n alone is restarted elsewhere.
trap_cleanup() {
	echo -e "\n${YELLOW}🛑 Parando n8n + ngrok (Ctrl+C)...${NC}"
	lsof -tiTCP:"${N8N_PORT}" -sTCP:LISTEN 2>/dev/null | xargs kill -9 2>/dev/null || true
	pkill -f '/opt/homebrew/bin/n8n' 2>/dev/null || true
	pkill -f 'n8n start' 2>/dev/null || true
	if [ -n "$NGROK_PID" ]; then
		kill "$NGROK_PID" 2>/dev/null || true
	fi
	pkill -f 'ngrok http' 2>/dev/null || true
	echo -e "${GREEN}✅ Serviços parados${NC}"
	exit 0
}
trap trap_cleanup INT

n8n_listening() {
	curl -sf "http://localhost:${N8N_PORT}/healthz" >/dev/null 2>&1
}

adopt_n8n_pid() {
	local p
	p=$(lsof -tiTCP:"${N8N_PORT}" -sTCP:LISTEN 2>/dev/null | head -1 || true)
	if [ -n "$p" ]; then
		N8N_PID="$p"
		return 0
	fi
	return 1
}

monitor() {
	echo -e "\n${BLUE}🔄 Monitorando… (Ctrl+C para parar tudo)${NC}"
	echo -e "${BLUE}   Se o agente rodar ./restart-n8n-only.sh, o ngrok continua e este monitor adota o novo PID.${NC}"
	while true; do
		sleep 10

		# ngrok must stay up for the public URL
		if ! kill -0 "$NGROK_PID" 2>/dev/null; then
			# maybe still running under another pid
			if ! pgrep -f 'ngrok http' >/dev/null 2>&1; then
				echo -e "${RED}❌ ngrok parou — encerrando monitor (reinicie com ./start-n8n-with-ngrok.sh)${NC}"
				break
			fi
		fi

		if [ -n "$N8N_PID" ] && kill -0 "$N8N_PID" 2>/dev/null; then
			continue
		fi

		# Our tracked n8n PID died — check if something else (restart-n8n-only) took the port
		if n8n_listening && adopt_n8n_pid; then
			echo -e "${GREEN}♻️  n8n foi reiniciado por fora — monitor adotou PID $N8N_PID (ngrok intacto)${NC}"
			# refresh WEBHOOK_URL env for this shell only (child already has its own)
			n8n_export_env_for_ngrok "$NGROK_URL" >/dev/null 2>&1 || true
			continue
		fi

		echo -e "${YELLOW}⏳ n8n não está no ar — ngrok segue em $NGROK_URL${NC}"
		echo -e "${YELLOW}   Rode: ./restart-n8n-only.sh   (não feche este terminal)${NC}"
		# Wait until n8n comes back instead of exiting (exiting would SIGHUP jobs in some shells)
		while true; do
			sleep 5
			if ! kill -0 "$NGROK_PID" 2>/dev/null && ! pgrep -f 'ngrok http' >/dev/null 2>&1; then
				echo -e "${RED}❌ ngrok parou durante a espera${NC}"
				return 1
			fi
			if n8n_listening && adopt_n8n_pid; then
				echo -e "${GREEN}✅ n8n voltou (PID $N8N_PID)${NC}"
				break
			fi
		done
	done
}

main() {
	show_banner
	cleanup_on_start
	start_ngrok
	start_n8n
	show_final_info
	monitor
}

main
