/**
 * Vindi public payment_profiles tokenization (n8n-compatible).
 * Mirrors browser JS used by Woo/GHL: Basic auth with public API key → gateway_token.
 */

export function detectVindiPaymentCompanyCode(cardNumber: string): string {
	const number = String(cardNumber || '').replace(/\D/g, '');
	if (!number) return 'mastercard';

	const elo = new RegExp(
		'^((451416)|(509091)|(636368)|(636297)|(504175)|(438935)|(40117[8-9])|(45763[1-2])|' +
			'(457393)|(431274)|(50990[0-2])|(5099[7-9][0-9])|(50996[4-9])|(509[1-8][0-9][0-9])|' +
			'(5090(0[0-2]|0[4-9]|1[2-9]|[24589][0-9]|3[1-9]|6[0-46-9]|7[0-24-9]))|' +
			'(5067(0[0-24-8]|1[0-24-9]|2[014-9]|3[0-379]|4[0-9]|5[0-3]|6[0-5]|7[0-8]))|' +
			'(6504(0[5-9]|1[0-9]|2[0-9]|3[0-9]))|' +
			'(6504(8[5-9]|9[0-9])|6505(0[0-9]|1[0-9]|2[0-9]|3[0-8]))|' +
			'(6505(4[1-9]|5[0-9]|6[0-9]|7[0-9]|8[0-9]|9[0-8]))|' +
			'(6507(0[0-9]|1[0-8]))|(65072[0-7])|(6509(0[1-9]|1[0-9]|20))|' +
			'(6516(5[2-9]|6[0-9]|7[0-9]))|(6550(0[0-9]|1[0-9]))|' +
			'(6550(2[1-9]|3[0-9]|4[0-9]|5[0-8])))\\d*$',
	);
	const hipercard = /^((606282)|(637095)|(637568)|(637599)|(637609)|(637612))\d*$/;
	const amex = /^3[47]\d*$/;
	const diners = /^(3(0[0-5]|095|6|[8-9]))\d*$/;
	const jcb = /^(?:2131|1800|35\d{3})\d*$/;
	const mastercard =
		/^(?:5[1-5][0-9]{2}|222[1-9]|22[3-9][0-9]|2[3-6][0-9]{2}|27[01][0-9]|2720)\d*$/;
	const visa = /^4\d*$/;

	if (elo.test(number)) return 'elo';
	if (hipercard.test(number)) return 'hipercard';
	if (amex.test(number)) return 'american_express';
	if (diners.test(number)) return 'diners_club';
	if (jcb.test(number)) return 'jcb';
	if (mastercard.test(number)) return 'mastercard';
	if (visa.test(number)) return 'visa';
	return 'mastercard';
}

export interface VindiTokenizeInput {
	publicApiKey: string;
	profilesUrl: string;
	holderName: string;
	number: string;
	expMonth: string | number;
	expYear: string | number;
	cvv: string;
}

export interface VindiTokenizeResult {
	gatewayToken: string;
	company: string;
	requestBody: Record<string, string>;
	basicAuthHeader: string;
}

/**
 * Build tokenize request payload + Basic header (no HTTP).
 * Callers POST with helpers.httpRequest to keep auth separate from Connect Bearer.
 */
export function buildVindiTokenizeRequest(input: VindiTokenizeInput): VindiTokenizeResult {
	const { publicApiKey, profilesUrl, holderName, number, expMonth, expYear, cvv } = input;

	if (!publicApiKey || !profilesUrl) {
		throw new Error('Vindi tokenize config missing (public key or payment_profiles_url).');
	}

	const month = String(expMonth || '')
		.replace(/\D/g, '')
		.padStart(2, '0')
		.slice(-2);
	let year = String(expYear || '').replace(/\D/g, '');
	if (year.length === 4) year = year.slice(-2);
	if (!/^(0[1-9]|1[0-2])$/.test(month) || !/^\d{2}$/.test(year)) {
		throw new Error('Invalid card expiration. Use MM and YY (or YYYY).');
	}

	const company = detectVindiPaymentCompanyCode(number);
	const basicAuthHeader = `Basic ${Buffer.from(`${publicApiKey}:`).toString('base64')}`;

	return {
		gatewayToken: '',
		company,
		basicAuthHeader,
		requestBody: {
			holder_name: holderName,
			card_expiration: `${month}/20${year}`,
			card_number: String(number).replace(/\s/g, ''),
			card_cvv: String(cvv).replace(/\s/g, ''),
			payment_method_code: 'credit_card',
			payment_company_code: company,
		},
	};
}

export function extractGatewayToken(body: any): string {
	const token =
		body?.payment_profile?.gateway_token ||
		body?.gateway_token ||
		body?.payment_profile?.token;
	if (!token || typeof token !== 'string') {
		throw new Error('Card tokenization succeeded but gateway_token was missing in the response.');
	}
	return token;
}

export function formatVindiTokenizeError(body: any): string {
	if (Array.isArray(body?.errors)) {
		const detail = body.errors
			.map((e: any) => (e.parameter ? `${e.parameter}: ` : '') + (e.message || ''))
			.filter(Boolean)
			.join('\n');
		return 'Failed to tokenize card.' + (detail ? `\n${detail}` : '');
	}
	if (typeof body?.message === 'string') {
		return `Failed to tokenize card: ${body.message}`;
	}
	return 'Failed to tokenize card.';
}
