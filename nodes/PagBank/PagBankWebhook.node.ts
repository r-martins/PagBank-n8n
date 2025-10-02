import {
	IWebhookResponseData,
	IWebhookFunctions,
	INodeType,
	INodeTypeDescription,
	IWebhookRequestData,
} from 'n8n-workflow';

import { formatWebhookData } from './PagBankUtils';

export class PagBankWebhook implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'PagBank Connect Webhook',
		name: 'pagBankWebhook',
		icon: 'file:pagbank.svg',
		group: ['trigger'],
		version: 1,
		subtitle: 'Webhook de Pagamento',
		description: 'Recebe notificações de pagamento do PagBank',
		defaults: {
			name: 'PagBank Webhook',
		},
		inputs: [],
		outputs: ['main'],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'pagbank-webhook',
			},
		],
		properties: [
			{
				displayName: 'Eventos',
				name: 'events',
				type: 'multiOptions',
				options: [
					{
						name: 'Pagamento Aprovado',
						value: 'PAID',
						description: 'Quando um pagamento é aprovado',
					},
					{
						name: 'Pagamento Negado',
						value: 'DECLINED',
						description: 'Quando um pagamento é negado',
					},
					{
						name: 'Aguardando Pagamento',
						value: 'WAITING',
						description: 'Quando um pagamento está aguardando',
					},
					{
						name: 'Pagamento Cancelado',
						value: 'CANCELED',
						description: 'Quando um pagamento é cancelado',
					},
					{
						name: 'Pagamento Estornado',
						value: 'REFUNDED',
						description: 'Quando um pagamento é estornado',
					},
				],
				default: ['PAID', 'DECLINED'],
				description: 'Tipos de eventos para processar',
			},
			{
				displayName: 'Métodos de Pagamento',
				name: 'paymentMethods',
				type: 'multiOptions',
				options: [
					{
						name: 'Cartão de Crédito',
						value: 'CREDIT_CARD',
					},
					{
						name: 'Cartão de Débito',
						value: 'DEBIT_CARD',
					},
					{
						name: 'PIX',
						value: 'PIX',
					},
					{
						name: 'Boleto',
						value: 'BOLETO',
					},
				],
				default: [],
				description: 'Filtrar por métodos de pagamento (deixe vazio para todos)',
			},
			{
				displayName: 'Valor Mínimo',
				name: 'minAmount',
				type: 'number',
				default: 0,
				description: 'Valor mínimo em centavos para processar o webhook',
			},
			{
				displayName: 'Valor Máximo',
				name: 'maxAmount',
				type: 'number',
				default: 0,
				description: 'Valor máximo em centavos para processar o webhook (0 = sem limite)',
			},
		],
	};

	webhookMethods = {
		default: {
			async checkExists(this: IWebhookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');
				const webhookData = this.getWorkflowStaticData('node');
				
				if ((webhookData as any).webhookUrl === webhookUrl) {
					return true;
				}
				
				return false;
			},
			async create(this: IWebhookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');
				const webhookData = this.getWorkflowStaticData('node');
				
				(webhookData as any).webhookUrl = webhookUrl;
				
				return true;
			},
			async delete(this: IWebhookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				delete (webhookData as any).webhookUrl;
				
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const req = this.getRequestObject() as IWebhookRequestData;
		const events = this.getNodeParameter('events') as string[];
		const paymentMethods = this.getNodeParameter('paymentMethods') as string[];
		const minAmount = this.getNodeParameter('minAmount') as number;
		const maxAmount = this.getNodeParameter('maxAmount') as number;

		// Verifica se o webhook contém dados válidos
		if (!req.body || !req.body.id) {
			return {
				httpCode: 400,
				response: { error: 'Dados inválidos do webhook' },
			};
		}

		const webhookData = req.body;
		const charge = webhookData.charges?.[0];

		// Verifica se há um pagamento (charge) no webhook
		if (!charge) {
			return {
				httpCode: 200,
				response: { message: 'Webhook recebido, mas sem dados de pagamento' },
			};
		}

		// Filtra por status do pagamento
		if (events.length > 0 && !events.includes(charge.status)) {
			return {
				httpCode: 200,
				response: { message: 'Status do pagamento não corresponde aos eventos filtrados' },
			};
		}

		// Filtra por método de pagamento
		if (paymentMethods.length > 0 && !paymentMethods.includes(charge.payment_method?.type)) {
			return {
				httpCode: 200,
				response: { message: 'Método de pagamento não corresponde ao filtro' },
			};
		}

		// Filtra por valor
		const amount = charge.amount?.value || 0;
		if (minAmount > 0 && amount < minAmount) {
			return {
				httpCode: 200,
				response: { message: 'Valor abaixo do mínimo configurado' },
			};
		}

		if (maxAmount > 0 && amount > maxAmount) {
			return {
				httpCode: 200,
				response: { message: 'Valor acima do máximo configurado' },
			};
		}

		// Formata os dados do webhook
		const formattedData = formatWebhookData(webhookData);

		// Adiciona informações extras para facilitar o uso
		const processedData = {
			...formattedData,
			webhookReceivedAt: new Date().toISOString(),
			eventType: charge.status,
			paymentMethod: charge.payment_method?.type,
			amountInReais: (amount / 100).toFixed(2),
			// Informações do PIX (se aplicável)
			pixData: charge.payment_method?.type === 'PIX' ? {
				qrCodeId: webhookData.qr_codes?.[0]?.id,
				qrCodeText: webhookData.qr_codes?.[0]?.text,
				endToEndId: charge.payment_method?.pix?.end_to_end_id,
			} : null,
			// Informações do Boleto (se aplicável)
			boletoData: charge.payment_method?.type === 'BOLETO' ? {
				boletoId: charge.payment_method?.boleto?.id,
				barcode: charge.payment_method?.boleto?.barcode,
				formattedBarcode: charge.payment_method?.boleto?.formatted_barcode,
				dueDate: charge.payment_method?.boleto?.due_date,
			} : null,
			// Informações do Cartão (se aplicável)
			cardData: charge.payment_method?.type === 'CREDIT_CARD' || charge.payment_method?.type === 'DEBIT_CARD' ? {
				brand: charge.payment_method?.card?.brand,
				firstDigits: charge.payment_method?.card?.first_digits,
				lastDigits: charge.payment_method?.card?.last_digits,
				installments: charge.payment_method?.installments,
				authorizationCode: charge.payment_response?.raw_data?.authorization_code,
				nsu: charge.payment_response?.reference,
			} : null,
		};

		return {
			workflowData: [
				[
					{
						json: processedData,
					},
				],
			],
			httpCode: 200,
			response: { message: 'Webhook processado com sucesso' },
		};
	}
}
