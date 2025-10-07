# 🔍 Guia de Debug - PagBank Connect

## Problema: "Bad request - please check your parameters"

Este erro geralmente indica um problema na requisição HTTP. Vamos debugar passo a passo:

## 1. Teste Direto da Connect Key

Execute o script de debug:

```bash
# Substitua pela sua Connect Key real
node debug-connect-key.js CONSANDBOX_sua_connect_key_aqui
```

## 2. Verificar Logs do n8n

1. Acesse o n8n: http://localhost:5678
2. Crie um workflow com o node "PagBank Connect"
3. Configure a operação "Validar Connect Key"
4. Execute o workflow
5. Verifique os logs no terminal onde o n8n está rodando

## 3. Possíveis Causas do Erro

### A) Connect Key Inválida
- **Sintoma**: Status 401 (Unauthorized)
- **Solução**: Verificar se a Connect Key está correta

### B) Ambiente Incorreto
- **Sintoma**: Status 400 (Bad Request)
- **Solução**: A API detecta automaticamente o ambiente baseado na Connect Key

### C) Headers Incorretos
- **Sintoma**: Status 400 (Bad Request)
- **Solução**: Verificar se os headers estão sendo enviados corretamente

### D) URL Incorreta
- **Sintoma**: Status 404 (Not Found)
- **Solução**: Verificar se a URL da API está correta

## 4. Checklist de Verificação

- [ ] Connect Key válida e ativa
- [ ] Ambiente correto (Sandbox vs Produção)
- [ ] Headers corretos (Authorization, Platform, etc.)
- [ ] URL da API correta
- [ ] Método HTTP correto (GET)

## 5. Logs de Debug

Os logs de debug mostrarão:
- Connect Key (mascarada)
- URL da requisição
- Headers enviados
- Resposta da API
- Erros detalhados

## 6. Exemplo de Connect Key Válida

```
Sandbox: CONSANDBOX_1234567890abcdef1234567890abcdef
Produção: CON_1234567890abcdef1234567890abcdef
```

## 7. Teste Manual com cURL

```bash
curl -X GET "https://ws.pbintegracoes.com/pspro/v7/connect/connectInfo" \
  -H "Authorization: Bearer CONSANDBOX_sua_connect_key" \
  -H "Platform: n8n" \
  -H "Platform-Version: 1.113.3" \
  -H "Module-Version: 1.0.0" \
  -H "Content-Type: application/json"
```

## 8. Próximos Passos

1. Execute o script de debug
2. Verifique os logs do n8n
3. Teste com cURL se necessário
4. Reporte os resultados para análise
