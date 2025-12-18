# Exemplos de Workflows PagBank Connect

Estes exemplos foram configurados para funcionar quando o pacote é instalado via npm.

## 📦 Instalação via npm (Recomendado)

Quando você instala o pacote via npm:
```bash
npm install n8n-nodes-pagbank-connect
```

O tipo do node nos exemplos é:
- `n8n-nodes-pagbank-connect.pagBank` (node principal)
- `n8n-nodes-pagbank-connect.pagBankTrigger` (trigger node)

## 🔧 Instalação Custom (Local/VPS)

Se você instalou o pacote manualmente (link simbólico ou cópia de arquivos), você precisa alterar o tipo do node nos exemplos:

### Antes (npm):
```json
"type": "n8n-nodes-pagbank-connect.pagBank"
```

### Depois (custom):
```json
"type": "CUSTOM.pagBank"
```

### Para o Trigger:
```json
"type": "CUSTOM.pagBankTrigger"
```

## 🔄 Como Adaptar os Exemplos

1. Importe o workflow no n8n
2. Se o node não for reconhecido, edite o workflow
3. Substitua o tipo do node:
   - Procure por `n8n-nodes-pagbank-connect.pagBank`
   - Substitua por `CUSTOM.pagBank`
   - Ou simplesmente remova o node e adicione novamente da lista de nodes disponíveis

## 📝 Nota

Os exemplos estão configurados para instalação via npm, que é a forma mais comum. Se você usa instalação custom, basta substituir o tipo do node conforme indicado acima.

