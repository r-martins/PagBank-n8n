# n8n-nodes-pagbank-connect

**PB Integrações (former PagBank Connect)** — n8n community node for **PagBank** and **Vindi** via [PB Integrações](https://pbintegracoes.com/?utm_source=n8n).

Package slug `n8n-nodes-pagbank-connect` is unchanged (npm / community install compatibility).


![NPM Downloads](https://img.shields.io/npm/d18m/n8n-nodes-pagbank-connect?label=downloads%20last%2018%20months)
![NPM Version](https://img.shields.io/npm/v/n8n-nodes-pagbank-connect)
![NPM License](https://img.shields.io/npm/l/n8n-nodes-pagbank-connect)
![NPM Last Update](https://img.shields.io/npm/last-update/n8n-nodes-pagbank-connect)

## Features

- ✅ **Dual partner** - Same node for PagBank (`CON…`) and Vindi (`CONVD…`) Connect Keys
- ✅ **PIX** - Instant payments with QR Code
- ✅ **Credit Card** - PagBank RSA encrypt or Vindi `gateway_token` (server-side tokenize)
- ✅ **Refund / Cancel** - Full or partial (`POST …/charges/{id}/cancel`) for PagBank and Vindi
- ✅ **Payment Links** - PagBank hosted checkout (not available for Vindi keys yet)
- ✅ **Payment split** - PagBank only (FIXED or PERCENTAGE), plus split details and custody release
- ✅ **Webhooks** - Real-time notifications (canonical PB payload for both partners)
- ✅ **Sandbox** - `CONSANDBOX…` (PagBank) or `CONVDSANDBOX…` (Vindi)
- ✅ **Official Partner** - [PagBank Integrations](https://pbintegracoes.com/?utm_source=n8n) since 2014

## Installation

```bash
npm install n8n-nodes-pagbank-connect
```

## Configuration

### HTTP headers (Platform-Version)

API calls send `Platform-Version` (host n8n) and `Module-Version` (this package). The server n8n version is detected when possible via `n8n/package.json` in the running process. You can force a value:

- **`PAGBANK_PLATFORM_VERSION`** — always wins (e.g. Docker / systemd `Environment=PAGBANK_PLATFORM_VERSION=1.114.0`)
- **`N8N_VERSION`** or **`N8N_RELEASE_VERSION`** — used if set
- Otherwise falls back to **`unknown`** (e.g. running tests outside n8n)

### 1. Get Credentials

Visit [PB Integrações](https://pbintegracoes.com/autorizar/?utm_source=n8n) for a production Connect Key.

Sandbox / test credentials: [pbintegracoes.com/sandbox](https://pbintegracoes.com/sandbox/?utm_source=n8n) — PagBank keys start with `CONSANDBOX`; Vindi keys with `CONVDSANDBOX`.

| Key prefix | Partner | API |
|------------|---------|-----|
| `CON…` / `CONSANDBOX…` | PagBank | `ws.pbintegracoes.com/pspro/v7` |
| `CONVD…` / `CONVDSANDBOX…` | Vindi | `api.pbintegracoes.com/v1` |

Never call PagBank or Vindi hosts directly with the Connect Key. Never send `?isSandbox=1` — the API detects sandbox from the key prefix.

### 2. Configure in n8n

1. Add your Connect Key in **PB Integrações (Former PagBank Connect) API** credentials
2. Save — the PagBank node credential test routes `connectInfo` by partner. You can also run **Connect Key → Get Info**.

## Available Nodes

### PB Integrações (Main) — node type `pagBank`
- **Create Payment Link** - PagBank checkout links only (blocked for `CONVD…`)
- **Create PIX Order** - PIX (optional **payment split** on PagBank keys only)
- **Create Credit Card Charge** - Card PAN in the node → PagBank RSA `encrypted` or Vindi `gateway_token`
- **Get Order Status** - Same Connect Key that created the order (`ORDE_*` or `pb_ord_*`)
- **Refund / Cancel Charge** - Full or partial refund in cents (`CHAR_…` / `ORDE_…` / `pb_ord_…`)
- **Get Split Details** / **Release Split Custody** - PagBank only
- **Validate Connect Key** - Partner-aware `connectInfo`

### Payment split (marketplace / multi-seller)
PagBank keys only. Use **Split Method** and **Split Receivers** on PIX or card. **FIXED** amounts in **cents** sum to order total; **PERCENTAGE** sums to **100**. See [PagBank split documentation](https://developer.pagbank.com.br/reference/divisao-de-pagamento).

### PagBank Connect Trigger
- Receives canonical PB notifications (PagBank or Vindi relay). Filters by status / method / decline reason.
- Output includes `partner`, `partnerBillId`, `webhookEvent` when present.
- Put the Trigger webhook URL in **Notification URL** on create PIX/CC/payment link. URLs longer than 100 characters (typical n8n/ngrok) set `enable_proxy: true` automatically; Vindi always uses the proxy.
- **Vindi sandbox:** partner webhook registration may require pasting the URL manually in the Vindi sandbox panel; production webhooks are registered by PB Integrações.

## Data Format

### Monetary Values
All values are in **cents**:
- R$ 10.00 = 1000
- R$ 1.50 = 150

### CPF/CNPJ
- CPF: 11 digits (numbers only)
- CNPJ: 14 digits (numbers only)

Required for most operations, except payment link creation.

## Environments

### Sandbox (Test)
- PagBank: Connect Key starts with `CONSANDBOX` — [get one](https://pbintegracoes.com/sandbox/?utm_source=n8n)
- Vindi: Connect Key starts with `CONVDSANDBOX`
- PagBank sandbox: automatic approval for values under R$ 100; delay for R$ 100–200
- [PagBank test cards](https://ajuda.pbintegracoes.com/hc/pt-br/articles/22375426666253-Cartões-de-Crédito-para-Testes-PagBank)

### Production
- Real payment processing with a live Connect Key (`CON…` or `CONVD…`)

## Webhooks

### Configuration
1. Configure the webhook URL in n8n
2. Add the generated URL in the *Notification URL* field when creating payments and payment links in other actions
3. Configure filters by status and payment method
4. Make sure the URL can be accessed from outside without any blocking.

### Common Errors
- **40002 - Buyer email same as seller
- **40002 - Invalid CPF/CNPJ
- **40002 - Invalid phone
- **UNAUTHORIZED - Invalid Connect Key

### Validations
- CPF/CNPJ are automatically validated
- Phones are formatted

## Support

- **Official Site**: [pbintegracoes.com/n8n](https://pbintegracoes.com/n8n/?utm_source=n8n&utm_medium=github-readme)
- **Documentation**: [PagBank Integrations](https://ajuda.pbintegracoes.com/hc/pt-br/categories/40055834503053-n8n)
- **Issues and Support**: [Open a Ticket](https://ajuda.pbintegracoes.com/hc/pt-br/requests/new)

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the [project on github](https://github.com/r-martins/PagBank-n8n)
2. Create a branch for your feature/bugfix
3. Commit your changes
4. Push to your local branch
5. Open a Pull Request to the `develop` branch


## Roadmap
- More installment options
- Recurring sales

Subject to change based on community requests.