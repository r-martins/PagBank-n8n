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

### 1. Get Credentials

Visit [PagBank Connect](https://pbintegracoes.com/connect/autorizar/?utm_source=n8n) to get your Connect Key for free

If you need a Test Connect Key, [click here](https://pbintegracoes.com/connect/sandbox/?utm_source=n8n).

### 2. Configure in n8n

1. Add your Connect key in PagBank Connect credentials
2. Click Save and check if the connection was successful.

## Available Nodes

### PagBank (Main)
- **Create Payment Link** - Generates checkout links for customers to pay on PagBank
- **Create PIX Order** - Creates PIX payments
- **Create Credit Card Charge** - Processes a payment with the provided credit card data
- **Check order status** - Queries the status of an ORDER with PagBank (must have been generated with this connect key)
- **Validate Connect Key** - Validates the Connect Key configured in your credentials

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