import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

import { validateConnectKey, pagBankConnectRequest } from './PagBankUtils';
import { encryptCard } from '../../lib/pagbank/PagBankEncryption';

export class PagBankSimple implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'PagBank',
		name: 'pagBank',
		icon: { light: 'file:pagbank.svg', dark: 'file:pagbank.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Integration with PagBank for payment processing',
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
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
				{
					name: 'Create Payment Link',
					value: 'createPaymentLink',
					description: 'Creates a payment link (checkout)',
					action: 'Create payment link',
				},
				{
					name: 'Create PIX Order',
					value: 'createPixOrder',
					description: 'Creates an order with PIX payment',
					action: 'Create PIX order',
				},
				{
					name: 'Check Order Status',
					value: 'getOrderStatus',
					description: 'Checks the status of an order',
					action: 'Check order status',
				},
				{
					name: 'Create Credit Card Charge',
					value: 'createCreditCardCharge',
					description: 'Creates a direct credit card charge',
					action: 'Create credit card charge',
				},
				{
					name: 'Validate Connect Key',
					value: 'validateConnectKey',
					description: 'Validates if the Connect Key is valid and active',
					action: 'Validate Connect Key',
				},
				],
				default: 'createPaymentLink',
			},
			{
				displayName: 'Reference ID',
				name: 'referenceId',
				type: 'string',
				default: '',
				description: 'Unique ID to identify the order in your system',
				displayOptions: {
					show: {
						operation: ['createPaymentLink', 'createPixOrder', 'createCreditCardCharge'],
					},
				},
			},
			{
				displayName: 'Customer Name',
				name: 'customerName',
				type: 'string',
				default: '',
				required: true,
				description: 'Full customer name',
				displayOptions: {
					show: {
						operation: ['createPaymentLink', 'createPixOrder', 'createCreditCardCharge'],
					},
				},
			},
			{
				displayName: 'Customer Email',
				name: 'customerEmail',
				type: 'string',
				default: '',
				required: true,
				description: 'Customer email',
				displayOptions: {
					show: {
						operation: ['createPaymentLink', 'createPixOrder', 'createCreditCardCharge'],
					},
				},
			},
			{
				displayName: 'Customer CPF/CNPJ',
				name: 'customerTaxId',
				type: 'string',
				default: '',
				required: true,
				description: 'Customer CPF (11 digits) or CNPJ (14 digits)',
				displayOptions: {
					show: {
						operation: ['createPaymentLink', 'createPixOrder', 'createCreditCardCharge'],
					},
				},
			},
			{
				displayName: 'Order Items',
				name: 'items',
				type: 'fixedCollection',
				default: [],
				placeholder: 'Add Item',
				description: 'List of order items',
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
								displayName: 'Product Name',
								name: 'name',
								type: 'string',
								default: '',
								required: true,
								description: 'Product/service name',
							},
							{
								displayName: 'Reference',
								name: 'reference_id',
								type: 'string',
								default: '',
								description: 'Item reference ID (optional)',
							},
							{
								displayName: 'Quantity',
								name: 'quantity',
								type: 'number',
								default: 1,
								required: true,
								description: 'Item quantity',
							},
							{
								displayName: 'Value (in cents)',
								name: 'unit_amount',
								type: 'number',
								default: 0,
								required: true,
								description: 'Unit value in cents (e.g.: R$ 10.00 = 1000)',
							},
						],
					},
				],
			},
			{
				displayName: 'Payment Methods',
				name: 'paymentMethods',
				type: 'multiOptions',
				options: [
					{
						name: 'Credit Card',
						value: 'CREDIT_CARD',
					},
					{
						name: 'PIX',
						value: 'PIX',
					},
					{
						name: 'Bank Slip',
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
				displayName: 'Redirect URL',
				name: 'redirectUrl',
				type: 'string',
				default: '',
				description: 'URL where the customer will be redirected after payment',
				displayOptions: {
					show: {
						operation: ['createPaymentLink'],
					},
				},
			},
			{
				displayName: 'Notification URL',
				name: 'notificationUrl',
				type: 'string',
				default: '',
				description: 'URL to receive payment notifications (maximum 100 characters)',
				displayOptions: {
					show: {
						operation: ['createPaymentLink', 'createPixOrder', 'createCreditCardCharge'],
					},
				},
			},
			// Campos específicos para cobrança em cartão
			{
				displayName: 'Card Data',
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
							displayName: 'Card',
						values: [
								{
									displayName: 'Card Number',
									name: 'number',
									type: 'string',
									default: '',
									required: true,
									description: 'Credit card number',
								},
								{
									displayName: 'Cardholder Name',
									name: 'holder',
									type: 'string',
									default: '',
									required: true,
									description: 'Name as it appears on the card',
								},
								{
									displayName: 'Expiration Month',
									name: 'expMonth',
									type: 'string',
									default: '',
									required: true,
									description: 'Expiration month (MM)',
								},
								{
									displayName: 'Expiration Year',
									name: 'expYear',
									type: 'string',
									default: '',
									required: true,
									description: 'Expiration year (YYYY)',
								},
								{
									displayName: 'Security Code',
									name: 'securityCode',
									type: 'string',
									default: '',
									required: true,
									description: 'Card CVV/CVC',
								},
						],
					},
				],
			},
			{
				displayName: 'Installments',
				name: 'installments',
				type: 'number',
				default: 1,
				description: 'Number of installments (1 to 12)',
				displayOptions: {
					show: {
						operation: ['createCreditCardCharge'],
					},
				},
			},
			{
				displayName: 'Statement Descriptor',
				name: 'softDescriptor',
				type: 'string',
				default: '',
				description: 'Name that will appear on customer statement (maximum 13 characters)',
				displayOptions: {
					show: {
						operation: ['createCreditCardCharge'],
					},
				},
			},
			{
				displayName: 'Order ID',
				name: 'orderId',
				type: 'string',
				default: '',
				required: true,
				description: 'Order ID to query',
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
					throw new NodeOperationError(this.getNode(), `Unsupported operation: ${operation}`);
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
		
		// n8n returns object with itemProperties array for fixedCollection with multipleValues
		let items: any[] = [];
		if (itemsData && itemsData.itemProperties && Array.isArray(itemsData.itemProperties)) {
			items = itemsData.itemProperties.map((item: any) => ({
				name: item.name || '',
				reference_id: item.reference_id || undefined,
				quantity: item.quantity || 1,
				unit_amount: item.unit_amount || 0
			}));
		} else {
			items = [];
		}
		
		const paymentMethods = this.getNodeParameter('paymentMethods', itemIndex) as string[];
		const redirectUrl = this.getNodeParameter('redirectUrl', itemIndex) as string;
		const notificationUrl = this.getNodeParameter('notificationUrl', itemIndex) as string;

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
			// Validate URL length (maximum 100 characters)
			if (notificationUrl.length > 100) {
				throw new NodeOperationError(this.getNode(), 'Notification URL must have maximum 100 characters');
			}
			body.notification_urls = [notificationUrl.trim()];
		}

		const response = await pagBankConnectRequest.call(this, 'POST', '/connect/ws/checkouts', body);
		return response;
	}
	
	private async createPixOrder(this: IExecuteFunctions, itemIndex: number): Promise<any> {
		const referenceId = this.getNodeParameter('referenceId', itemIndex) as string;
		const customerName = this.getNodeParameter('customerName', itemIndex) as string;
		const customerEmail = this.getNodeParameter('customerEmail', itemIndex) as string;
		const customerTaxId = this.getNodeParameter('customerTaxId', itemIndex) as string;
		const itemsData = this.getNodeParameter('items', itemIndex) as any;
		
		// n8n returns object with itemProperties array for fixedCollection with multipleValues
		let items: any[] = [];
		if (itemsData && itemsData.itemProperties && Array.isArray(itemsData.itemProperties)) {
			items = itemsData.itemProperties.map((item: any) => ({
				name: item.name || '',
				reference_id: item.reference_id || undefined,
				quantity: item.quantity || 1,
				unit_amount: item.unit_amount || 0
			}));
		} else {
			items = [];
		}
		
		const notificationUrl = this.getNodeParameter('notificationUrl', itemIndex) as string;

		const credentials = await this.getCredentials('pagBankConnect');
		if (!credentials) {
			throw new NodeOperationError(this.getNode(), 'PagBank credentials not found');
		}
		
		const connectKey = (credentials as any).connectKey;
		if (!connectKey) {
			throw new NodeOperationError(this.getNode(), 'Connect Key not found in credentials');
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

		// Add reference_id only if provided
		if (referenceId && referenceId.trim()) {
			body.reference_id = referenceId.trim();
		}

		if (notificationUrl) {
			// Validate URL length (maximum 100 characters)
			if (notificationUrl.length > 100) {
				throw new NodeOperationError(this.getNode(), 'Notification URL must have maximum 100 characters');
			}
			body.notification_urls = [notificationUrl.trim()];
		}

		const baseURL = 'https://ws.pbintegracoes.com/pspro/v7';
		const isSandbox = connectKey && connectKey.startsWith('CONSANDBOX');
		let url = `${baseURL}/connect/ws/orders`;
		if (isSandbox) {
			url += '?isSandbox=1';
		}

		const response = await pagBankConnectRequest.call(this, 'POST', '/connect/ws/checkouts', body);
		return response;
	}

	private async getOrderStatus(this: IExecuteFunctions, itemIndex: number): Promise<any> {
		const orderId = this.getNodeParameter('orderId', itemIndex) as string;

		const credentials = await this.getCredentials('pagBankConnect');
		if (!credentials) {
			throw new NodeOperationError(this.getNode(), 'PagBank credentials not found');
		}
		
		const connectKey = (credentials as any).connectKey;
		if (!connectKey) {
			throw new NodeOperationError(this.getNode(), 'Connect Key not found in credentials');
		}

		const response = await pagBankConnectRequest.call(this, 'GET', `/connect/ws/orders/${orderId}`);
		return response;
	}

	private async validateConnectKey(this: IExecuteFunctions, itemIndex: number): Promise<any> {
		const credentials = await this.getCredentials('pagBankConnect');
		if (!credentials) {
			throw new NodeOperationError(this.getNode(), 'PagBank Connect credentials not found');
		}

		const connectKey = (credentials as any).connectKey;
		const validation = await validateConnectKey.call(this as any, connectKey);
		
		return {
			...validation,
			connectKey: connectKey.substring(0, 10) + '...', // Mask the key
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
		
		// n8n returns object with itemProperties array for fixedCollection with multipleValues
		let items: any[] = [];
		if (itemsData && itemsData.itemProperties && Array.isArray(itemsData.itemProperties)) {
			items = itemsData.itemProperties.map((item: any) => ({
				name: item.name || '',
				reference_id: item.reference_id || undefined,
				quantity: item.quantity || 1,
				unit_amount: item.unit_amount || 0
			}));
		} else {
			items = [];
		}
		
		const notificationUrl = this.getNodeParameter('notificationUrl', itemIndex) as string;
		const cardData = this.getNodeParameter('cardData.card', itemIndex) as any;
		const installments = this.getNodeParameter('installments', itemIndex) as number;
		const softDescriptor = this.getNodeParameter('softDescriptor', itemIndex) as string;

		const credentials = await this.getCredentials('pagBankConnect');
		if (!credentials) {
			throw new NodeOperationError(this.getNode(), 'PagBank credentials not found');
		}
		
		const connectKey = (credentials as any).connectKey;
		if (!connectKey) {
			throw new NodeOperationError(this.getNode(), 'Connect Key not found in credentials');
		}

		// Get encryption public key
		const nodeInstance = new PagBankSimple();
		const publicKey = await nodeInstance.getEncryptionPublicKey.call(this);
		
		// Encrypt card data using external JavaScript
		const cardToken = await nodeInstance.encryptCardData.call(this, cardData, publicKey);

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

		// Add reference_id only if provided
		if (referenceId && referenceId.trim()) {
			body.reference_id = referenceId.trim();
		}

		if (notificationUrl) {
			// Validate URL length (maximum 100 characters)
			if (notificationUrl.length > 100) {
				throw new NodeOperationError(this.getNode(), 'Notification URL must have maximum 100 characters');
			}
			body.notification_urls = [notificationUrl.trim()];
		}

		const response = await pagBankConnectRequest.call(this, 'POST', '/connect/ws/orders', body);
		return response;
	}

	private async getEncryptionPublicKey(this: IExecuteFunctions): Promise<string> {
		const credentials = await this.getCredentials('pagBankConnect');
		if (!credentials) {
			throw new NodeOperationError(this.getNode(), 'PagBank credentials not found');
		}
		
		const connectKey = (credentials as any).connectKey;
		if (!connectKey) {
			throw new NodeOperationError(this.getNode(), 'Connect Key not found in credentials');
		}

		const response = await pagBankConnectRequest.call(this, 'POST', '/connect/ws/public-keys', {
			type: 'card',
		});
		
		return response.public_key;
	}

	private async encryptCardData(this: IExecuteFunctions, cardData: any, publicKey: string): Promise<string> {
		// Map the card data fields to match the parameter names
		const cardInfo: any = {
			number: cardData.number,
			exp_month: cardData.expMonth,
			exp_year: cardData.expYear,
			security_code: cardData.securityCode,
			holder: cardData.holder
		};
		
		// Validate required card data fields
		const requiredFields = ['number', 'exp_month', 'exp_year', 'security_code', 'holder'];
		const missingFields = requiredFields.filter(field => !cardInfo[field] || cardInfo[field].toString().trim() === '');
		
		if (missingFields.length > 0) {
			throw new NodeOperationError(
				this.getNode(), 
				`Missing required card data fields: ${missingFields.join(', ')}. Please provide all card information.`
			);
		}
		
		// Validate card number format (basic validation)
		const cardNumber = cardInfo.number.toString().replace(/\s/g, '');
		if (!/^\d{13,19}$/.test(cardNumber)) {
			throw new NodeOperationError(
				this.getNode(), 
				'Invalid card number format. Card number must contain 13-19 digits.'
			);
		}
		
		// Validate expiration month
		const expMonth = parseInt(cardInfo.exp_month.toString());
		if (expMonth < 1 || expMonth > 12) {
			throw new NodeOperationError(
				this.getNode(), 
				'Invalid expiration month. Month must be between 1 and 12.'
			);
		}
		
		// Validate expiration year
		const expYear = parseInt(cardInfo.exp_year.toString());
		const currentYear = new Date().getFullYear();
		if (expYear < currentYear || expYear > currentYear + 20) {
			throw new NodeOperationError(
				this.getNode(), 
				'Invalid expiration year. Year must be between current year and 20 years in the future.'
			);
		}
		
		// Validate security code
		const securityCode = cardInfo.security_code.toString();
		if (!/^\d{3,4}$/.test(securityCode)) {
			throw new NodeOperationError(
				this.getNode(), 
				'Invalid security code. Security code must contain 3 or 4 digits.'
			);
		}
		
		// Validate holder name
		const holder = cardInfo.holder.toString().trim();
		if (holder.length < 2) {
			throw new NodeOperationError(
				this.getNode(), 
				'Invalid card holder name. Name must contain at least 2 characters.'
			);
		}
		
		try {
			// Use the real PagBank encryption library
			const encryptedToken = encryptCard({
				publicKey: publicKey,
				holder: holder,
				number: cardNumber,
				expMonth: expMonth.toString().padStart(2, '0'),
				expYear: expYear.toString(),
				securityCode: securityCode
			});
			
			return encryptedToken;
			
		} catch (error: any) {
			throw new NodeOperationError(
				this.getNode(), 
				`Failed to encrypt card data: ${error.message}`
			);
		}
	}
}

