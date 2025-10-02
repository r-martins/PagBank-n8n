# Instalação do PagBank n8n

## Pré-requisitos

- Node.js 18+ instalado
- n8n instalado e funcionando
- Conta no PagBank com Connect Key

## Passo a Passo

### 1. Instalar Dependências

```bash
npm install
```

### 2. Compilar o Projeto

```bash
# Opção 1: Usar o script de build
node build.js

# Opção 2: Compilar manualmente
npx tsc
```

### 3. Instalar no n8n

#### Método 1: Instalação Global
```bash
# Copiar para o diretório de custom nodes do n8n
cp -r dist/ /path/to/n8n/custom/
```

#### Método 2: Instalação via npm (recomendado)
```bash
# No diretório do n8n
npm install /path/to/pagbank-n8n
```

### 4. Configurar Credenciais

1. Acesse o n8n
2. Vá em **Credentials** → **Add Credential**
3. Procure por **PagBank Connect**
4. Configure:
   - **Connect Key**: Sua chave do PagBank
   - **Ambiente**: Sandbox (teste) ou Produção
   - **Platform**: n8n
   - **Platform Version**: (opcional)
   - **Module Version**: 1.0.0

### 5. Testar a Integração

1. Crie um novo workflow
2. Adicione o nó **PagBank**
3. Configure uma operação simples
4. Execute o teste

## Solução de Problemas

### Erro de Compilação TypeScript
```bash
# Instalar dependências de desenvolvimento
npm install --save-dev @types/node typescript

# Compilar novamente
npx tsc
```

### Erro de Credenciais
- Verifique se a Connect Key está correta
- Confirme se está usando o ambiente correto (Sandbox/Produção)
- Teste a conectividade com a API do PagBank

### Erro de Permissões
```bash
# Dar permissões corretas aos arquivos
chmod -R 755 dist/
```

## Estrutura de Arquivos

```
dist/
├── credentials/
│   └── PagBankConnect.credentials.js
├── nodes/
│   └── PagBank/
│       ├── PagBankSimple.node.js
│       ├── PagBankWebhook.node.js
│       └── pagbank.svg
└── index.js
```

## Próximos Passos

1. **Teste em Sandbox**: Use o ambiente de teste primeiro
2. **Configure Webhooks**: Configure URLs de notificação
3. **Crie Workflows**: Use os exemplos fornecidos
4. **Produção**: Migre para produção após testes

## Suporte

- **Documentação**: [PagBank Developer](https://developer.pagbank.com.br)
- **Issues**: [GitHub Issues](https://github.com/r-martins/PagBank-n8n/issues)
- **Email**: ricardo@pbintegracoes.com
