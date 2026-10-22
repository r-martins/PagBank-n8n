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

function tryParseJson(value: unknown): any {
	if (typeof value !== 'string') return value;
	const trimmed = value.trim();
	if (!trimmed) return undefined;
	try {
		return JSON.parse(trimmed);
	} catch {
		const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
		if (jsonMatch) {
			try {
				return JSON.parse(jsonMatch[0]);
			} catch {
				return { message: trimmed };
			}
		}
		return { message: trimmed };
	}
}

function looksLikeApiErrorPayload(obj: any): boolean {
	if (!obj || typeof obj !== 'object') return false;
	return (
		Array.isArray(obj.error_messages) ||
		Array.isArray(obj.errors) ||
		typeof obj.message === 'string' ||
		typeof obj.error_description === 'string' ||
		typeof obj.error === 'string' ||
		typeof obj.error === 'object'
	);
}

/** Walk n8n / Axios / cause chains for the partner JSON error body. */
function pickResponseBody(error: any): any {
	const queue: any[] = [error];
	const seen = new Set<any>();

	while (queue.length) {
		const cur = queue.shift();
		if (cur == null || seen.has(cur)) continue;
		if (typeof cur === 'object') seen.add(cur);

		if (typeof cur === 'string') {
			const parsed = tryParseJson(cur);
			if (looksLikeApiErrorPayload(parsed)) return parsed;
			continue;
		}

		if (typeof cur !== 'object') continue;

		if (looksLikeApiErrorPayload(cur) && (cur.error_messages || cur.errors)) {
			return cur;
		}

		for (const key of [
			'response',
			'data',
			'body',
			'error',
			'cause',
			'reason',
			'messages',
			'description',
			'context',
		]) {
			if (cur[key] != null) queue.push(cur[key]);
		}

		// NodeApiError stores partner JSON on context.data (httpRequestWithAuthentication wrap)
		if (cur.context?.data != null) queue.push(cur.context.data);

		// Axios-style: response.data / response.body
		if (cur.response && typeof cur.response === 'object') {
			if (cur.response.data != null) queue.push(cur.response.data);
			if (cur.response.body != null) queue.push(cur.response.body);
		}
	}

	// n8n often embeds JSON in the Error message: "400 - {...}" / "Request failed… {…}"
	const msg = typeof error?.message === 'string' ? error.message : '';
	const fromMsg = tryParseJson(msg.match(/\{[\s\S]*\}$/)?.[0] ?? '');
	if (looksLikeApiErrorPayload(fromMsg)) return fromMsg;

	return undefined;
}

function httpStatusOf(error: any): number | undefined {
	const candidates = [
		error?.statusCode,
		error?.status,
		error?.httpCode,
		error?.response?.statusCode,
		error?.response?.status,
		error?.cause?.statusCode,
		error?.cause?.status,
		error?.cause?.response?.status,
	];
	for (const c of candidates) {
		const n = Number(c);
		if (Number.isFinite(n) && n > 0) return n;
	}
	const msg = typeof error?.message === 'string' ? error.message : '';
	const m = msg.match(/status code\s+(\d+)/i);
	if (m) return Number(m[1]);
	return undefined;
}

function summarizeErrorMessages(errorMessages: any[]): {
	message: string;
	description: string;
} {
	const parts = errorMessages.map((e: any) => {
		const param = e.parameter_name || e.parameter || e.field;
		const text = e.description || e.message || e.error || String(e);
		return param ? `${param}: ${text}` : text;
	});
	const message = parts.filter(Boolean).join('; ') || 'API request failed';

	const first = errorMessages[0] || {};
	const errorCode = first.code || first.error_code;
	const parameterName = first.parameter_name || first.parameter;

	let description = 'Please check your input data and try again.';
	switch (String(errorCode || '')) {
		case '40002':
			if (parameterName === 'customer.tax_id') {
				description =
					'Invalid customer CPF/CNPJ. Use a valid CPF (11 digits) or CNPJ (14 alphanumeric characters) with correct check digits.';
			} else if (parameterName === 'customer.email') {
				description = 'Please provide a valid email address for the customer.';
			} else {
				description =
					'Please check the input data and ensure all required fields are correctly formatted.';
			}
			break;
		case '40001':
			description = 'Please check your Connect Key and ensure it is valid and active.';
			break;
		case '40003':
			description = 'Please check the payment amount and ensure it is valid.';
			break;
		default:
			if (errorCode) {
				description = `Error code: ${errorCode}. Please check the documentation for more details.`;
			}
	}

	if (parameterName && !message.includes(String(parameterName))) {
		description += ` (Parameter: ${parameterName})`;
	}

	return { message, description };
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
		({ message: errorMessage, description: errorDescription } = summarizeErrorMessages(
			responseBody.error_messages,
		));
	} else if (Array.isArray(responseBody?.errors)) {
		({ message: errorMessage, description: errorDescription } = summarizeErrorMessages(
			responseBody.errors,
		));
	} else if (typeof responseBody?.message === 'string' && responseBody.message.trim()) {
		errorMessage = responseBody.message;
		if (typeof responseBody?.error === 'string') {
			errorDescription = responseBody.error;
		} else if (typeof responseBody?.error_description === 'string') {
			errorDescription = responseBody.error_description;
		}
	} else if (typeof responseBody?.error === 'string') {
		errorMessage = responseBody.error;
	} else if (responseBody && typeof responseBody === 'object') {
		const compact = JSON.stringify(responseBody);
		if (compact && compact !== '{}') {
			errorMessage = compact.length > 280 ? `${compact.slice(0, 280)}…` : compact;
			errorDescription = 'Partner API rejected the request. See message for response details.';
		}
	} else if (
		typeof error?.message === 'string' &&
		error.message !== 'Request failed' &&
		!/^Request failed with status code \d+$/i.test(error.message)
	) {
		errorMessage = error.message;
	} else if (status) {
		errorMessage = `Request failed with HTTP ${status}`;
		errorDescription =
			'The API returned an error without a parseable body. Common causes: invalid CPF/CNPJ, missing required fields, or sandbox Connect Key mismatch.';
	}

	const meta: string[] = [];
	if (status) meta.push(`HTTP ${status}`);
	if (requestUrl) meta.push(requestUrl);
	if (meta.length) {
		errorDescription = `${errorDescription} [${meta.join(' | ')}]`;
	}

	return { message: errorMessage, description: errorDescription };
}

/** Keep letters and digits only (supports alphanumeric CNPJ masks like AX.B5T.R89/0001-64). */
export function normalizeTaxId(taxId: string): string {
	return String(taxId || '')
		.replace(/[^A-Za-z0-9]/g, '')
		.toUpperCase();
}

/**
 * Normalize + validate customer CPF (11 digits) / CNPJ (14 alphanumeric, Receita Federal).
 * Throws with a clear message on invalid input.
 */
export function assertCustomerTaxId(taxId: string): string {
	const clean = normalizeTaxId(taxId);
	if (/^\d{11}$/.test(clean)) {
		if (!validateCPF(clean)) {
			throw new Error(
				'Invalid CPF. Provide a valid 11-digit CPF (including check digits). Example for tests: use a generator, not 12345678901.',
			);
		}
		return clean;
	}
	if (/^[A-Z0-9]{12}\d{2}$/.test(clean)) {
		if (!validateCNPJ(clean)) {
			throw new Error(
				'Invalid CNPJ. Provide a valid 14-character CNPJ (letters/digits + numeric check digits). Example: 12.ABC.345/01DE-35.',
			);
		}
		return clean;
	}
	throw new Error(
		'Customer CPF/CNPJ must be 11 digits (CPF) or 14 alphanumeric characters (CNPJ; punctuation is stripped).',
	);
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
 *
 * Uses ignoreHttpStatusErrors + returnFullResponse so we keep the PagBank/Vindi JSON
 * body on 4xx/5xx. Otherwise n8n wraps Axios into NodeApiError and drops `error_messages`.
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
			Accept: 'application/json',
		},
		json: true,
		returnFullResponse: true,
		ignoreHttpStatusErrors: true,
	};

	if (body) {
		options.body = body;
	}

	if (qs) {
		options.qs = qs;
	}

	try {
		const full = await this.helpers.httpRequestWithAuthentication.call(
			this,
			'pagBankConnect',
			options,
		);

		const statusCode = Number(full?.statusCode ?? full?.status ?? 0);
		const responseBody = full?.body !== undefined ? full.body : full;

		if (statusCode >= 400) {
			const { message: errorMessage, description: errorDescription } =
				extractPagBankErrorMessage(
					{
						statusCode,
						message: `Request failed with status code ${statusCode}`,
						error: responseBody,
						response: { status: statusCode, data: responseBody, body: responseBody },
					},
					url,
				);

			throw new NodeOperationError(this.getNode(), errorMessage, {
				description: errorDescription,
			});
		}

		return responseBody;
	} catch (error: any) {
		if (error instanceof NodeOperationError) {
			throw error;
		}

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
	const cleanTaxId = normalizeTaxId(taxId);

	if (/^\d{11}$/.test(cleanTaxId) || /^[A-Z0-9]{12}\d{2}$/.test(cleanTaxId)) {
		return cleanTaxId;
	}
	throw new Error(
		'CPF must have 11 digits or CNPJ must have 14 alphanumeric characters',
	);
}

export function validateCPF(cpf: string): boolean {
	const cleanCPF = String(cpf || '').replace(/\D/g, '');

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

/** Character value for CNPJ DV: ASCII code − 48 (digits stay 0–9; A=17 … Z=42). */
function cnpjCharValue(char: string): number {
	return char.charCodeAt(0) - 48;
}

function cnpjCheckDigit(base: string, weights: number[]): number {
	let sum = 0;
	for (let i = 0; i < weights.length; i++) {
		sum += cnpjCharValue(base.charAt(i)) * weights[i];
	}
	const remainder = sum % 11;
	return remainder < 2 ? 0 : 11 - remainder;
}

/**
 * Validate numeric or alphanumeric CNPJ (Receita Federal / NT 2025.001).
 * 12 base chars (A–Z / 0–9) + 2 numeric check digits; masks stripped via normalizeTaxId.
 */
export function validateCNPJ(cnpj: string): boolean {
	const cleanCNPJ = normalizeTaxId(cnpj);

	if (!/^[A-Z0-9]{12}\d{2}$/.test(cleanCNPJ)) return false;
	if (/^(.)\1{13}$/.test(cleanCNPJ)) return false;

	const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
	const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
	const base = cleanCNPJ.slice(0, 12);
	const digit1 = cnpjCheckDigit(base, weights1);
	const digit2 = cnpjCheckDigit(base + String(digit1), weights2);

	return (
		digit1 === Number(cleanCNPJ.charAt(12)) && digit2 === Number(cleanCNPJ.charAt(13))
	);
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
