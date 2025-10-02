# Guia Completo: Instalar n8n Localmente e Testar PagBank Connect

## 🚀 Passo 1: Instalar n8n

### Opção 1: Instalação Global (Recomendado)
```bash
# Instalar n8n globalmente
npm install n8n -g

# Verificar instalação
n8n --version
```

### Opção 2: Instalação via Docker
```bash
# Instalar Docker (se não tiver)
# macOS: brew install docker
# Ubuntu: sudo apt install docker.io

# Executar n8n com Docker
docker run -it --rm --name n8n -p 5678:5678 -v ~/.n8n:/home/node/.n8n n8nio/n8n
```

### Opção 3: Instalação Local (Desenvolvimento)
```bash
# Clonar repositório n8n
git clone https://github.com/n8n-io/n8n.git
cd n8n

# Instalar dependências
npm install

# Executar em modo desenvolvimento
npm run dev
```

## 🔧 Passo 2: Configurar n8n

### 1. Iniciar n8n
```bash
# Se instalado globalmente
n8n start

# Se instalado localmente
npm run start
```

### 2. Acessar Interface
- Abra o navegador em: `http://localhost:5678`
- Crie sua conta de administrador
- Configure o workspace

## 📦 Passo 3: Instalar PagBank Connect Integration

### 1. Preparar o Projeto PagBank
```bash
# Navegar para o diretório do projeto
cd /Users/martins/www/pagbank-n8n

# Instalar dependências
npm install

# Compilar o projeto
node build.js
```

### 2. Instalar no n8n

#### Método A: Instalação Manual
```bash
# Criar diretório de custom nodes (se não existir)
mkdir -p ~/.n8n/custom

# Copiar arquivos compilados
cp -r dist/* ~/.n8n/custom/

# Reiniciar n8n
n8n restart
```

#### Método B: Instalação via npm link
```bash
# No diretório do projeto PagBank
npm link

# No diretório do n8n (se instalado localmente)
npm link n8n-nodes-pagbank
```

#### Método C: Instalação via npm install
```bash
# No diretório do n8n
npm install /Users/martins/www/pagbank-n8n
```

## 🔑 Passo 4: Configurar Credenciais PagBank

### 1. Obter Connect Key
1. Acesse [PagBank Connect](https://pbintegracoes.com/connect/autorizar/?utm_source=n8n)
2. Crie uma conta ou faça login
3. Gere uma Connect Key
4. **IMPORTANTE**: Use a chave de SANDBOX (CONSANDBOX...) para testes

### 2. Configurar no n8n
1. Acesse n8n: `http://localhost:5678`
2. Vá em **Credentials** → **Add Credential**
3. Procure por **PagBank Connect**
4. Configure:
   - **Connect Key**: `CONSANDBOX...` (sua chave de sandbox)
   - Os headers são configurados automaticamente

## 🧪 Passo 5: Testar a Integração

### 1. Criar Workflow de Teste

#### Teste 1: Link de Pagamento
1. Crie um novo workflow
2. Adicione o nó **PagBank**
3. Configure:
   - **Operação**: `Criar Link de Pagamento`
   - **ID de Referência**: `TESTE-001`
   - **Nome do Cliente**: `João Silva`
   - **Email do Cliente**: `joao@teste.com`
   - **CPF/CNPJ**: `12345678901`
   - **Nome do Produto**: `Produto Teste`
   - **Quantidade**: `1`
   - **Valor**: `1000` (R$ 10,00)
   - **Métodos de Pagamento**: `CREDIT_CARD`, `PIX`
   - **URL de Redirecionamento**: `https://meusite.com/obrigado`

4. Execute o workflow
5. Verifique se retorna um link de pagamento

#### Teste 2: PIX
1. Crie um novo workflow
2. Adicione o nó **PagBank**
3. Configure:
   - **Operação**: `Criar Pedido PIX`
   - **ID de Referência**: `PIX-001`
   - **Nome do Cliente**: `Maria Santos`
   - **Email do Cliente**: `maria@teste.com`
   - **CPF/CNPJ**: `98765432100`
   - **Nome do Produto**: `Serviço PIX`
   - **Quantidade**: `1`
   - **Valor**: `5000` (R$ 50,00)

4. Execute o workflow
5. Verifique se retorna um QR Code PIX

#### Teste 3: Consultar Status
1. Use um ID de pedido real
2. Configure:
   - **Operação**: `Consultar Status do Pedido`
   - **ID do Pedido**: `ORDE_...` (ID real de um pedido)

3. Execute o workflow
4. Verifique se retorna o status do pedido

### 2. Testar Webhook (Opcional)

#### Configurar Webhook
1. Crie um novo workflow
2. Adicione o nó **PagBank Webhook**
3. Configure:
   - **Eventos**: `PAID`, `DECLINED`
   - **Métodos de Pagamento**: (deixe vazio para todos)
   - **Valor Mínimo**: `0`
   - **Valor Máximo**: `0`

4. Ative o workflow
5. Copie a URL do webhook
6. Use essa URL nas notificações dos pedidos

## 🐛 Solução de Problemas

### Erro: "Node not found"
```bash
# Verificar se os arquivos foram copiados
ls -la ~/.n8n/custom/

# Reiniciar n8n
n8n restart
```

### Erro: "Credentials not found"
1. Verifique se as credenciais foram salvas
2. Teste a Connect Key no site do PagBank
3. Confirme se está usando ambiente sandbox

### Erro: "API request failed"
1. Verifique a Connect Key
2. Confirme se está usando ambiente correto
3. Teste a conectividade com a API

### Erro: "Build failed"
```bash
# Limpar e reinstalar
rm -rf node_modules dist
npm install
node build.js
```

## 📊 Monitoramento

### Logs do n8n
```bash
# Ver logs em tempo real
tail -f ~/.n8n/logs/n8n.log

# Ou se usando Docker
docker logs n8n
```

### Testar API PagBank
```bash
# Testar conectividade
curl -X GET "https://ws.pbintegracoes.com/pspro/v7/connect/ws/checkouts?isSandbox=1" \
  -H "Authentication: Bearer CONSANDBOX..." \
  -H "Platform: n8n"
```

## 🎯 Próximos Passos

1. **Teste todos os cenários** em sandbox
2. **Configure webhooks** para notificações
3. **Crie workflows complexos** usando os exemplos
4. **Migre para produção** quando estiver pronto

## 📚 Recursos Adicionais

- **Documentação n8n**: https://docs.n8n.io/
- **Documentação PagBank**: https://developer.pagbank.com.br
- **Exemplos de Workflows**: `/examples/` folder
- **Suporte**: ricardo@pbintegracoes.com

## ✅ Checklist de Verificação

- [ ] n8n instalado e funcionando
- [ ] PagBank integration instalada
- [ ] Credenciais configuradas
- [ ] Teste de link de pagamento funcionando
- [ ] Teste de PIX funcionando
- [ ] Teste de consulta de status funcionando
- [ ] Webhook configurado (opcional)
- [ ] Logs sendo monitorados

---

**🎉 Parabéns! Sua integração PagBank com n8n está funcionando!**
