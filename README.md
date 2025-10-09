# n8n-nodes-pagbank-connect

Integração do n8n com PagBank Connect para processamento de pagamentos brasileiros.

## Características

- ✅ **PIX** - Pagamentos instantâneos com QR Code
- ✅ **Cartão de Crédito/Débito** - Processamento seguro de cartões
- ✅ **Boleto** - Boletos bancários para pagamento
- ✅ **Links de Pagamento** - Checkout personalizado
- ✅ **Assinaturas Recorrentes** - Pagamentos recorrentes (em breve)
- ✅ **Webhooks** - Notificações em tempo real
- ✅ **Ambiente Sandbox** - Testes seguros
- ✅ **Parceiro Oficial** - [PagBank Integrações](https://pbintegracoes.com/?utm_source=n8n) é parceiro Oficial PagBank desde 2014.
- ✅ **Taxas reduzidas** - Você paga menos taxas no PagBank ao usar nossas integrações

## Instalação

```bash
npm install n8n-nodes-pagbank-connect
```

## Configuração

### 1. Obter Credenciais

Acesse [PagBank Connect](https://pbintegracoes.com/connect/autorizar/?utm_source=n8n) para obter sua Connect Key Gratuitamente

Se precisar de uma Connect Key de Testes, [clique aqui](https://pbintegracoes.com/connect/sandbox/?utm_source=n8n).

### 2. Configurar no n8n

1. Adicione sua Connect key nas credenciais do PagBank Connect
2. Clique em Salvar e veja se a conexão foi realizada com sucesso.

## Nós Disponíveis

### PagBank (Principal)
- **Criar Link de Pagamento** - Gera links de checkout para o cliente pagar no PagBank
- **Criar Pedido PIX** - Cria pagamentos PIX
- **Criar Cobrança Cartão** - Processa um pagamento com o cartão de crédito e dados informados
- **Consultar status do pedido** - Consulta o status de um ORDER junto ao PagBank (deve ter sido gerado com esta connect key)
- **Validar Connect Key** - Valida Connect Key configurada em suas credenciais

### PagBank Webhook
- **Webhook de Pagamento** - Recebe notificações. É possível filtrar por notificações por status de pagamento, meios de pagamento ou motivo de negação.

## Outras informações úteis

## Formato dos Dados

### Valores Monetários
Todos os valores são em **centavos**:
- R$ 10,00 = 1000
- R$ 1,50 = 150

### CPF/CNPJ
- CPF: 11 dígitos (apenas números)
- CNPJ: 14 dígitos (apenas números)

Obrigatório para a maioria das operações, exceto criação de link de pagamento.


## Ambientes

### Sandbox (Teste)
- O ambiente será de testes sempre que sua Connect Key começar com *CONSANDBOX*. Obtenha a sua [aqui](https://pbintegracoes.com/connect/sandbox/?utm_source=n8n).
- Aprovação automática para valores < R$ 100
- Delay de 5 minutos para valores entre R$ 100-200
- Ideal para desenvolvimento e testes
- Veja [Cartões de teste](https://ajuda.pbintegracoes.com/hc/pt-br/articles/22375426666253-Cartões-de-Crédito-para-Testes-PagBank)

### Produção
- Processamento real de pagamentos
- Requer aprovação do PagBank
- Use apenas após testes completos

## Webhooks

### Configuração
1. Configure a URL do webhook no n8n
2. Adicione a URL gerada no campo *URL de Notificação* ao criar pagamentos e links de pagamento nas demais ações
3. Configure filtros por status e método de pagamento
4. Certifique-se que a URL pode ser acessada de fora sem nenhum bloqueio.


### Erros Comuns
- **40002 - Email do comprador igual ao vendedor
- **40002 - CPF/CNPJ inválido
- **40002 - Telefone inválido
- **UNAUTHORIZED - Connect Key inválida

### Validações
- CPF/CNPJ são validados automaticamente
- Telefones são formatados

## Suporte

- **Site Oficial**: [pbintegracoes.com/n8n](https://pbintegracoes.com/n8n/?utm_source=n8n&utm_medium=github-readme)
- **Documentação**: [PagBank Integrações](https://ajuda.pbintegracoes.com/hc/pt-br/categories/40055834503053-n8n)
- **Issues e Suporte**: [Abra um Chamado](https://ajuda.pbintegracoes.com/hc/pt-br/requests/new)

## Licença

MIT License - veja o arquivo LICENSE para detalhes.

## Contribuição

1. Fork o [projeto no github](https://github.com/r-martins/PagBank-n8n)
2. Crie uma branch para sua feature/bugfix
3. Commit suas mudanças
4. Push para a sua branch local
5. Abra um Pull Request para a branch `develop`

## Changelog

### v1.0.0
- Lançamento inicial
- Suporte a PIX, Cartão, Boleto
- Links de pagamento
- Webhooks

## Roadmap
- Mais opções de parcelamento
- Venda recorrente

Sujeito à alteração conforme solicitações da comunidade.
