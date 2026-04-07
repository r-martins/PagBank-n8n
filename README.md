# n8n-nodes-pagbank-connect

n8n integration with PagBank Connect for Brazilian payment processing.


![NPM Downloads](https://img.shields.io/npm/d18m/n8n-nodes-pagbank-connect?label=downloads%20last%2018%20months)
![NPM Version](https://img.shields.io/npm/v/n8n-nodes-pagbank-connect)
![NPM License](https://img.shields.io/npm/l/n8n-nodes-pagbank-connect)
![NPM Last Update](https://img.shields.io/npm/last-update/n8n-nodes-pagbank-connect)

## Features

- ✅ **PIX** - Instant payments with QR Code
- ✅ **Credit/Debit Card** - Secure card processing
- ✅ **Payment Links** - Custom checkout
- ✅ **Payment split** - Split PIX and card orders between multiple PagBank accounts (FIXED or PERCENTAGE), plus split details and custody release
- ✅ **Recurring Subscriptions** - Recurring payments (coming soon)
- ✅ **Webhooks** - Real-time notifications
- ✅ **Sandbox Environment** - Safe testing
- ✅ **Official Partner** - [PagBank Integrations](https://pbintegracoes.com/?utm_source=n8n) is an Official PagBank Partner since 2014.
- ✅ **Reduced fees** - You pay less fees on PagBank when using our integrations

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

Visit [PagBank Connect](https://pbintegracoes.com/connect/autorizar/?utm_source=n8n) to get your Connect Key for free

If you need a Test Connect Key, [click here](https://pbintegracoes.com/connect/sandbox/?utm_source=n8n).

### 2. Configure in n8n

1. Add your Connect key in PagBank Connect credentials
2. Click Save and check if the connection was successful.

## Available Nodes

### PagBank (Main)
- **Create Payment Link** - Generates checkout links for customers to pay on PagBank
- **Create PIX Order** - Creates PIX payments (optional **payment split** on the QR code)
- **Create Credit Card Charge** - Processes a payment with the provided credit card data (optional **payment split** on the charge)
- **Check order status** - Queries the status of an ORDER with PagBank (must have been generated with this connect key)
- **Get Split Details** - Reads a split by `SPLI_…` id or SPLIT `href` from the order. Sandbox: public API on `internal.sandbox.api.pagseguro.com` when using a sandbox Connect key or pasting that URL; production: authenticated Connect API.
- **Release Split Custody** - Releases held funds for one or more receiver **account ids** before the scheduled custody date (Connect API).
- **Validate Connect Key** - Validates the Connect Key configured in your credentials

### Payment split (marketplace / multi-seller)
Use **Split Method** and **Split Receivers** on **Create PIX Order** or **Create Credit Card Charge** to divide the payment between accounts (PagBank `ACCO_…` ids). **FIXED** requires amounts in **cents** that sum to the order total; **PERCENTAGE** requires integer percents summing to **100**. You can set custody, chargeback allocation, and (for cards) **liable**. After payment, the order `links` may include `rel: SPLIT` — use **Get Split Details** to inspect the split and **Release Split Custody** when eligible. See [PagBank split documentation](https://developer.pagbank.com.br/reference/divisao-de-pagamento) and [PagBank Connect n8n docs]().

### PagBank Connect Trigger
- **Payment Trigger** - Receives notifications. You can filter notifications by payment status, payment methods or denial reason.

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
- The environment will be for testing whenever your Connect Key starts with *CONSANDBOX*. Get yours [here](https://pbintegracoes.com/connect/sandbox/?utm_source=n8n).
- Automatic approval for values < R$ 100
- 5 minute delay for values between R$ 100-200
- Ideal for development and testing
- See [Test Cards](https://ajuda.pbintegracoes.com/hc/pt-br/articles/22375426666253-Cartões-de-Crédito-para-Testes-PagBank)

### Production
- Real payment processing
- Requires PagBank approval
- Use only after complete testing

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