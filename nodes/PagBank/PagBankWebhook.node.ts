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
		documentationUrl: 'https://ajuda.pbintegracoes.com/hc/pt-br/articles/40055875188621-Como-testar-as-Triggers-Webhooks-do-PagBank-no-n8n',
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
		properties: [
			{
				displayName: 'Filtrar por Status de Pagamento',
				name: 'filterByStatus',
				type: 'multiOptions',
				options: [
					{
						name: 'Pagamento Aprovado (PAID)',
						value: 'PAID',
					},
					{
						name: 'Aguardando Pagamento (WAITING)',
						value: 'WAITING',
					},
					{
						name: 'Pagamento Negado (DECLINED)',
						value: 'DECLINED',
					},
				],
				default: [],
				description: 'Selecione os status de pagamento que deseja receber. Deixe vazio para receber todos.',
			},
			{
				displayName: 'Filtrar por Método de Pagamento',
				name: 'filterByPaymentMethod',
				type: 'multiOptions',
				options: [
					{
						name: 'PIX',
						value: 'PIX',
					},
					{
						name: 'Cartão de Crédito',
						value: 'CREDIT_CARD',
					},
					{
						name: 'Boleto',
						value: 'BOLETO',
					},
				],
				default: [],
				description: 'Selecione os métodos de pagamento que deseja receber. Deixe vazio para receber todos.',
			},
			{
				displayName: 'Filtrar por Motivo de Negação',
				name: 'filterByDeclineReason',
				type: 'multiOptions',
				options: [
					{
						name: 'Negado pelo Banco',
						value: 'DECLINED_BY_BANK',
					},
					{
						name: 'Negado pelo PagBank',
						value: 'DECLINED_BY_PAGBANK',
					},
				],
				default: [],
				description: 'Selecione os motivos de negação que deseja receber. Deixe vazio para receber todos.',
			},
			{
				displayName: 'Adicionar Campos Calculados',
				name: 'addCalculatedFields',
				type: 'boolean',
				default: true,
				description: 'Adiciona campos calculados como evento, método de pagamento formatado, etc.',
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
		console.log('=== PAGBANK WEBHOOK EXECUTADO ===');
		console.log('Timestamp:', new Date().toISOString());

		// Obtém os dados do webhook
		const bodyData = this.getBodyData();
		const headerData = this.getHeaderData();

		console.log('Dados recebidos:', JSON.stringify(bodyData, null, 2));

		// Obtém configurações do nó
		const filterByStatus = this.getNodeParameter('filterByStatus', 0) as string[];
		const filterByPaymentMethod = this.getNodeParameter('filterByPaymentMethod', 0) as string[];
		const filterByDeclineReason = this.getNodeParameter('filterByDeclineReason', 0) as string[];
		const addCalculatedFields = this.getNodeParameter('addCalculatedFields', 0) as boolean;

		// Processa os dados do PagBank
		const orderId = bodyData.id || 'N/A';
		const referenceId = bodyData.reference_id || 'N/A';
		const customer = bodyData.customer || {};
		const charges = Array.isArray(bodyData.charges) ? bodyData.charges : [];
		
		// Pega o primeiro charge (pagamento)
		const firstCharge = charges[0] || {};
		const status = firstCharge.status || 'UNKNOWN';
		const amount = firstCharge.amount || {};
		const paymentMethod = firstCharge.payment_method || {};
		const paidAt = firstCharge.paid_at || null;
		const paymentResponse = firstCharge.payment_response || {};

		// Aplica filtros
		let shouldProcess = true;

		// Filtro por status
		if (filterByStatus.length > 0 && !filterByStatus.includes(status)) {
			shouldProcess = false;
			console.log(`Filtro de status: ${status} não está em ${filterByStatus.join(', ')}`);
		}

		// Filtro por método de pagamento
		if (shouldProcess && filterByPaymentMethod.length > 0) {
			const paymentMethodType = paymentMethod.type || 'UNKNOWN';
			if (!filterByPaymentMethod.includes(paymentMethodType)) {
				shouldProcess = false;
				console.log(`Filtro de método: ${paymentMethodType} não está em ${filterByPaymentMethod.join(', ')}`);
			}
		}

		// Filtro por motivo de negação
		if (shouldProcess && filterByDeclineReason.length > 0 && status === 'DECLINED') {
			const webhookInstance = new PagBankWebhook();
			const declineReason = webhookInstance.getDeclineReason.call(webhookInstance, paymentResponse);
			if (!filterByDeclineReason.includes(declineReason)) {
				shouldProcess = false;
				console.log(`Filtro de negação: ${declineReason} não está em ${filterByDeclineReason.join(', ')}`);
			}
		}

		// Se não deve processar, retorna sem dados
		if (!shouldProcess) {
			console.log('Webhook filtrado - não processando');
			return {
				webhookResponse: {
					status: 200,
					body: { received: true, filtered: true },
				},
				workflowData: [[]],
			};
		}

		// Monta os dados processados
		const processedData: any = {
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
		};

		// Adiciona campos calculados se habilitado
		if (addCalculatedFields) {
			const webhookInstance = new PagBankWebhook();
			processedData.event = webhookInstance.getEventType.call(webhookInstance, status, paymentMethod.type);
			processedData.paymentMethodFormatted = webhookInstance.getPaymentMethodFormatted.call(webhookInstance, paymentMethod.type);
			processedData.statusFormatted = webhookInstance.getStatusFormatted.call(webhookInstance, status);
			processedData.declineReason = webhookInstance.getDeclineReason.call(webhookInstance, paymentResponse);
			processedData.isPaid = status === 'PAID';
			processedData.isWaiting = status === 'WAITING';
			processedData.isDeclined = status === 'DECLINED';
		}

		// Adiciona dados brutos para debug
		processedData.rawData = bodyData;

		console.log('Dados processados:', JSON.stringify(processedData, null, 2));

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
			return `PAGAMENTO_APROVADO_${paymentMethod}`;
		} else if (status === 'WAITING') {
			return `AGUARDANDO_PAGAMENTO_${paymentMethod}`;
		} else if (status === 'DECLINED') {
			return `PAGAMENTO_NEGADO_${paymentMethod}`;
		}
		return `EVENTO_DESCONHECIDO_${status}`;
	}

	private getPaymentMethodFormatted(paymentMethod: string): string {
		const methods: { [key: string]: string } = {
			'PIX': 'PIX',
			'CREDIT_CARD': 'Cartão de Crédito',
			'BOLETO': 'Boleto Bancário',
		};
		return methods[paymentMethod] || paymentMethod;
	}

	private getStatusFormatted(status: string): string {
		const statuses: { [key: string]: string } = {
			'PAID': 'Pago',
			'WAITING': 'Aguardando Pagamento',
			'DECLINED': 'Negado',
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