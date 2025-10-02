import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

import { validateConnectKey } from './PagBankUtils';

export class PagBankSimple implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'PagBank',
		name: 'pagBank',
		icon: 'file:pagbank.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Integração com PagBank para processamento de pagamentos',
		defaults: {
			name: 'PagBank',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'pagBankConnect',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Operação',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Criar Link de Pagamento',
						value: 'createPaymentLink',
						description: 'Cria um link de pagamento (checkout)',
						action: 'Criar link de pagamento',
					},
					{
						name: 'Criar Pedido PIX',
						value: 'createPixOrder',
						description: 'Cria um pedido com pagamento PIX',
						action: 'Criar pedido PIX',
					},
					{
						name: 'Consultar Status do Pedido',
						value: 'getOrderStatus',
						description: 'Consulta o status de um pedido',
						action: 'Consultar status do pedido',
					},
					{
						name: 'Validar Connect Key',
						value: 'validateConnectKey',
						description: 'Valida se a Connect Key está válida e ativa',
						action: 'Validar Connect Key',
					},
				],
				default: 'createPaymentLink',
			},
			{
				displayName: 'ID de Referência',
				name: 'referenceId',
				type: 'string',
				default: '',
				description: 'ID único para identificar o pedido no seu sistema',
				displayOptions: {
					show: {
						operation: ['createPaymentLink', 'createPixOrder'],
					},
				},
			},
			{
				displayName: 'Nome do Cliente',
				name: 'customerName',
				type: 'string',
				default: '',
				required: true,
				description: 'Nome completo do cliente',
				displayOptions: {
					show: {
						operation: ['createPaymentLink', 'createPixOrder'],
					},
				},
			},
			{
				displayName: 'Email do Cliente',
				name: 'customerEmail',
				type: 'string',
				default: '',
				required: true,
				description: 'Email do cliente',
				displayOptions: {
					show: {
						operation: ['createPaymentLink', 'createPixOrder'],
					},
				},
			},
			{
				displayName: 'CPF/CNPJ do Cliente',
				name: 'customerTaxId',
				type: 'string',
				default: '',
				required: true,
				description: 'CPF (11 dígitos) ou CNPJ (14 dígitos) do cliente',
				displayOptions: {
					show: {
						operation: ['createPaymentLink', 'createPixOrder'],
					},
				},
			},
			{
				displayName: 'Nome do Produto',
				name: 'productName',
				type: 'string',
				default: '',
				required: true,
				description: 'Nome do produto/serviço',
				displayOptions: {
					show: {
						operation: ['createPaymentLink', 'createPixOrder'],
					},
				},
			},
			{
				displayName: 'Quantidade',
				name: 'quantity',
				type: 'number',
				default: 1,
				description: 'Quantidade do item',
				displayOptions: {
					show: {
						operation: ['createPaymentLink', 'createPixOrder'],
					},
				},
			},
			{
				displayName: 'Valor (em centavos)',
				name: 'unitAmount',
				type: 'number',
				default: 0,
				required: true,
				description: 'Valor unitário em centavos (ex: R$ 10,00 = 1000)',
				displayOptions: {
					show: {
						operation: ['createPaymentLink', 'createPixOrder'],
					},
				},
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
						name: 'PIX',
						value: 'PIX',
					},
					{
						name: 'Boleto',
						value: 'BOLETO',
					},
				],
				default: ['CREDIT_CARD', 'PIX'],
				displayOptions: {
					show: {
						operation: ['createPaymentLink'],
					},
				},
			},
			{
				displayName: 'URL de Redirecionamento',
				name: 'redirectUrl',
				type: 'string',
				default: '',
				description: 'URL para onde o cliente será redirecionado após o pagamento',
				displayOptions: {
					show: {
						operation: ['createPaymentLink'],
					},
				},
			},
			{
				displayName: 'URLs de Notificação',
				name: 'notificationUrls',
				type: 'string',
				default: '',
				description: 'URLs para receber notificações de pagamento (separadas por vírgula)',
				displayOptions: {
					show: {
						operation: ['createPaymentLink', 'createPixOrder'],
					},
				},
			},
			{
				displayName: 'ID do Pedido',
				name: 'orderId',
				type: 'string',
				default: '',
				required: true,
				description: 'ID do pedido para consultar',
				displayOptions: {
					show: {
						operation: ['getOrderStatus'],
					},
				},
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const operation = this.getNodeParameter('operation', i) as string;
				let responseData: any;

				if (operation === 'createPaymentLink') {
					responseData = await this.createPaymentLink(i);
				} else if (operation === 'createPixOrder') {
					responseData = await this.createPixOrder(i);
				} else if (operation === 'getOrderStatus') {
					responseData = await this.getOrderStatus(i);
				} else if (operation === 'validateConnectKey') {
					responseData = await this.validateConnectKey(i);
				} else {
					throw new NodeOperationError(this.getNode(), `Operação não suportada: ${operation}`);
				}

				returnData.push({
					json: responseData,
					pairedItem: { item: i },
				});
			} catch (error: any) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: error.message },
						pairedItem: { item: i },
					});
				} else {
					throw error;
				}
			}
		}

		return [returnData];
	}

	private async createPaymentLink(itemIndex: number): Promise<any> {
		const referenceId = this.getNodeParameter('referenceId', itemIndex) as string;
		const customerName = this.getNodeParameter('customerName', itemIndex) as string;
		const customerEmail = this.getNodeParameter('customerEmail', itemIndex) as string;
		const customerTaxId = this.getNodeParameter('customerTaxId', itemIndex) as string;
		const productName = this.getNodeParameter('productName', itemIndex) as string;
		const quantity = this.getNodeParameter('quantity', itemIndex) as number;
		const unitAmount = this.getNodeParameter('unitAmount', itemIndex) as number;
		const paymentMethods = this.getNodeParameter('paymentMethods', itemIndex) as string[];
		const redirectUrl = this.getNodeParameter('redirectUrl', itemIndex) as string;
		const notificationUrls = this.getNodeParameter('notificationUrls', itemIndex) as string;

		const credentials = await this.getCredentials('pagBankConnect');
		if (!credentials) {
			throw new NodeOperationError(this.getNode(), 'Credenciais do PagBank não encontradas');
		}

		const body: any = {
			reference_id: referenceId || `PEDIDO-${Date.now()}`,
			customer: {
				name: customerName,
				email: customerEmail,
				tax_id: customerTaxId.replace(/\D/g, ''),
			},
			items: [
				{
					reference_id: 'ITEM-1',
					name: productName,
					quantity: quantity,
					unit_amount: unitAmount,
				},
			],
			payment_methods: paymentMethods.map(method => ({ type: method })),
		};

		if (redirectUrl) {
			body.redirect_url = redirectUrl;
		}

		if (notificationUrls) {
			body.notification_urls = notificationUrls.split(',').map(url => url.trim());
		}

		const baseURL = 'https://ws.pbintegracoes.com/pspro/v7';
		const connectKey = (credentials as any).connectKey;
		const isSandbox = connectKey && connectKey.startsWith('CONSANDBOX');
		let url = `${baseURL}/connect/ws/checkouts`;
		if (isSandbox) {
			url += '?isSandbox=1';
		}

		const options: any = {
			method: 'POST',
			url,
			headers: {
				'Authentication': `Bearer ${(credentials as any).connectKey}`,
				'Platform': (credentials as any).platform || 'n8n',
				'Content-Type': 'application/json',
			},
			body,
			json: true,
		};

		const response = await this.helpers.request(options);
		return response;
	}

	private async createPixOrder(itemIndex: number): Promise<any> {
		const referenceId = this.getNodeParameter('referenceId', itemIndex) as string;
		const customerName = this.getNodeParameter('customerName', itemIndex) as string;
		const customerEmail = this.getNodeParameter('customerEmail', itemIndex) as string;
		const customerTaxId = this.getNodeParameter('customerTaxId', itemIndex) as string;
		const productName = this.getNodeParameter('productName', itemIndex) as string;
		const quantity = this.getNodeParameter('quantity', itemIndex) as number;
		const unitAmount = this.getNodeParameter('unitAmount', itemIndex) as number;
		const notificationUrls = this.getNodeParameter('notificationUrls', itemIndex) as string;

		const credentials = await this.getCredentials('pagBankConnect');
		if (!credentials) {
			throw new NodeOperationError(this.getNode(), 'Credenciais do PagBank não encontradas');
		}

		const body: any = {
			reference_id: referenceId || `PIX-${Date.now()}`,
			customer: {
				name: customerName,
				email: customerEmail,
				tax_id: customerTaxId.replace(/\D/g, ''),
			},
			items: [
				{
					reference_id: 'ITEM-1',
					name: productName,
					quantity: quantity,
					unit_amount: unitAmount,
				},
			],
			qr_codes: [
				{
					amount: {
						value: unitAmount * quantity,
						currency: 'BRL',
					},
				},
			],
		};

		if (notificationUrls) {
			body.notification_urls = notificationUrls.split(',').map(url => url.trim());
		}

		const baseURL = 'https://ws.pbintegracoes.com/pspro/v7';
		const connectKey = (credentials as any).connectKey;
		const isSandbox = connectKey && connectKey.startsWith('CONSANDBOX');
		let url = `${baseURL}/connect/ws/orders`;
		if (isSandbox) {
			url += '?isSandbox=1';
		}

		const options: any = {
			method: 'POST',
			url,
			headers: {
				'Authentication': `Bearer ${(credentials as any).connectKey}`,
				'Platform': (credentials as any).platform || 'n8n',
				'Content-Type': 'application/json',
			},
			body,
			json: true,
		};

		const response = await this.helpers.request(options);
		return response;
	}

	private async getOrderStatus(itemIndex: number): Promise<any> {
		const orderId = this.getNodeParameter('orderId', itemIndex) as string;

		const credentials = await this.getCredentials('pagBankConnect');
		if (!credentials) {
			throw new NodeOperationError(this.getNode(), 'Credenciais do PagBank não encontradas');
		}

		const baseURL = 'https://ws.pbintegracoes.com/pspro/v7';
		const connectKey = (credentials as any).connectKey;
		const isSandbox = connectKey && connectKey.startsWith('CONSANDBOX');
		let url = `${baseURL}/connect/ws/orders/${orderId}`;
		if (isSandbox) {
			url += url.includes('?') ? '&isSandbox=1' : '?isSandbox=1';
		}

		const options: any = {
			method: 'GET',
			url,
			headers: {
				'Authentication': `Bearer ${(credentials as any).connectKey}`,
				'Platform': (credentials as any).platform || 'n8n',
			},
			json: true,
		};

		const response = await this.helpers.request(options);
		return response;
	}

	private async validateConnectKey(itemIndex: number): Promise<any> {
		const credentials = await this.getCredentials('pagBankConnect');
		if (!credentials) {
			throw new NodeOperationError(this.getNode(), 'Credenciais do PagBank Connect não encontradas');
		}

		const connectKey = (credentials as any).connectKey;
		const validation = await validateConnectKey.call(this, connectKey);
		
		return {
			...validation,
			connectKey: connectKey.substring(0, 10) + '...', // Mascarar a chave
			environment: connectKey.startsWith('CONSANDBOX') ? 'Sandbox' : 'Produção',
			validatedAt: new Date().toISOString(),
		};
	}
}
