# n8n-nodes-pagbank-connect

Integração do n8n com PagBank Connect para processamento de pagamentos brasileiros.

## Características

- ✅ **PIX** - Pagamentos instantâneos com QR Code
- ✅ **Cartão de Crédito/Débito** - Processamento seguro de cartões
- ✅ **Boleto** - Boletos bancários para pagamento
- ✅ **Links de Pagamento** - Checkout personalizado
- ✅ **Assinaturas Recorrentes** - Pagamentos recorrentes
- ✅ **Webhooks** - Notificações em tempo real
- ✅ **Ambiente Sandbox** - Testes seguros

## Instalação

```bash
npm install n8n-nodes-pagbank-connect
```

## Configuração

### 1. Obter Credenciais

1. Acesse [PagBank Connect](https://pbintegracoes.com/connect/autorizar/?utm_source=n8n)
2. Crie uma conta ou faça login
3. Obtenha sua Connect Key
4. O ambiente é detectado automaticamente (CONSANDBOX = Sandbox, CON = Produção)

### 2. Configurar no n8n

1. Adicione as credenciais do PagBank Connect
2. Configure sua Connect Key
3. Os headers são configurados automaticamente

## Nós Disponíveis

### PagBank (Principal)
- **Criar Link de Pagamento** - Gera links de checkout
- **Criar Pedido PIX** - Cria pagamentos PIX
- **Criar Pedido Boleto** - Gera boletos bancários
- **Criar Pedido Cartão** - Processa cartões
- **Criar Assinatura Recorrente** - Pagamentos recorrentes
- **Consultar Status** - Verifica status de pagamentos

### PagBank Webhook
- **Webhook de Pagamento** - Recebe notificações

## Exemplos de Uso

### 1. Criar Link de Pagamento

```json
{
  "referenceId": "PEDIDO-123",
  "customer": {
    "name": "João Silva",
    "email": "joao@email.com",
    "taxId": "12345678901"
  },
  "items": [
    {
      "name": "Produto Teste",
      "quantity": 1,
      "unitAmount": 10000
    }
  ],
  "paymentMethods": ["CREDIT_CARD", "PIX"],
  "expirationDate": "2025-12-31T23:59:59Z"
}
```

### 2. Criar Pagamento PIX

```json
{
  "referenceId": "PIX-123",
  "customer": {
    "name": "Maria Santos",
    "email": "maria@email.com",
    "taxId": "98765432100"
  },
  "items": [
    {
      "name": "Serviço Digital",
      "quantity": 1,
      "unitAmount": 5000
    }
  ],
  "pixExpirationDate": "2025-12-31T23:59:59Z"
}
```

### 3. Webhook de Pagamento

O webhook recebe notificações automáticas quando:
- Pagamento é aprovado
- Pagamento é negado
- Status muda para aguardando
- Pagamento é cancelado

## Formato dos Dados

### Valores Monetários
Todos os valores são em **centavos**:
- R$ 10,00 = 1000
- R$ 1,50 = 150

### CPF/CNPJ
- CPF: 11 dígitos (apenas números)
- CNPJ: 14 dígitos (apenas números)

### Telefone
```json
{
  "country": "55",
  "area": "11",
  "number": "999999999",
  "type": "MOBILE"
}
```

## Ambientes

### Sandbox (Teste)
- Aprovação automática para valores < R$ 100
- Delay de 5 minutos para valores entre R$ 100-200
- Ideal para desenvolvimento e testes

### Produção
- Processamento real de pagamentos
- Requer aprovação do PagBank
- Use apenas após testes completos

## Webhooks

### Configuração
1. Configure a URL do webhook no n8n
2. Adicione a URL nas notificações do PagBank
3. Configure filtros por status e método de pagamento

### Eventos Suportados
- `PAID` - Pagamento aprovado
- `DECLINED` - Pagamento negado
- `WAITING` - Aguardando pagamento
- `CANCELED` - Pagamento cancelado
- `REFUNDED` - Pagamento estornado

## Tratamento de Erros

### Erros Comuns
- **40002 - Email do comprador igual ao vendedor
- **40002 - CPF/CNPJ inválido
- **40002 - Telefone inválido
- **UNAUTHORIZED - Connect Key inválida

### Validações
- CPF/CNPJ são validados automaticamente
- Telefones são formatados
- Valores são convertidos para centavos

## Suporte

- **Documentação**: [PagBank Developer](https://developer.pagbank.com.br)
- **Issues**: [GitHub Issues](https://github.com/martins/pagbank-n8n/issues)
- **Email**: ricardo@ricardomartins.net.br

## Licença

MIT License - veja o arquivo LICENSE para detalhes.

## Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## Changelog

### v1.0.0
- Lançamento inicial
- Suporte a PIX, Cartão, Boleto
- Links de pagamento
- Webhooks
- Assinaturas recorrentes
