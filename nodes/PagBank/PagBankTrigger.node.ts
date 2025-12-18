'use strict';

import {
	IWebhookFunctions,
	IWebhookResponseData,
	INodeType,
	INodeTypeDescription,
	NodeConnectionTypes,
} from 'n8n-workflow';

export class PagBankTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'PagBank Connect Trigger',
		name: 'pagBankTrigger',
		icon: { light: 'file:pagbank.svg', dark: 'file:pagbank.dark.svg' },
		group: ['trigger'],
		version: 1,
		description: 'Trigger to receive PagBank Connect notifications',
		documentationUrl: 'https://ajuda.pbintegracoes.com/hc/pt-br/articles/40055875188621-Como-testar-as-Triggers-Webhooks-do-PagBank-no-n8n',
		defaults: {
			name: 'PagBank Connect Trigger',
		},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
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
				displayName: 'Filter by Payment Status',
				name: 'filterByStatus',
				type: 'multiOptions',
				options: [
					{
						name: 'Payment Approved (PAID)',
						value: 'PAID',
					},
					{
						name: 'Waiting for Payment (WAITING)',
						value: 'WAITING',
					},
					{
						name: 'Payment Declined (DECLINED)',
						value: 'DECLINED',
					},
				],
				default: [],
				description: 'Select payment statuses you want to receive. Leave empty to receive all.',
			},
			{
				displayName: 'Filter by Payment Method',
				name: 'filterByPaymentMethod',
				type: 'multiOptions',
				options: [
					{
						name: 'PIX',
						value: 'PIX',
					},
					{
						name: 'Credit Card',
						value: 'CREDIT_CARD',
					},
					{
						name: 'Bank Slip',
						value: 'BOLETO',
					},
				],
				default: [],
				description: 'Select payment methods you want to receive. Leave empty to receive all.',
			},
			{
				displayName: 'Filter by Decline Reason',
				name: 'filterByDeclineReason',
				type: 'multiOptions',
				options: [
					{
						name: 'Declined by Bank',
						value: 'DECLINED_BY_BANK',
					},
					{
						name: 'Declined by PagBank',
						value: 'DECLINED_BY_PAGBANK',
					},
				],
				default: [],
				description: 'Select decline reasons you want to receive. Leave empty to receive all.',
			},
			{
				displayName: 'Add Calculated Fields',
				name: 'addCalculatedFields',
				type: 'boolean',
				default: true,
				description: 'Adds calculated fields like event, formatted payment method, etc.',
			},
		],
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

		// Get webhook data
		const bodyData = this.getBodyData();
		const headerData = this.getHeaderData();


		// Get node settings
		const filterByStatus = this.getNodeParameter('filterByStatus', 0) as string[];
		const filterByPaymentMethod = this.getNodeParameter('filterByPaymentMethod', 0) as string[];
		const filterByDeclineReason = this.getNodeParameter('filterByDeclineReason', 0) as string[];
		const addCalculatedFields = this.getNodeParameter('addCalculatedFields', 0) as boolean;

		// Process PagBank data
		const orderId = bodyData.id || 'N/A';
		const referenceId = bodyData.reference_id || 'N/A';
		const customer = bodyData.customer || {};
		const charges = Array.isArray(bodyData.charges) ? bodyData.charges : [];
		
		// Get first charge (payment)
		const firstCharge = charges[0] || {};
		const status = firstCharge.status || 'UNKNOWN';
		const amount = firstCharge.amount || {};
		const paymentMethod = firstCharge.payment_method || {};
		const paidAt = firstCharge.paid_at || null;
		const paymentResponse = firstCharge.payment_response || {};

		// Apply filters
		let shouldProcess = true;

		// Filter by status
		if (filterByStatus.length > 0 && !filterByStatus.includes(status)) {
			shouldProcess = false;
		}

		// Filter by payment method
		if (shouldProcess && filterByPaymentMethod.length > 0) {
			const paymentMethodType = paymentMethod.type || 'UNKNOWN';
			if (!filterByPaymentMethod.includes(paymentMethodType)) {
				shouldProcess = false;
			}
		}

		// Filter by decline reason
		if (shouldProcess && filterByDeclineReason.length > 0 && status === 'DECLINED') {
			const triggerInstance = new PagBankTrigger();
			const declineReason = triggerInstance.getDeclineReason.call(triggerInstance, paymentResponse);
			if (!filterByDeclineReason.includes(declineReason)) {
				shouldProcess = false;
			}
		}

		// If should not process, return without data
		if (!shouldProcess) {
			return {
				webhookResponse: {
					status: 200,
					body: { received: true, filtered: true },
				},
				workflowData: [[]],
			};
		}

		// Build processed data
		const processedData: any = {
			// Essential order data
			orderId: orderId,
			referenceId: referenceId,
			status: status,
			
			// Value and currency
			amount: amount.value || 0,
			currency: amount.currency || 'BRL',
			
			// Customer
			customerName: (customer as any)?.name || 'N/A',
			customerEmail: (customer as any)?.email || 'N/A',
			
			// Payment method
			paymentMethod: paymentMethod.type || 'UNKNOWN',
			paidAt: paidAt,
			
			// Timestamp
			receivedAt: new Date().toISOString(),
		};

		// Add calculated fields if enabled
		if (addCalculatedFields) {
			const triggerInstance = new PagBankTrigger();
			processedData.event = triggerInstance.getEventType.call(triggerInstance, status, paymentMethod.type);
			processedData.paymentMethodFormatted = triggerInstance.getPaymentMethodFormatted.call(triggerInstance, paymentMethod.type);
			processedData.statusFormatted = triggerInstance.getStatusFormatted.call(triggerInstance, status);
			processedData.declineReason = triggerInstance.getDeclineReason.call(triggerInstance, paymentResponse);
			processedData.isPaid = status === 'PAID';
			processedData.isWaiting = status === 'WAITING';
			processedData.isDeclined = status === 'DECLINED';
		}

		// Add raw data for debug
		processedData.rawData = bodyData;


		return {
			webhookResponse: {
				status: 200,
				body: { received: true },
			},
			workflowData: [
				[
					{
						json: processedData,
					},
				],
			],
		};
	}

	private getEventType(status: string, paymentMethod: string): string {
		if (status === 'PAID') {
			return `PAYMENT_APPROVED_${paymentMethod}`;
		} else if (status === 'WAITING') {
			return `WAITING_PAYMENT_${paymentMethod}`;
		} else if (status === 'DECLINED') {
			return `PAYMENT_DECLINED_${paymentMethod}`;
		}
		return `UNKNOWN_EVENT_${status}`;
	}

	private getPaymentMethodFormatted(paymentMethod: string): string {
		const methods: { [key: string]: string } = {
			'PIX': 'PIX',
			'CREDIT_CARD': 'Credit Card',
			'BOLETO': 'Bank Slip',
		};
		return methods[paymentMethod] || paymentMethod;
	}

	private getStatusFormatted(status: string): string {
		const statuses: { [key: string]: string } = {
			'PAID': 'Paid',
			'WAITING': 'Waiting for Payment',
			'DECLINED': 'Declined',
		};
		return statuses[status] || status;
	}

	private getDeclineReason(paymentResponse: any): string {
		const code = paymentResponse.code || '';
		const message = paymentResponse.message || '';
		
		if (code === '10002' || message.includes('EMISSOR DO CARTAO')) {
			return 'DECLINED_BY_BANK';
		} else if (code === '10000' || message.includes('PAGSEGURO')) {
			return 'DECLINED_BY_PAGBANK';
		}
		
		return 'DECLINED_UNKNOWN';
	}
}

