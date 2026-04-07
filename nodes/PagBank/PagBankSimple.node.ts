import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeConnectionTypes,
	NodeOperationError,
} from 'n8n-workflow';

import { validateConnectKey, pagBankConnectRequest, isSandboxConnectKey } from './PagBankUtils';
import { encryptCard } from '../../lib/pagbank/PagBankEncryption';

type SplitMethod = 'FIXED' | 'PERCENTAGE';

function buildOrderSplitsPayload(
	splitMethod: SplitMethod,
	receiverRows: any[] | undefined,
	orderTotalCents: number,
	options: { includeLiable: boolean },
): { method: SplitMethod; receivers: any[] } | undefined {
	if (!receiverRows || !Array.isArray(receiverRows) || receiverRows.length === 0) {
		return undefined;
	}
	if (receiverRows.length < 2) {
		throw new Error('Payment split requires at least 2 receivers. Add another receiver or remove split receivers.');
	}

	const receivers: any[] = [];

	for (const row of receiverRows) {
		const accountId = (row.accountId || '').toString().trim();
		if (!accountId) {
			throw new Error('Each split receiver must have an Account ID.');
		}

		const amountVal = Number(row.amountValue);
		if (!Number.isFinite(amountVal) || amountVal < 0) {
			throw new Error('Each split receiver must have a valid amount/percentage value.');
		}

		const rec: any = {
			account: { id: accountId },
		};

		if (splitMethod === 'FIXED') {
			rec.amount = { value: Math.round(amountVal) };
		} else {
			rec.amount = { value: Math.round(amountVal) };
		}

		const reason = (row.reason || '').toString().trim();
		if (reason) {
			rec.reason = reason;
		}

		const receiverType = (row.receiverType || '').toString().trim();
		if (receiverType === 'PRIMARY' || receiverType === 'SECONDARY') {
			rec.type = receiverType;
		}

		const custodyApply = row.custodyApply === true || row.custodyApply === 'true';
		const releaseScheduled = (row.custodyReleaseScheduled || '').toString().trim();
		const configurations: any = {};

		if (custodyApply || releaseScheduled) {
			configurations.custody = { apply: custodyApply };
			if (custodyApply && releaseScheduled) {
				configurations.custody.release = { scheduled: releaseScheduled };
			}
		} else {
			configurations.custody = { apply: false };
		}

		const chargebackRaw = row.chargebackPercentage;
		if (
			chargebackRaw !== undefined &&
			chargebackRaw !== null &&
			String(chargebackRaw).trim() !== ''
		) {
			const pct = Number(String(chargebackRaw).trim());
			if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
				throw new Error('Chargeback percentage must be between 0 and 100.');
			}
			configurations.chargeback = {
				charge_transfer: { percentage: Math.round(pct) },
			};
		}

		if (options.includeLiable && (row.liable === true || row.liable === 'true')) {
			configurations.liable = true;
		}

		if (Object.keys(configurations).length > 0) {
			rec.configurations = configurations;
		}

		receivers.push(rec);
	}

	if (splitMethod === 'FIXED') {
		const sum = receivers.reduce((acc, r) => acc + (r.amount?.value || 0), 0);
		if (sum !== orderTotalCents) {
			throw new Error(
				`Split amounts (FIXED) must sum to the order total (${orderTotalCents} cents). Current sum: ${sum}.`,
			);
		}
	} else {
		const sum = receivers.reduce((acc, r) => acc + (r.amount?.value || 0), 0);
		if (sum !== 100) {
			throw new Error(
				`Split percentages must sum to 100. Current sum: ${sum}.`,
			);
		}
	}

	return { method: splitMethod, receivers };
}

/** Public split resource on PagSeguro internal sandbox (no auth). */
const INTERNAL_SANDBOX_SPLITS_BASE = 'https://internal.sandbox.api.pagseguro.com/splits';

/**
 * Returns canonical URL for unauthenticated GET on internal sandbox splits API.
 * Tolerant to n8n expressions (=prefix), quotes, query/hash, and does not rely on URL()
 * alone (avoids failures when the string is almost-but-not-quite a valid URL).
 */
function tryInternalSandboxSplitPublicUrl(raw: string): string | null {
	let s = String(raw ?? '').trim();
	if (!s) {
		return null;
	}
	if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
		s = s.slice(1, -1).trim();
	}
	// Expression mode in n8n may store leading =
	if (s.startsWith('=')) {
		s = s.slice(1).trim();
	}
	// Strip BOM / zero-width (copy-paste from some UIs)
	s = s.replace(/^\uFEFF/, '').replace(/[\u200B-\u200D\uFEFF]/g, '');

	const hostOk = /internal\.sandbox\.api\.pagseguro\.com/i.test(s);
	const idMatch = s.match(/\/splits\/(SPLI_[0-9A-F-]+)/i);
	if (hostOk && idMatch) {
		return `${INTERNAL_SANDBOX_SPLITS_BASE}/${idMatch[1]}`;
	}

	try {
		const u = new URL(s);
		if (u.hostname.toLowerCase() !== 'internal.sandbox.api.pagseguro.com') {
			return null;
		}
		const m = u.pathname.match(/^\/splits\/(SPLI_[0-9A-F-]+)\/?$/i);
		if (!m) {
			return null;
		}
		u.hash = '';
		u.search = '';
		u.pathname = `/splits/${m[1]}`;
		return u.href;
	} catch {
		return null;
	}
}

/** Raw SPLI_… or href from order links; used with Connect GET /connect/ws/splits/:id */
function normalizeSplitId(raw: string): string {
	let s = (raw || '').trim();
	if (!s) {
		return '';
	}
	if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
		s = s.slice(1, -1).trim();
	}
	const pathOnly = s.split('#')[0].split('?')[0].replace(/\/+$/, '');
	const fromUrl = pathOnly.match(/\/splits\/(SPLI_[A-F0-9-]+)/i);
	if (fromUrl) {
		return fromUrl[1];
	}
	const bare = pathOnly.match(/^(SPLI_[A-F0-9-]+)$/i);
	if (bare) {
		return bare[1];
	}
	return pathOnly.trim();
}

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
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
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
					description: 'Create a payment link',
					action: 'Create payment link',
				},
				{
					name: 'Create PIX Order',
					value: 'createPixOrder',
					description: 'Create an order with PIX payment',
					action: 'Create PIX order',
				},
				{
					name: 'Get Order Status',
					value: 'getOrderStatus',
					description: 'Retrieve the status of an order',
					action: 'Get order status',
				},
				{
					name: 'Create Credit Card Charge',
					value: 'createCreditCardCharge',
					description: 'Create a direct credit card charge',
					action: 'Create credit card charge',
				},
				{
					name: 'Get Connect Key',
					value: 'validateConnectKey',
					description: 'Retrieve Connect Key information',
					action: 'Get Connect Key',
				},
				{
					name: 'Get Split Details',
					value: 'getSplitDetails',
					description:
						'Sandbox Connect key → public GET on internal.sandbox.api.pagseguro.com; production key → Connect API. Full sandbox SPLIT URL also works',
					action: 'Get split details',
				},
				{
					name: 'Release Split Custody',
					value: 'releaseSplitCustody',
					description: 'Release custody for one or more receivers before the scheduled date',
					action: 'Release split custody',
				},
				],
				default: 'createPaymentLink',
			},
			{
				displayName: 'Customer Name',
				name: 'customerName',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'e.g. John Smith',
				description: 'Full customer name',
				displayOptions: {
					show: {
						operation: ['createPixOrder', 'createCreditCardCharge'],
					},
				},
			},
			{
				displayName: 'Customer Name',
				name: 'customerName',
				type: 'string',
				default: '',
				placeholder: 'e.g. John Smith',
				description: 'Full customer name (optional for payment links)',
				displayOptions: {
					show: {
						operation: ['createPaymentLink'],
					},
				},
			},
			{
				displayName: 'Customer Email',
				name: 'customerEmail',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'e.g. john@example.com',
				description: 'Customer email',
				displayOptions: {
					show: {
						operation: ['createPixOrder', 'createCreditCardCharge'],
					},
				},
			},
			{
				displayName: 'Customer Email',
				name: 'customerEmail',
				type: 'string',
				default: '',
				placeholder: 'e.g. john@example.com',
				description: 'Customer email (optional for payment links)',
				displayOptions: {
					show: {
						operation: ['createPaymentLink'],
					},
				},
			},
			{
				displayName: 'Customer CPF/CNPJ',
				name: 'customerTaxId',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'e.g. 12345678901',
				description: 'Customer CPF (11 digits) or CNPJ (14 digits)',
				displayOptions: {
					show: {
						operation: ['createPixOrder', 'createCreditCardCharge'],
					},
				},
			},
			{
				displayName: 'Customer CPF/CNPJ',
				name: 'customerTaxId',
				type: 'string',
				default: '',
				placeholder: 'e.g. 12345678901',
				description: 'Customer CPF (11 digits) or CNPJ (14 digits) (optional for payment links)',
				displayOptions: {
					show: {
						operation: ['createPaymentLink'],
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
								placeholder: 'e.g. Premium Plan',
								description: 'Product/service name',
							},
							{
								displayName: 'Reference',
								name: 'reference_id',
								type: 'string',
								default: '',
								placeholder: 'e.g. item001',
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
								displayName: 'Amount (in cents)',
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
				displayName: 'Split Method (optional)',
				name: 'splitMethod',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Fixed Amount (order total in cents, split across receivers)',
						value: 'FIXED',
					},
					{
						name: 'Percentage (each receiver gets a %; must sum to 100)',
						value: 'PERCENTAGE',
					},
				],
				default: 'FIXED',
				description:
					'How to divide the payment between receivers. FIXED uses amounts in cents; PERCENTAGE uses integer percent per receiver.',
				displayOptions: {
					show: {
						operation: ['createPixOrder', 'createCreditCardCharge'],
					},
				},
			},
			{
				displayName: 'Split Receivers (optional)',
				name: 'splitReceivers',
				type: 'fixedCollection',
				default: {},
				placeholder: 'Add Receiver',
				description:
					'Optional. Add 2+ receivers to split the payment (PagBank account IDs). Same pattern as Order Items. Ignored if empty.',
				typeOptions: {
					multipleValues: true,
				},
				displayOptions: {
					show: {
						operation: ['createPixOrder', 'createCreditCardCharge'],
					},
				},
				options: [
					{
						displayName: 'Receiver',
						name: 'splitReceiverProperties',
						values: [
							{
								displayName: 'Account ID',
								name: 'accountId',
								type: 'string',
								default: '',
								required: true,
								placeholder: 'e.g. ACCO_XXXX-XXXX-...',
								description: 'PagBank account ID of the receiver',
							},
							{
								displayName: 'Amount or Percentage',
								name: 'amountValue',
								type: 'number',
								default: 0,
								required: true,
								description:
									'For FIXED: value in cents (must sum to order total). For PERCENTAGE: integer percent (must sum to 100).',
							},
							{
								displayName: 'Reason',
								name: 'reason',
								type: 'string',
								default: '',
								placeholder: 'e.g. Marketplace commission',
								description: 'Optional description shown in the split',
							},
							{
								displayName: 'Receiver Type',
								name: 'receiverType',
								type: 'options',
								options: [
									{ name: '(unspecified)', value: '' },
									{ name: 'Primary', value: 'PRIMARY' },
									{ name: 'Secondary', value: 'SECONDARY' },
								],
								default: '',
								description: 'Optional. Primary vs secondary seller role',
							},
							{
								displayName: 'Custody Apply',
								name: 'custodyApply',
								type: 'boolean',
								default: false,
								description:
									'If true, custody rules apply to this receiver (see release date below)',
							},
							{
								displayName: 'Custody Release (ISO 8601)',
								name: 'custodyReleaseScheduled',
								type: 'string',
								default: '',
								placeholder: 'e.g. 2026-10-30T07:22:37+00:00',
								description:
									'When money is released to this receiver if custody applies (future date, max 365 days from default policy)',
							},
							{
								displayName: 'Chargeback %',
								name: 'chargebackPercentage',
								type: 'string',
								default: '',
								placeholder: 'e.g. 0 or 100',
								description:
									'Optional. 0–100 per receiver (chargeback allocation). Leave empty to omit. Only one receiver may be 100.',
							},
							{
								displayName: 'Liable (MCC)',
								name: 'liable',
								type: 'boolean',
								default: false,
								description:
									'Credit card only: use secondary seller MCC for compliance. Ignored for PIX.',
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
								placeholder: 'e.g. 4111111111111111',
								description: 'Credit card number',
								},
							{
								displayName: 'Cardholder Name',
								name: 'holder',
								type: 'string',
								default: '',
								required: true,
								placeholder: 'e.g. John Smith',
								description: 'Name as it appears on the card',
								},
							{
								displayName: 'Expiration Month',
								name: 'expMonth',
								type: 'string',
								default: '',
								required: true,
								placeholder: 'e.g. 12',
								description: 'Expiration month (MM)',
								},
							{
								displayName: 'Expiration Year',
								name: 'expYear',
								type: 'string',
								default: '',
								required: true,
								placeholder: 'e.g. 2025',
								description: 'Expiration year (YYYY)',
								},
							{
								displayName: 'Security Code',
								name: 'securityCode',
								type: 'string',
								default: '',
								required: true,
								placeholder: 'e.g. 123',
								description: 'Card CVV/CVC',
								},
						],
					},
				],
			},
			{
				displayName: 'Order ID',
				name: 'orderId',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'e.g. ORD123456789',
				description: 'Order ID to query',
				displayOptions: {
					show: {
						operation: ['getOrderStatus'],
					},
				},
			},
			{
				displayName: 'Split ID',
				name: 'splitId',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'e.g. SPLI_03FF3600-39BB-4873-B31A-0C9EF5912D59 or paste SPLIT href',
				description:
					'Get Split Details: with sandbox Connect key, SPLI_ id uses unauthenticated GET on internal.sandbox; with production key, Connect API (ws.pbintegracoes.com). Optional: paste full internal sandbox SPLIT URL. Release Custody: always Connect API.',
				displayOptions: {
					show: {
						operation: ['getSplitDetails', 'releaseSplitCustody'],
					},
				},
			},
			{
				displayName: 'Custody Release — Account IDs',
				name: 'custodyReleaseAccounts',
				type: 'fixedCollection',
				default: {},
				placeholder: 'Add account',
				description:
					'Sellers (PagBank account ids) to release custody for before the scheduled date',
				typeOptions: {
					multipleValues: true,
				},
				displayOptions: {
					show: {
						operation: ['releaseSplitCustody'],
					},
				},
				options: [
					{
						displayName: 'Account',
						name: 'accountProperties',
						values: [
							{
								displayName: 'Account ID',
								name: 'accountId',
								type: 'string',
								default: '',
								required: true,
								placeholder: 'e.g. ACCO_F608816F-8C91-4DAF-B3B8-B8FC251EDCE7',
								description: 'PagBank account id of the receiver',
							},
						],
					},
				],
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						operation: [
							'createPaymentLink',
							'createPixOrder',
							'createCreditCardCharge',
							'getOrderStatus',
							'validateConnectKey',
							'getSplitDetails',
							'releaseSplitCustody',
						],
					},
				},
				options: [
					{
						displayName: 'Reference ID',
						name: 'referenceId',
						type: 'string',
						default: '',
						placeholder: 'e.g. order123',
						description: 'Unique ID to identify the order in your system',
					},
					{
						displayName: 'Redirect URL',
						name: 'redirectUrl',
						type: 'string',
						default: '',
						placeholder: 'e.g. https://example.com/success',
						description: 'URL where the customer will be redirected after payment',
					},
					{
						displayName: 'Notification URL',
						name: 'notificationUrl',
						type: 'string',
						default: '',
						placeholder: 'e.g. https://example.com/webhook',
						description: 'URL to receive payment notifications (maximum 100 characters)',
					},
					{
						displayName: 'Installments',
						name: 'installments',
						type: 'number',
						default: 1,
						description: 'Number of installments (1 to 12)',
					},
					{
						displayName: 'Statement Descriptor',
						name: 'softDescriptor',
						type: 'string',
						default: '',
						placeholder: 'e.g. MyCompany',
						description: 'Name that will appear on customer statement (maximum 13 characters)',
					},
					{
						displayName: 'Simplify',
						name: 'simplify',
						type: 'boolean',
						default: true,
						description: 'Whether to return a simplified version of the response instead of the raw data',
					},
				],
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
				} else if (operation === 'getSplitDetails') {
					responseData = await nodeInstance.getSplitDetails.call(this, i);
				} else if (operation === 'releaseSplitCustody') {
					responseData = await nodeInstance.releaseSplitCustody.call(this, i);
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
		const additionalFields = this.getNodeParameter('additionalFields', itemIndex) as any;
		const referenceId = additionalFields?.referenceId as string;
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
		const redirectUrl = additionalFields?.redirectUrl as string;
		const notificationUrl = additionalFields?.notificationUrl as string;

		const body: any = {
			reference_id: referenceId || `PEDIDO-${Date.now()}`,
			items: items.map((item: any, index: number) => ({
				reference_id: item.reference_id || `ITEM-${index + 1}`,
				name: item.name,
				quantity: item.quantity,
				unit_amount: item.unit_amount,
			})),
			payment_methods: paymentMethods.map(method => ({ type: method })),
		};

		// Only include customer for payment link if at least one field is provided
		if (customerName || customerEmail || customerTaxId) {
			body.customer = {};
			if (customerName) {
				body.customer.name = customerName;
			}
			if (customerEmail) {
				body.customer.email = customerEmail;
			}
			if (customerTaxId) {
				body.customer.tax_id = customerTaxId.replace(/\D/g, '');
			}
		}

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
		const additionalFields = this.getNodeParameter('additionalFields', itemIndex) as any;
		const referenceId = additionalFields?.referenceId as string;
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
		
		const notificationUrl = additionalFields?.notificationUrl as string;

		const credentials = await this.getCredentials('pagBankConnect');
		if (!credentials) {
			throw new NodeOperationError(this.getNode(), 'PagBank credentials not found');
		}
		
		const connectKey = (credentials as any).connectKey;
		if (!connectKey) {
			throw new NodeOperationError(this.getNode(), 'Connect Key not found in credentials');
		}

		const orderTotalCents = items.reduce(
			(total: number, item: any) => total + item.unit_amount * item.quantity,
			0,
		);

		const splitMethod = this.getNodeParameter('splitMethod', itemIndex) as SplitMethod;
		const splitReceiversData = this.getNodeParameter('splitReceivers', itemIndex) as any;
		const splitRows = splitReceiversData?.splitReceiverProperties as any[] | undefined;

		let splitsPayload: ReturnType<typeof buildOrderSplitsPayload>;
		try {
			splitsPayload = buildOrderSplitsPayload(splitMethod, splitRows, orderTotalCents, {
				includeLiable: false,
			});
		} catch (e: any) {
			throw new NodeOperationError(this.getNode(), e.message || 'Invalid split configuration');
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
						value: orderTotalCents,
						currency: 'BRL',
					},
				},
			],
		};

		if (splitsPayload) {
			body.qr_codes[0].splits = splitsPayload;
		}

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

	private async getSplitDetails(this: IExecuteFunctions, itemIndex: number): Promise<any> {
		const raw = this.getNodeParameter('splitId', itemIndex) as string;

		const sandboxPublicUrl = tryInternalSandboxSplitPublicUrl(raw);
		if (sandboxPublicUrl) {
			try {
				return await this.helpers.httpRequest({
					method: 'GET',
					url: sandboxPublicUrl,
					json: true,
					headers: {
						Accept: 'application/json',
					},
				});
			} catch (error: any) {
				const msg = error?.message || 'Request failed';
				throw new NodeOperationError(this.getNode(), `Sandbox split GET failed: ${msg}`);
			}
		}

		const credentials = await this.getCredentials('pagBankConnect');
		if (!credentials) {
			throw new NodeOperationError(this.getNode(), 'PagBank credentials not found');
		}
		const connectKey = (credentials as any).connectKey as string;
		if (!connectKey) {
			throw new NodeOperationError(this.getNode(), 'Connect Key not found in credentials');
		}

		const splitId = normalizeSplitId(raw);
		if (!splitId || !/^SPLI_[A-F0-9-]+$/i.test(splitId)) {
			throw new NodeOperationError(
				this.getNode(),
				'Split ID is required (expected SPLI_… or a SPLIT href containing /splits/SPLI_…)',
			);
		}

		if (isSandboxConnectKey(connectKey)) {
			const url = `${INTERNAL_SANDBOX_SPLITS_BASE}/${encodeURIComponent(splitId)}`;
			try {
				return await this.helpers.httpRequest({
					method: 'GET',
					url,
					json: true,
					headers: {
						Accept: 'application/json',
					},
				});
			} catch (error: any) {
				const msg = error?.message || 'Request failed';
				throw new NodeOperationError(this.getNode(), `Sandbox split GET failed: ${msg}`);
			}
		}

		const encoded = encodeURIComponent(splitId);
		return await pagBankConnectRequest.call(this, 'GET', `/connect/ws/splits/${encoded}`);
	}

	private async releaseSplitCustody(this: IExecuteFunctions, itemIndex: number): Promise<any> {
		const raw = this.getNodeParameter('splitId', itemIndex) as string;
		const splitId = normalizeSplitId(raw);
		if (!splitId || !/^SPLI_[A-F0-9-]+$/i.test(splitId)) {
			throw new NodeOperationError(
				this.getNode(),
				'Split ID is required (expected SPLI_… or a SPLIT href containing /splits/SPLI_…)',
			);
		}

		const accountsData = this.getNodeParameter('custodyReleaseAccounts', itemIndex) as any;
		const rows = accountsData?.accountProperties as any[] | undefined;
		if (!rows || !Array.isArray(rows) || rows.length === 0) {
			throw new NodeOperationError(
				this.getNode(),
				'Add at least one account under Custody Release — Account IDs',
			);
		}

		const receivers: { account: { id: string } }[] = [];
		for (const row of rows) {
			const id = (row.accountId || '').toString().trim();
			if (!id) {
				throw new NodeOperationError(this.getNode(), 'Each account entry must have an Account ID');
			}
			receivers.push({ account: { id } });
		}

		const body = { receivers };
		const encoded = encodeURIComponent(splitId);
		return await pagBankConnectRequest.call(
			this,
			'POST',
			`/connect/ws/splits/${encoded}/custody/release`,
			body,
		);
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
			environment: isSandboxConnectKey(connectKey) ? 'Sandbox' : 'Produção',
			validatedAt: new Date().toISOString(),
		};
	}

	private async createCreditCardCharge(this: IExecuteFunctions, itemIndex: number): Promise<any> {
		const additionalFields = this.getNodeParameter('additionalFields', itemIndex) as any;
		const referenceId = additionalFields?.referenceId as string;
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
		
		const notificationUrl = additionalFields?.notificationUrl as string;
		const cardData = this.getNodeParameter('cardData.card', itemIndex) as any;
		const installments = additionalFields?.installments as number || 1;
		const softDescriptor = additionalFields?.softDescriptor as string;

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

		const orderTotalCents = items.reduce(
			(total: number, item: any) => total + item.unit_amount * item.quantity,
			0,
		);

		const splitMethod = this.getNodeParameter('splitMethod', itemIndex) as SplitMethod;
		const splitReceiversData = this.getNodeParameter('splitReceivers', itemIndex) as any;
		const splitRows = splitReceiversData?.splitReceiverProperties as any[] | undefined;

		let splitsPayload: ReturnType<typeof buildOrderSplitsPayload>;
		try {
			splitsPayload = buildOrderSplitsPayload(splitMethod, splitRows, orderTotalCents, {
				includeLiable: true,
			});
		} catch (e: any) {
			throw new NodeOperationError(this.getNode(), e.message || 'Invalid split configuration');
		}

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
						value: orderTotalCents,
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

		if (splitsPayload) {
			body.charges[0].splits = splitsPayload;
		}

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
				`Missing required card data fields: ${missingFields.join(', ')}`,
				{
					description: 'Please fill in all required card information fields to complete the payment.',
				}
			);
		}
		
		// Validate card number format (basic validation)
		const cardNumber = cardInfo.number.toString().replace(/\s/g, '');
		if (!/^\d{13,19}$/.test(cardNumber)) {
			throw new NodeOperationError(
				this.getNode(), 
				'Invalid card number format',
				{
					description: 'Card number must contain 13-19 digits. Please check the card number and try again.',
				}
			);
		}
		
		// Validate expiration month
		const expMonth = parseInt(cardInfo.exp_month.toString());
		if (expMonth < 1 || expMonth > 12) {
			throw new NodeOperationError(
				this.getNode(), 
				'Invalid expiration month',
				{
					description: 'Month must be between 1 and 12. Please check the expiration month and try again.',
				}
			);
		}
		
		// Validate expiration year
		const expYear = parseInt(cardInfo.exp_year.toString());
		const currentYear = new Date().getFullYear();
		if (expYear < currentYear || expYear > currentYear + 20) {
			throw new NodeOperationError(
				this.getNode(), 
				'Invalid expiration year',
				{
					description: `Year must be between ${currentYear} and ${currentYear + 20}. Please check the expiration year and try again.`,
				}
			);
		}
		
		// Validate security code
		const securityCode = cardInfo.security_code.toString();
		if (!/^\d{3,4}$/.test(securityCode)) {
			throw new NodeOperationError(
				this.getNode(), 
				'Invalid security code',
				{
					description: 'Security code must contain 3 or 4 digits. Please check the CVV/CVC and try again.',
				}
			);
		}
		
		// Validate holder name
		const holder = cardInfo.holder.toString().trim();
		if (holder.length < 2) {
			throw new NodeOperationError(
				this.getNode(), 
				'Invalid card holder name',
				{
					description: 'Name must contain at least 2 characters. Please check the cardholder name and try again.',
				}
			);
		}
		
		try {
			// Use the real PagBank encryption library
			// Logger is optional - pass undefined if not available
			const logger = undefined; // Logger not directly available in IExecuteFunctions context
			const encryptedToken = encryptCard({
				publicKey: publicKey,
				holder: holder,
				number: cardNumber,
				expMonth: expMonth.toString().padStart(2, '0'),
				expYear: expYear.toString(),
				securityCode: securityCode
			}, logger);
			
			return encryptedToken;
			
		} catch (error: any) {
			throw new NodeOperationError(
				this.getNode(), 
				`Failed to encrypt card data: ${error.message}`
			);
		}
	}
}


