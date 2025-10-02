# 🔧 Troubleshooting - PagBank Connect n8n

## Problema: "Bad request - please check your parameters"

### 1. **Teste a Connect Key Diretamente**

```bash
# Teste com script específico para n8n
node test-n8n-credentials.js CONSANDBOX_sua_connect_key_aqui

# Teste com script geral
node debug-connect-key.js CONSANDBOX_sua_connect_key_aqui
```

### 2. **Verifique os Logs do n8n**

1. Acesse http://localhost:5678
2. Vá em **Credentials** → **Add Credential**
3. Procure por **PagBank Connect**
4. Configure sua Connect Key
5. Clique em **Test** (se disponível)
6. Verifique os logs no terminal onde o n8n está rodando

### 3. **Possíveis Causas do Erro "Bad request"**

#### A) Connect Key Inválida
- **Sintoma**: Status 401 (Unauthorized)
- **Solução**: Verificar se a Connect Key está correta e ativa

#### B) Headers Incorretos
- **Sintoma**: Status 400 (Bad Request)
- **Solução**: Verificar se todos os headers estão sendo enviados

#### C) URL Incorreta
- **Sintoma**: Status 404 (Not Found)
- **Solução**: Verificar se a URL da API está correta

#### D) Método HTTP Incorreto
- **Sintoma**: Status 405 (Method Not Allowed)
- **Solução**: Verificar se está usando GET

### 4. **Checklist de Verificação**

- [ ] Connect Key válida e ativa
- [ ] Headers corretos (Authorization, Platform, etc.)
- [ ] URL da API correta
- [ ] Método HTTP correto (GET)
- [ ] n8n reiniciado após mudanças

### 5. **Teste Manual com cURL**

```bash
curl -X GET "https://ws.pbintegracoes.com/pspro/v7/connect/connectInfo" \
  -H "Authorization: Bearer CONSANDBOX_sua_connect_key" \
  -H "Platform: n8n" \
  -H "Platform-Version: 1.113.3" \
  -H "Module-Version: 1.0.0" \
  -v
```

### 6. **Logs de Debug no n8n**

Os logs de debug mostrarão:
- Connect Key (mascarada)
- URL da requisição
- Headers enviados
- Resposta da API
- Erros detalhados

### 7. **Reiniciar n8n**

```bash
# Parar n8n
pkill -f n8n

# Iniciar n8n
n8n start
```

### 8. **Verificar Arquivos**

```bash
# Verificar se os arquivos estão corretos
ls -la ~/.n8n/custom/
ls -la ~/.n8n/custom/credentials/
ls -la ~/.n8n/custom/nodes/PagBank/
```

### 9. **Exemplo de Connect Key Válida**

```
Sandbox: CONSANDBOX_1234567890abcdef1234567890abcdef
Produção: CON_1234567890abcdef1234567890abcdef
```

### 10. **Próximos Passos**

1. Execute o teste com sua Connect Key real
2. Verifique os logs do n8n
3. Teste com cURL se necessário
4. Reporte os resultados para análise

## 🆘 **Se Nada Funcionar**

1. **Verifique se a Connect Key está ativa** no painel do PagBank
2. **Teste com uma Connect Key diferente**
3. **Verifique se não há problemas de rede**
4. **Reinicie o n8n completamente**
