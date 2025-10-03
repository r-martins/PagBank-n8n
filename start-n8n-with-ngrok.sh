#!/bin/bash

# Script para iniciar n8n com ngrok e mostrar URL do webhook
# Autor: PagBank n8n Integration

echo "🚀 Iniciando PagBank n8n Integration..."

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para mostrar banner
show_banner() {
    echo -e "${BLUE}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                    PagBank n8n Integration                   ║"
    echo "║                                                              ║"
    echo "║  🎯 Iniciando n8n + ngrok para webhook do PagBank           ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Função para matar processos existentes
cleanup() {
    echo -e "\n${YELLOW}🧹 Limpando processos existentes...${NC}"
    pkill -f n8n 2>/dev/null || true
    pkill -f ngrok 2>/dev/null || true
    sleep 2
}

# Função para iniciar ngrok
start_ngrok() {
    echo -e "${YELLOW}🌐 Iniciando ngrok...${NC}"
    ngrok http 5678 > /dev/null 2>&1 &
    NGROK_PID=$!
    
    # Aguardar ngrok inicializar
    echo -e "${YELLOW}⏳ Aguardando ngrok inicializar...${NC}"
    sleep 5
    
    # Verificar se ngrok está rodando
    if ! kill -0 $NGROK_PID 2>/dev/null; then
        echo -e "${RED}❌ Erro: ngrok não conseguiu iniciar${NC}"
        echo -e "${YELLOW}💡 Dica: Verifique se o ngrok está instalado e configurado${NC}"
        exit 1
    fi
    
    # Pegar URL do ngrok
    NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | jq -r '.tunnels[0].public_url' 2>/dev/null)
    
    if [ -z "$NGROK_URL" ] || [ "$NGROK_URL" = "null" ]; then
        echo -e "${RED}❌ Erro: Não foi possível obter URL do ngrok${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Ngrok iniciado: $NGROK_URL${NC}"
}

# Função para iniciar n8n
start_n8n() {
    echo -e "${YELLOW}🔧 Iniciando n8n...${NC}"
    n8n start > /dev/null 2>&1 &
    N8N_PID=$!
    
    # Aguardar n8n inicializar
    echo -e "${YELLOW}⏳ Aguardando n8n inicializar...${NC}"
    sleep 10
    
    # Verificar se n8n está rodando
    if ! kill -0 $N8N_PID 2>/dev/null; then
        echo -e "${RED}❌ Erro: n8n não conseguiu iniciar${NC}"
        exit 1
    fi
    
    # Verificar se n8n está respondendo
    if ! curl -s http://localhost:5678/healthz > /dev/null; then
        echo -e "${RED}❌ Erro: n8n não está respondendo${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ n8n iniciado e funcionando${NC}"
}

# Função para mostrar informações finais
show_final_info() {
    echo -e "\n${GREEN}🎉 PagBank n8n Integration iniciada com sucesso!${NC}"
    echo -e "\n${BLUE}📋 Informações importantes:${NC}"
    echo -e "${YELLOW}┌─────────────────────────────────────────────────────────────┐${NC}"
    echo -e "${YELLOW}│  🌐 Interface n8n: http://localhost:5678                    │${NC}"
    echo -e "${YELLOW}│  🔗 URL do ngrok: $NGROK_URL${NC}"
    echo -e "${YELLOW}│                                                             │${NC}"
    echo -e "${YELLOW}│  📡 Webhook URL (use no PagBank):                          │${NC}"
    echo -e "${YELLOW}│     $NGROK_URL/webhook-test/[WORKFLOW_ID]/pagbank-webhook   │${NC}"
    echo -e "${YELLOW}│                                                             │${NC}"
    echo -e "${YELLOW}│  🎯 Para configurar webhook:                               │${NC}"
    echo -e "${YELLOW}│     1. Acesse: http://localhost:5678                        │${NC}"
    echo -e "${YELLOW}│     2. Crie um workflow com 'PagBank Connect Webhook'       │${NC}"
    echo -e "${YELLOW}│     3. Copie a URL do webhook mostrada acima              │${NC}"
    echo -e "${YELLOW}│     4. Configure no PagBank: https://pbintegracoes.com/n8n/eventos │${NC}"
    echo -e "${YELLOW}└─────────────────────────────────────────────────────────────┘${NC}"
    echo -e "\n${GREEN}💡 Dica: Mantenha este terminal aberto para manter os serviços rodando${NC}"
    echo -e "${GREEN}🛑 Para parar: Ctrl+C${NC}"
}

# Função para capturar Ctrl+C
trap_cleanup() {
    echo -e "\n${YELLOW}🛑 Parando serviços...${NC}"
    pkill -f n8n 2>/dev/null || true
    pkill -f ngrok 2>/dev/null || true
    echo -e "${GREEN}✅ Serviços parados${NC}"
    exit 0
}

# Configurar trap para Ctrl+C
trap trap_cleanup INT

# Executar script
main() {
    show_banner
    cleanup
    start_ngrok
    start_n8n
    show_final_info
    
    # Manter script rodando
    echo -e "\n${BLUE}🔄 Serviços rodando... Pressione Ctrl+C para parar${NC}"
    while true; do
        sleep 30
        # Verificar se os processos ainda estão rodando
        if ! kill -0 $NGROK_PID 2>/dev/null; then
            echo -e "${RED}❌ ngrok parou inesperadamente${NC}"
            break
        fi
        if ! kill -0 $N8N_PID 2>/dev/null; then
            echo -e "${RED}❌ n8n parou inesperadamente${NC}"
            break
        fi
    done
}

# Executar função principal
main
