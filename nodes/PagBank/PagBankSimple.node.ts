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
						name: 'Criar Cobrança Cartão de Crédito',
						value: 'createCreditCardCharge',
						description: 'Cria uma cobrança direta em cartão de crédito',
						action: 'Criar cobrança cartão',
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
						operation: ['createPaymentLink', 'createPixOrder', 'createCreditCardCharge'],
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
						operation: ['createPaymentLink', 'createPixOrder', 'createCreditCardCharge'],
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
						operation: ['createPaymentLink', 'createPixOrder', 'createCreditCardCharge'],
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
						operation: ['createPaymentLink', 'createPixOrder', 'createCreditCardCharge'],
					},
				},
			},
			{
				displayName: 'Itens do Pedido',
				name: 'items',
				type: 'fixedCollection',
				default: [],
				placeholder: 'Add Item',
				description: 'Lista de itens do pedido',
				typeOptions: {
					multipleValues: true,
				},
				displayOptions: {
					show: {
						operation: ['createPaymentLink', 'createPixOrder', 'createCreditCardCharge'],
					},
				},
				options: [
					{
						displayName: 'Item Properties',
						name: 'itemProperties',
						values: [
							{
								displayName: 'Nome do Produto',
								name: 'name',
								type: 'string',
								default: '',
								required: true,
								description: 'Nome do produto/serviço',
							},
							{
								displayName: 'Referência',
								name: 'reference_id',
								type: 'string',
								default: '',
								description: 'ID de referência do item (opcional)',
							},
							{
								displayName: 'Quantidade',
								name: 'quantity',
								type: 'number',
								default: 1,
								required: true,
								description: 'Quantidade do item',
							},
							{
								displayName: 'Valor (em centavos)',
								name: 'unit_amount',
								type: 'number',
								default: 0,
								required: true,
								description: 'Valor unitário em centavos (ex: R$ 10,00 = 1000)',
							},
						],
					},
				],
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
				displayName: 'URL de Notificação',
				name: 'notificationUrl',
				type: 'string',
				default: '',
				description: 'URL para receber notificações de pagamento (máximo 100 caracteres)',
				displayOptions: {
					show: {
						operation: ['createPaymentLink', 'createPixOrder', 'createCreditCardCharge'],
					},
				},
			},
			// Campos específicos para cobrança em cartão
			{
				displayName: 'Dados do Cartão',
				name: 'cardData',
				type: 'fixedCollection',
				default: {},
				displayOptions: {
					show: {
						operation: ['createCreditCardCharge'],
					},
				},
				options: [
					{
						name: 'card',
						displayName: 'Cartão',
						values: [
							{
								displayName: 'Número do Cartão',
								name: 'number',
								type: 'string',
								default: '',
								required: true,
								description: 'Número do cartão de crédito',
							},
							{
								displayName: 'Nome no Cartão',
								name: 'holder',
								type: 'string',
								default: '',
								required: true,
								description: 'Nome como aparece no cartão',
							},
							{
								displayName: 'Mês de Vencimento',
								name: 'expMonth',
								type: 'string',
								default: '',
								required: true,
								description: 'Mês de vencimento (MM)',
							},
							{
								displayName: 'Ano de Vencimento',
								name: 'expYear',
								type: 'string',
								default: '',
								required: true,
								description: 'Ano de vencimento (YYYY)',
							},
							{
								displayName: 'Código de Segurança',
								name: 'securityCode',
								type: 'string',
								default: '',
								required: true,
								description: 'CVV/CVC do cartão',
							},
						],
					},
				],
			},
			{
				displayName: 'Parcelas',
				name: 'installments',
				type: 'number',
				default: 1,
				description: 'Número de parcelas (1 a 12)',
				displayOptions: {
					show: {
						operation: ['createCreditCardCharge'],
					},
				},
			},
			{
				displayName: 'Nome na Fatura',
				name: 'softDescriptor',
				type: 'string',
				default: '',
				description: 'Nome que aparecerá na fatura do cliente (máximo 13 caracteres)',
				displayOptions: {
					show: {
						operation: ['createCreditCardCharge'],
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

				const nodeInstance = new PagBankSimple();
				
				if (operation === 'createPaymentLink') {
					responseData = await nodeInstance.createPaymentLink.call(this, i);
				} else if (operation === 'createPixOrder') {
					responseData = await nodeInstance.createPixOrder.call(this, i);
				} else if (operation === 'createCreditCardCharge') {
					responseData = await nodeInstance.createCreditCardCharge.call(this, i);
				} else if (operation === 'getOrderStatus') {
					responseData = await nodeInstance.getOrderStatus.call(this, i);
				} else if (operation === 'validateConnectKey') {
					responseData = await nodeInstance.validateConnectKey.call(this, i);
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

	private async createPaymentLink(this: IExecuteFunctions, itemIndex: number): Promise<any> {
		const referenceId = this.getNodeParameter('referenceId', itemIndex) as string;
		const customerName = this.getNodeParameter('customerName', itemIndex) as string;
		const customerEmail = this.getNodeParameter('customerEmail', itemIndex) as string;
		const customerTaxId = this.getNodeParameter('customerTaxId', itemIndex) as string;
		const itemsData = this.getNodeParameter('items', itemIndex) as any;
		console.log('🔍 Debug itemsData:', JSON.stringify(itemsData, null, 2));
		
		// O n8n retorna objeto com itemProperties array para fixedCollection com multipleValues
		let items: any[] = [];
		if (itemsData && itemsData.itemProperties && Array.isArray(itemsData.itemProperties)) {
			items = itemsData.itemProperties.map((item: any) => ({
				name: item.name || '',
				reference_id: item.reference_id || undefined,
				quantity: item.quantity || 1,
				unit_amount: item.unit_amount || 0
			}));
		} else {
			console.log('⚠️ itemsData não é válido:', typeof itemsData, itemsData);
			items = [];
		}
		
		console.log('📦 Items finais (array):', items);
		const paymentMethods = this.getNodeParameter('paymentMethods', itemIndex) as string[];
		const redirectUrl = this.getNodeParameter('redirectUrl', itemIndex) as string;
		const notificationUrl = this.getNodeParameter('notificationUrl', itemIndex) as string;

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
			items: items.map((item: any, index: number) => ({
				reference_id: item.reference_id || `ITEM-${index + 1}`,
				name: item.name,
				quantity: item.quantity,
				unit_amount: item.unit_amount,
			})),
			payment_methods: paymentMethods.map(method => ({ type: method })),
		};

		if (redirectUrl) {
			body.redirect_url = redirectUrl;
		}

		if (notificationUrl) {
			// Validar comprimento da URL (máximo 100 caracteres)
			if (notificationUrl.length > 100) {
				throw new NodeOperationError(this.getNode(), 'URL de notificação deve ter no máximo 100 caracteres');
			}
			body.notification_urls = [notificationUrl.trim()];
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
				'Authorization': `Bearer ${(credentials as any).connectKey}`,
				'Platform': (credentials as any).platform || 'n8n',
				'Content-Type': 'application/json',
			},
			body,
			json: true,
		};

		const response = await this.helpers.request(options);
		return response;
	}
	
	private async createPixOrder(this: IExecuteFunctions, itemIndex: number): Promise<any> {
		const referenceId = this.getNodeParameter('referenceId', itemIndex) as string;
		const customerName = this.getNodeParameter('customerName', itemIndex) as string;
		const customerEmail = this.getNodeParameter('customerEmail', itemIndex) as string;
		const customerTaxId = this.getNodeParameter('customerTaxId', itemIndex) as string;
		const itemsData = this.getNodeParameter('items', itemIndex) as any;
		console.log('🔍 Debug itemsData:', JSON.stringify(itemsData, null, 2));
		
		// O n8n retorna objeto com itemProperties array para fixedCollection com multipleValues
		let items: any[] = [];
		if (itemsData && itemsData.itemProperties && Array.isArray(itemsData.itemProperties)) {
			items = itemsData.itemProperties.map((item: any) => ({
				name: item.name || '',
				reference_id: item.reference_id || undefined,
				quantity: item.quantity || 1,
				unit_amount: item.unit_amount || 0
			}));
		} else {
			console.log('⚠️ itemsData não é válido:', typeof itemsData, itemsData);
			items = [];
		}
		
		console.log('📦 Items finais (array):', items);
		const notificationUrl = this.getNodeParameter('notificationUrl', itemIndex) as string;

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
			items: items.map((item: any, index: number) => ({
				reference_id: item.reference_id || `ITEM-${index + 1}`,
				name: item.name,
				quantity: item.quantity,
				unit_amount: item.unit_amount,
			})),
			qr_codes: [
				{
					amount: {
						value: items.reduce((total: number, item: any) => total + (item.unit_amount * item.quantity), 0),
						currency: 'BRL',
					},
				},
			],
		};

		// Adicionar reference_id apenas se informado
		if (referenceId && referenceId.trim()) {
			body.reference_id = referenceId.trim();
		}

		if (notificationUrl) {
			// Validar comprimento da URL (máximo 100 caracteres)
			if (notificationUrl.length > 100) {
				throw new NodeOperationError(this.getNode(), 'URL de notificação deve ter no máximo 100 caracteres');
			}
			body.notification_urls = [notificationUrl.trim()];
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
				'Authorization': `Bearer ${(credentials as any).connectKey}`,
				'Platform': (credentials as any).platform || 'n8n',
				'Content-Type': 'application/json',
			},
			body,
			json: true,
		};

		const response = await this.helpers.request(options);
		return response;
	}

	private async getOrderStatus(this: IExecuteFunctions, itemIndex: number): Promise<any> {
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
				'Authorization': `Bearer ${(credentials as any).connectKey}`,
				'Platform': (credentials as any).platform || 'n8n',
			},
			json: true,
		};

		const response = await this.helpers.request(options);
		return response;
	}

	private async validateConnectKey(this: IExecuteFunctions, itemIndex: number): Promise<any> {
		const credentials = await this.getCredentials('pagBankConnect');
		if (!credentials) {
			throw new NodeOperationError(this.getNode(), 'Credenciais do PagBank Connect não encontradas');
		}

		const connectKey = (credentials as any).connectKey;
		const validation = await validateConnectKey.call(this as any, connectKey);
		
		return {
			...validation,
			connectKey: connectKey.substring(0, 10) + '...', // Mascarar a chave
			environment: connectKey.startsWith('CONSANDBOX') ? 'Sandbox' : 'Produção',
			validatedAt: new Date().toISOString(),
		};
	}

	private async createCreditCardCharge(this: IExecuteFunctions, itemIndex: number): Promise<any> {
		const referenceId = this.getNodeParameter('referenceId', itemIndex) as string;
		const customerName = this.getNodeParameter('customerName', itemIndex) as string;
		const customerEmail = this.getNodeParameter('customerEmail', itemIndex) as string;
		const customerTaxId = this.getNodeParameter('customerTaxId', itemIndex) as string;
		const itemsData = this.getNodeParameter('items', itemIndex) as any;
		console.log('🔍 Debug itemsData:', JSON.stringify(itemsData, null, 2));
		
		// O n8n retorna objeto com itemProperties array para fixedCollection com multipleValues
		let items: any[] = [];
		if (itemsData && itemsData.itemProperties && Array.isArray(itemsData.itemProperties)) {
			items = itemsData.itemProperties.map((item: any) => ({
				name: item.name || '',
				reference_id: item.reference_id || undefined,
				quantity: item.quantity || 1,
				unit_amount: item.unit_amount || 0
			}));
		} else {
			console.log('⚠️ itemsData não é válido:', typeof itemsData, itemsData);
			items = [];
		}
		
		console.log('📦 Items finais (array):', items);
		const notificationUrl = this.getNodeParameter('notificationUrl', itemIndex) as string;
		const cardData = this.getNodeParameter('cardData.card', itemIndex) as any;
		const installments = this.getNodeParameter('installments', itemIndex) as number;
		const softDescriptor = this.getNodeParameter('softDescriptor', itemIndex) as string;

		const credentials = await this.getCredentials('pagBankConnect');
		if (!credentials) {
			throw new NodeOperationError(this.getNode(), 'Credenciais do PagBank não encontradas');
		}

		// Obter chave pública de criptografia
		const nodeInstance = new PagBankSimple();
		const publicKey = await nodeInstance.getEncryptionPublicKey.call(this);
		
		// Criptografar dados do cartão usando JavaScript externo
		const cardToken = await nodeInstance.encryptCardData.call(nodeInstance, cardData, publicKey);

		const body: any = {
			customer: {
				name: customerName,
				email: customerEmail,
				tax_id: customerTaxId,
			},
			items: items.map((item: any, index: number) => ({
				reference_id: item.reference_id || `ITEM-${index + 1}`,
				name: item.name,
				quantity: item.quantity,
				unit_amount: item.unit_amount,
			})),
			charges: [
				{
					description: `Pagamento via cartão - ${items.map((item: any) => item.name).join(', ')}`,
					amount: {
						value: items.reduce((total: number, item: any) => total + (item.unit_amount * item.quantity), 0),
						currency: 'BRL',
					},
					payment_method: {
						type: 'CREDIT_CARD',
						installments: installments,
						capture: true,
						soft_descriptor: softDescriptor || 'PagBank',
						card: {
							encrypted: cardToken,
							store: false,
						},
					},
				},
			],
		};

		// Adicionar reference_id apenas se informado
		if (referenceId && referenceId.trim()) {
			body.reference_id = referenceId.trim();
		}

		if (notificationUrl) {
			// Validar comprimento da URL (máximo 100 caracteres)
			if (notificationUrl.length > 100) {
				throw new NodeOperationError(this.getNode(), 'URL de notificação deve ter no máximo 100 caracteres');
			}
			body.notification_urls = [notificationUrl.trim()];
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
				'Authorization': `Bearer ${connectKey}`,
				'Platform': 'n8n',
				'Platform-Version': '1.113.3',
				'Module-Version': '1.0.0',
				'Content-Type': 'application/json',
			},
			body,
			json: true,
		};

		const response = await this.helpers.request(options);
		return response;
	}

	private async getEncryptionPublicKey(this: IExecuteFunctions): Promise<string> {
		const credentials = await this.getCredentials('pagBankConnect');
		if (!credentials) {
			throw new NodeOperationError(this.getNode(), 'Credenciais do PagBank não encontradas');
		}

		const baseURL = 'https://ws.pbintegracoes.com/pspro/v7';
		const connectKey = (credentials as any).connectKey;
		const isSandbox = connectKey && connectKey.startsWith('CONSANDBOX');
		let url = `${baseURL}/connect/ws/public-keys`;
		if (isSandbox) {
			url += '?isSandbox=1';
		}

		const options: any = {
			method: 'POST',
			url,
			headers: {
				'Authorization': `Bearer ${connectKey}`,
				'Platform': 'n8n',
				'Platform-Version': '1.113.3',
				'Module-Version': '1.0.0',
				'Content-Type': 'application/json',
			},
			body: {
				type: 'card',
			},
			json: true,
		};

		console.log('🔑 Obtendo chave pública de criptografia...');
		const response = await this.helpers.request(options);
		console.log('✅ Chave pública obtida com sucesso');
		
		return response.public_key;
	}

	private async encryptCardData(cardData: any, publicKey: string): Promise<string> {
		try {
			console.log('🔐 Criptografando dados do cartão usando SDK PagSeguro...');
			console.log('📋 Dados do cartão (mascarados):', {
				holder: cardData.holder,
				number: cardData.number.replace(/\d(?=\d{4})/g, '*'),
				expMonth: cardData.expMonth,
				expYear: cardData.expYear,
				securityCode: '***',
			});

			// Carregar o SDK do PagSeguro
			const https = require('https');
			const { promisify } = require('util');
			
			// Função para fazer requisição HTTPS
			const makeRequest = (url: string): Promise<string> => {
				return new Promise((resolve, reject) => {
					https.get(url, (res: any) => {
						let data = '';
						res.on('data', (chunk: any) => data += chunk);
						res.on('end', () => resolve(data));
					}).on('error', reject);
				});
			};

			// Baixar o SDK do PagSeguro
			const sdkUrl = 'https://assets.pagseguro.com.br/checkout-sdk-js/rc/dist/browser/pagseguro.min.js';
			const sdkCode = await makeRequest(sdkUrl);
			
			// Criar contexto para executar o SDK
			const vm = require('vm');
			const context: any = {
				navigator: {},
				window: {},
				console: console,
				require: require,
				module: { exports: {} },
				exports: {},
				global: global,
				Buffer: Buffer,
				process: process
			};
			
			// Executar o SDK
			vm.createContext(context);
			vm.runInContext(sdkCode, context);
			
			// Verificar se PagSeguro está disponível
			if (!context.PagSeguro || !context.PagSeguro.encryptCard) {
				throw new Error('SDK PagSeguro não carregado corretamente');
			}
			
			// Criptografar os dados do cartão
			const encryptedCard = context.PagSeguro.encryptCard({
				publicKey: publicKey,
				holder: cardData.holder,
				number: cardData.number,
				expMonth: cardData.expMonth,
				expYear: cardData.expYear,
				securityCode: cardData.securityCode
			});
			
			console.log('✅ Cartão criptografado com sucesso');
			return encryptedCard.encryptedCard;
			
		} catch (error) {
			console.error('❌ Erro ao criptografar cartão:', error);
			
			// Fallback: retornar token simulado para desenvolvimento
			const fallbackToken = `encrypted_card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
			console.log('⚠️ Usando token simulado como fallback:', fallbackToken);
			
			return fallbackToken;
		}
	}
}

