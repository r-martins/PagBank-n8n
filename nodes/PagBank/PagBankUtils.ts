import {
	IExecuteFunctions,
	NodeOperationError,
} from 'n8n-workflow';

import {
	isSandboxConnectKey,
	isVindiKey,
	LogicalEndpoint,
	resolvePartnerUrl,
} from './partner';

export { isSandboxConnectKey } from './partner';

const NOTIFICATION_URL_PROXY_THRESHOLD = 100;

/**
 * Attach notification_urls to an order/checkout body.
 * PagBank native limit is 100 chars; longer URLs (typical ngrok/n8n) need
 * `enable_proxy: true` so PB Integrações bridges via its short proxy URL.
 * Vindi always uses the proxy (same as Woo Capabilities.forceNotificationProxy).
 */
export function applyNotificationUrl(
	body: Record<string, any>,
	notificationUrl: string | undefined | null,
	connectKey?: string | null,
): void {
	if (!notificationUrl || !String(notificationUrl).trim()) {
		return;
	}
	const url = String(notificationUrl).trim();
	body.notification_urls = [url];
	if (isVindiKey(connectKey) || url.length > NOTIFICATION_URL_PROXY_THRESHOLD) {
		body.enable_proxy = true;
	}
}

/**
 * Internal sandbox split resource (no Connect auth). Kept in Utils so call sites
 * do not pair `getCredentials` with `httpRequest` (n8n community-package scan).
 */
export async function pagBankInternalSandboxSplitGet(
	this: IExecuteFunctions,
	url: string,
): Promise<any> {
	return await this.helpers.httpRequest({
		method: 'GET',
		url,
		json: true,
		headers: {
			Accept: 'application/json',
		},
	});
}

/** Raw HTTP without Connect Bearer (e.g. Vindi public payment_profiles Basic auth). */
export async function pagBankRawHttpRequest(
	this: IExecuteFunctions,
	options: {
		method: string;
		url: string;
		body?: any;
		headers?: Record<string, string>;
	},
): Promise<any> {
	return await this.helpers.httpRequest({
		method: options.method as any,
		url: options.url,
		body: options.body,
		json: true,
		headers: {
			'Content-Type': 'application/json',
			Accept: 'application/json',
			...(options.headers || {}),
		},
	});
}

function pickResponseBody(error: any): any {
	const candidates = [
		error?.response?.body,
		error?.response?.data,
		error?.cause?.response?.body,
		error?.cause?.response?.data,
		error?.error,
		error?.cause?.error,
		error?.description,
	];
	for (const c of candidates) {
		if (c == null) continue;
		if (typeof c === 'string') {
			try {
				return JSON.parse(c);
			} catch {
				return { message: c };
			}
		}
		if (typeof c === 'object') return c;
	}
	// n8n often puts JSON in the Error message: "400 - {...}"
	const msg = typeof error?.message === 'string' ? error.message : '';
	const jsonMatch = msg.match(/\{[\s\S]*\}$/);
	if (jsonMatch) {
		try {
			return JSON.parse(jsonMatch[0]);
		} catch {
			/* ignore */
		}
	}
	return undefined;
}

function httpStatusOf(error: any): number | undefined {
	return (
		error?.statusCode ||
		error?.status ||
		error?.httpCode ||
		error?.response?.statusCode ||
		error?.response?.status ||
		error?.cause?.statusCode ||
		error?.cause?.status
	);
}

/** Helper to extract PagBank / PB v1 / n8n HTTP error messages */
function extractPagBankErrorMessage(
	error: any,
	requestUrl?: string,
): { message: string; description: string } {
	let errorMessage = 'Request failed';
	let errorDescription = 'Please check your input data and try again.';
	const responseBody = pickResponseBody(error);
	const status = httpStatusOf(error);

	if (responseBody?.error_messages && Array.isArray(responseBody.error_messages)) {
		const firstError = responseBody.error_messages[0];
		errorMessage = firstError.description || firstError.message || 'API request failed';

		const errorCode = firstError.code || 'Unknown';
		const parameterName = firstError.parameter_name;

		switch (errorCode) {
			case '40002':
				if (parameterName === 'customer.tax_id') {
					errorDescription =
						'Please provide a valid CPF (11 digits) or CNPJ (14 digits) for the customer.';
				} else if (parameterName === 'customer.email') {
					errorDescription = 'Please provide a valid email address for the customer.';
				} else {
					errorDescription =
						'Please check the input data and ensure all required fields are correctly formatted.';
				}
				break;
			case '40001':
				errorDescription = 'Please check your Connect Key and ensure it is valid and active.';
				break;
			case '40003':
				errorDescription = 'Please check the payment amount and ensure it is valid.';
				break;
			default:
				errorDescription = `Error code: ${errorCode}. Please check the documentation for more details.`;
		}

		if (parameterName) {
			errorDescription += ` (Parameter: ${parameterName})`;
		}
	} else if (Array.isArray(responseBody?.errors)) {
		errorMessage =
			responseBody.errors
				.map((e: any) => (e.parameter ? `${e.parameter}: ` : '') + (e.message || ''))
				.filter(Boolean)
				.join('; ') || 'API request failed';
		errorDescription = 'Please check the input data and try again.';
	} else if (typeof responseBody?.message === 'string') {
		errorMessage = responseBody.message;
		if (typeof responseBody?.error === 'string') {
			errorDescription = responseBody.error;
		}
	} else if (typeof responseBody?.error === 'string') {
		errorMessage = responseBody.error;
	} else if (typeof error?.message === 'string' && error.message !== 'Request failed') {
		errorMessage = error.message;
	}

	const meta: string[] = [];
	if (status) meta.push(`HTTP ${status}`);
	if (requestUrl) meta.push(requestUrl);
	if (meta.length) {
		errorDescription = `${errorDescription} [${meta.join(' | ')}]`;
	}

	return { message: errorMessage, description: errorDescription };
}

export async function getConnectKey(this: IExecuteFunctions): Promise<string> {
	const credentials = await this.getCredentials('pagBankConnect');

	if (!credentials) {
		throw new NodeOperationError(this.getNode(), 'PagBank Connect credentials not found');
	}

	return ((credentials as any).connectKey as string) || '';
}

/** Credential read + partner URL (no HTTP) — keeps community-nodes auth rules satisfied. */
async function pagBankResolveConnectRequestUrl(
	this: IExecuteFunctions,
	endpoint: LogicalEndpoint,
	id?: string,
): Promise<{ url: string; connectKey: string }> {
	const connectKey = await getConnectKey.call(this);
	const url = resolvePartnerUrl(connectKey, endpoint, id);
	return { url, connectKey };
}

/**
 * Authenticated request to PB Integrações (v7 or v1) based on Connect Key prefix.
 * `endpoint` is a logical resource — never pass raw paths with ?isSandbox=1.
 */
export async function pagBankConnectRequest(
	this: IExecuteFunctions,
	method: string,
	endpoint: LogicalEndpoint,
	body?: any,
	qs?: any,
	id?: string,
): Promise<any> {
	const { url } = await pagBankResolveConnectRequestUrl.call(this, endpoint, id);

	const options: any = {
		method,
		url,
		headers: {
			'Content-Type': 'application/json',
		},
		json: true,
	};

	if (body) {
		options.body = body;
	}

	if (qs) {
		options.qs = qs;
	}

	try {
		const response = await this.helpers.httpRequestWithAuthentication.call(
			this,
			'pagBankConnect',
			options,
		);
		return response;
	} catch (error: any) {
		const { message: errorMessage, description: errorDescription } =
			extractPagBankErrorMessage(error, url);

		throw new NodeOperationError(this.getNode(), errorMessage, {
			description: errorDescription,
		});
	}
}

/** Normalize n8n fixedCollection "Order Items" across UI shapes. */
export function parseOrderItems(itemsData: any): Array<{
	name: string;
	reference_id?: string;
	quantity: number;
	unit_amount: number;
}> {
	let rows: any[] = [];
	if (!itemsData) {
		rows = [];
	} else if (Array.isArray(itemsData)) {
		rows = itemsData;
	} else if (Array.isArray(itemsData.itemProperties)) {
		rows = itemsData.itemProperties;
	} else if (Array.isArray(itemsData.values)) {
		rows = itemsData.values;
	}

	return rows
		.map((item: any) => ({
			name: (item?.name || '').toString(),
			reference_id: item?.reference_id || undefined,
			quantity: Number(item?.quantity) || 1,
			unit_amount: Number(item?.unit_amount) || 0,
		}))
		.filter((item) => item.name || item.unit_amount > 0);
}

export async function validateConnectKey(
	this: IExecuteFunctions,
	_connectKey: string,
): Promise<{ isValid: boolean; status: string; message: string; accountInfo?: any }> {
	try {
		const response = await pagBankConnectRequest.call(this, 'GET', 'connectInfo');

		if (response.status === 'VALID') {
			return {
				isValid: true,
				status: 'VALID',
				message: 'Connect Key valid and active',
				accountInfo: response,
			};
		} else if (response.status === 'INVALID') {
			return {
				isValid: false,
				status: 'INVALID',
				message: 'Invalid Connect Key - personal account (BUYER) not allowed',
				accountInfo: response,
			};
		} else if (response.status === 'UNAUTHORIZED') {
			return {
				isValid: false,
				status: 'UNAUTHORIZED',
				message: 'Connect Key not authorized or expired',
				accountInfo: response,
			};
		} else if (response && (response.account_id || response.partner || response.email)) {
			// v1 connectInfo may not use status=VALID — treat presence of account fields as ok
			return {
				isValid: true,
				status: 'VALID',
				message: 'Connect Key valid and active',
				accountInfo: response,
			};
		} else {
			return {
				isValid: false,
				status: 'UNKNOWN',
				message: 'Unknown error validating Connect Key',
				accountInfo: response,
			};
		}
	} catch (error: any) {
		if (error.response?.status === 401) {
			return {
				isValid: false,
				status: 'UNAUTHORIZED',
				message: 'Invalid or expired Connect Key',
			};
		}

		return {
			isValid: false,
			status: 'UNKNOWN',
			message: `Error validating Connect Key: ${error.message}`,
		};
	}
}

export function validateRequiredFields(fields: Record<string, any>): void {
	const missingFields: string[] = [];

	for (const [fieldName, value] of Object.entries(fields)) {
		if (value === undefined || value === null || value === '') {
			missingFields.push(fieldName);
		}
	}

	if (missingFields.length > 0) {
		throw new Error(`Required fields not filled: ${missingFields.join(', ')}`);
	}
}

export function formatCurrency(value: number): string {
	return (value / 100).toFixed(2);
}

export function formatPhoneNumber(phone: string): string {
	return phone.replace(/\D/g, '');
}

export function formatTaxId(taxId: string): string {
	const cleanTaxId = taxId.replace(/\D/g, '');

	if (cleanTaxId.length === 11) {
		return cleanTaxId;
	} else if (cleanTaxId.length === 14) {
		return cleanTaxId;
	} else {
		throw new Error('CPF must have 11 digits or CNPJ must have 14 digits');
	}
}

export function validateCPF(cpf: string): boolean {
	const cleanCPF = cpf.replace(/\D/g, '');

	if (cleanCPF.length !== 11) return false;
	if (/^(\d)\1{10}$/.test(cleanCPF)) return false;

	let sum = 0;
	for (let i = 0; i < 9; i++) {
		sum += parseInt(cleanCPF.charAt(i)) * (10 - i);
	}
	let remainder = (sum * 10) % 11;
	if (remainder === 10 || remainder === 11) remainder = 0;
	if (remainder !== parseInt(cleanCPF.charAt(9))) return false;

	sum = 0;
	for (let i = 0; i < 10; i++) {
		sum += parseInt(cleanCPF.charAt(i)) * (11 - i);
	}
	remainder = (sum * 10) % 11;
	if (remainder === 10 || remainder === 11) remainder = 0;
	if (remainder !== parseInt(cleanCPF.charAt(10))) return false;

	return true;
}

export function validateCNPJ(cnpj: string): boolean {
	const cleanCNPJ = cnpj.replace(/\D/g, '');

	if (cleanCNPJ.length !== 14) return false;
	if (/^(\d)\1{13}$/.test(cleanCNPJ)) return false;

	const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
	const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

	let sum = 0;
	for (let i = 0; i < 12; i++) {
		sum += parseInt(cleanCNPJ.charAt(i)) * weights1[i];
	}
	let remainder = sum % 11;
	const digit1 = remainder < 2 ? 0 : 11 - remainder;
	if (digit1 !== parseInt(cleanCNPJ.charAt(12))) return false;

	sum = 0;
	for (let i = 0; i < 13; i++) {
		sum += parseInt(cleanCNPJ.charAt(i)) * weights2[i];
	}
	remainder = sum % 11;
	const digit2 = remainder < 2 ? 0 : 11 - remainder;
	if (digit2 !== parseInt(cleanCNPJ.charAt(13))) return false;

	return true;
}

export function formatBrazilianAddress(address: any): any {
	return {
		street: address.street,
		number: address.number,
		complement: address.complement,
		locality: address.locality,
		city: address.city,
		region: address.region,
		region_code: address.regionCode || address.region_code,
		country: address.country || 'BRA',
		postal_code: address.postalCode || address.postal_code,
	};
}

export function getPaymentStatusText(status: string): string {
	const statusMap: Record<string, string> = {
		PAID: 'Paid',
		WAITING: 'Waiting for Payment',
		DECLINED: 'Declined',
		CANCELED: 'Canceled',
		REFUNDED: 'Refunded',
		PENDING: 'Pending',
		ACTIVE: 'Active',
		INACTIVE: 'Inactive',
	};

	return statusMap[status] || status;
}

export function getPaymentMethodText(method: string): string {
	const methodMap: Record<string, string> = {
		CREDIT_CARD: 'Credit Card',
		CREDIT_CARD_3DS: 'Credit Card (3DS)',
		DEBIT_CARD: 'Debit Card',
		PIX: 'PIX',
		BOLETO: 'Bank Slip',
	};

	return methodMap[method] || method;
}

export function formatErrorResponse(error: any): string {
	if (error.error_messages && Array.isArray(error.error_messages)) {
		return error.error_messages
			.map(
				(msg: any) =>
					`${msg.parameter_name ? `${msg.parameter_name}: ` : ''}${msg.description}`,
			)
			.join('; ');
	}

	if (error.message) {
		return error.message;
	}

	return 'Unknown error';
}

export function sanitizeCardData(cardData: any): any {
	const sanitized = { ...cardData };
	delete sanitized.number;
	delete sanitized.securityCode;
	delete sanitized.encrypted;
	delete sanitized.gateway_token;
	return sanitized;
}

export function formatWebhookData(webhookData: any): any {
	return {
		orderId: webhookData.id,
		referenceId: webhookData.reference_id,
		status: webhookData.charges?.[0]?.status || webhookData.status,
		paymentMethod: webhookData.charges?.[0]?.payment_method?.type,
		amount: webhookData.charges?.[0]?.amount?.value,
		currency: webhookData.charges?.[0]?.amount?.currency,
		partner: webhookData.partner,
		partnerBillId: webhookData.partner_bill_id,
		event: webhookData.event,
		customer: webhookData.customer,
		items: webhookData.items,
		createdAt: webhookData.created_at,
		paidAt: webhookData.charges?.[0]?.paid_at,
		rawData: webhookData,
	};
}
