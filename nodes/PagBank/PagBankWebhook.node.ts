'use strict';

import {
	IWebhookFunctions,
	IWebhookResponseData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

export class PagBankWebhook implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'PagBank Connect Webhook',
		name: 'pagBankWebhook',
		icon: 'file:pagbank.svg',
		group: ['trigger'],
		version: 1,
		description: 'Webhook para receber notificações do PagBank Connect',
		defaults: {
			name: 'PagBank Connect Webhook',
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
		properties: [],
	};

	webhookMethods = {
		default: {
			async checkExists() {
				return false;
			},
			async create() {
				return true;
			},
			async delete() {
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		console.log('=== PAGBANK WEBHOOK EXECUTADO ===');
		console.log('Timestamp:', new Date().toISOString());

		// Obtém os dados do webhook
		const bodyData = this.getBodyData();
		const headerData = this.getHeaderData();

		console.log('Dados recebidos:', JSON.stringify(bodyData, null, 2));

		// Processa os dados do PagBank
		const orderId = bodyData.id || 'N/A';
		const referenceId = bodyData.reference_id || 'N/A';
		const customer = bodyData.customer || {};
		const charges = bodyData.charges || [];
		
		// Pega o primeiro charge (pagamento)
		const firstCharge = charges[0] || {};
		const status = firstCharge.status || 'UNKNOWN';
		const amount = firstCharge.amount || {};
		const paymentMethod = firstCharge.payment_method || {};
		const paidAt = firstCharge.paid_at || null;

		// Monta apenas os dados realmente importantes
		const processedData = {
			// Dados essenciais do pedido
			orderId: orderId,
			referenceId: referenceId,
			status: status,
			
			// Valor e moeda
			amount: amount.value || 0,
			currency: amount.currency || 'BRL',
			
			// Cliente
			customerName: (customer as any)?.name || 'N/A',
			customerEmail: (customer as any)?.email || 'N/A',
			
			// Método de pagamento
			paymentMethod: paymentMethod.type || 'UNKNOWN',
			paidAt: paidAt,
			
			// Timestamp
			receivedAt: new Date().toISOString(),
			
			// Dados originais da notificação
			rawData: bodyData
		};

		console.log('Dados processados:', JSON.stringify(processedData, null, 2));

		return {
			workflowData: [
				[
					{
						json: processedData,
					},
				],
			],
		};
	}
}