# Changelog - PagBank Connect n8n Integration

## v1.0.0 - 2025-01-02

### ✅ Mudanças Implementadas

#### 1. **Renomeação da Integração**
- **Antes**: "PagBank Connect"
- **Depois**: "PagBank Connect"
- **Motivo**: Alinhamento com a marca PagBank Connect

#### 2. **Simplificação das Credenciais**
- **Removido**: Campo "Ambiente" (detecção automática)
- **Removido**: Campo "Platform" (configurado automaticamente)
- **Removido**: Campo "Platform Version" (configurado automaticamente)
- **Removido**: Campo "Module Version" (configurado automaticamente)
- **Mantido**: Apenas "Connect Key"

#### 3. **Detecção Automática de Ambiente**
- **Sandbox**: Connect Key começa com `CONSANDBOX`
- **Produção**: Connect Key começa com `CON`
- **URL**: Adiciona `?isSandbox=1` automaticamente quando necessário

#### 4. **Headers Automáticos**
- **Platform**: `n8n`
- **Platform-Version**: `1.113.3`
- **Module-Version**: `1.0.0`
- **Authorization**: `Bearer {connectKey}`

#### 5. **URL de Documentação Atualizada**
- **Antes**: `https://developer.pagbank.com.br`
- **Depois**: `https://pbintegracoes.com/connect/autorizar/?utm_source=n8n`

#### 6. **Estrutura de Arquivos Atualizada**
```
credentials/
├── PagBankConnect.credentials.ts (renomeado)
nodes/
├── PagBank/
│   ├── PagBankSimple.node.ts
│   ├── PagBankWebhook.node.ts
│   └── pagbank.svg
```

### 🔧 Configuração Automática

#### Headers Enviados Automaticamente
```javascript
{
  'Authorization': 'Bearer {connectKey}',
  'Platform': 'n8n',
  'Platform-Version': '1.113.3',
  'Module-Version': '1.0.0'
}
```

#### Detecção de Ambiente
```javascript
const isSandbox = connectKey.startsWith('CONSANDBOX');
const url = isSandbox ? `${baseURL}${endpoint}?isSandbox=1` : `${baseURL}${endpoint}`;
```

### 📋 Como Usar

#### 1. **Configurar Credenciais**
1. Acesse n8n → Credentials → Add Credential
2. Procure por "PagBank Connect"
3. Cole sua Connect Key
4. Salve

#### 2. **Criar Workflow**
1. Adicione o nó "PagBank"
2. Escolha a operação desejada
3. Configure os parâmetros
4. Execute

#### 3. **Ambiente Automático**
- **Sandbox**: Use Connect Key que começa com `CONSANDBOX`
- **Produção**: Use Connect Key que começa com `CON`

### 🎯 Benefícios

1. **Interface Simplificada**: Apenas Connect Key necessária
2. **Configuração Automática**: Headers e ambiente detectados automaticamente
3. **Menos Erros**: Usuário não precisa configurar ambiente manualmente
4. **Melhor UX**: Processo de configuração mais rápido
5. **Alinhamento com Marca**: Nome correto "PagBank Connect"

### 🔄 Migração

#### Para Usuários Existentes
1. Remova as credenciais antigas "PagBank Connect"
2. Adicione novas credenciais "PagBank Connect"
3. Configure apenas a Connect Key
4. Teste os workflows existentes

### 📚 Documentação Atualizada

- **README.md**: Atualizado com novo nome e configuração
- **SETUP-N8N.md**: Guia de instalação atualizado
- **Exemplos**: Workflows de exemplo mantidos
- **Suporte**: ricardo@pbintegracoes.com

---

**🎉 A integração agora está mais simples e alinhada com a marca PagBank Connect!**
