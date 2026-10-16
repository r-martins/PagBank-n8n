/**
 * Dual-partner routing for PagBank (CON…) vs Vindi (CONVD…).
 * No ?isSandbox=1 — v7 and v1 detect sandbox from the Connect Key prefix.
 */

export type Partner = 'pagbank' | 'vindi';

export const WS_V7_BASE = 'https://ws.pbintegracoes.com/pspro/v7';
export const API_V1_BASE = 'https://api.pbintegracoes.com/v1';

export function isVindiKey(key: string | undefined | null): boolean {
	if (!key || typeof key !== 'string') return false;
	return key.startsWith('CONVDSANDBOX') || key.startsWith('CONVD');
}

export function isPagBankSandboxKey(key: string | undefined | null): boolean {
	return typeof key === 'string' && key.startsWith('CONSANDBOX');
}

export function isVindiSandboxKey(key: string | undefined | null): boolean {
	return typeof key === 'string' && key.startsWith('CONVDSANDBOX');
}

/** True when key is any sandbox flavour (PagBank or Vindi). */
export function isSandboxConnectKey(key: string | undefined | null): boolean {
	return isPagBankSandboxKey(key) || isVindiSandboxKey(key);
}

export function getPartner(key: string | undefined | null): Partner {
	return isVindiKey(key) ? 'vindi' : 'pagbank';
}

export function getWsBaseUrl(): string {
	return WS_V7_BASE;
}

export function getApiV1BaseUrl(): string {
	return API_V1_BASE;
}

/** Base URL for partner-aware Connect requests (no trailing slash). */
export function getPartnerBaseUrl(connectKey: string | undefined | null): string {
	return isVindiKey(connectKey) ? getApiV1BaseUrl() : getWsBaseUrl();
}

export type LogicalEndpoint =
	| 'orders'
	| 'order'
	| 'connectInfo'
	| 'publicKeys'
	| 'tokenizeConfig'
	| 'checkouts'
	| 'split'
	| 'splitCustodyRelease'
	| 'chargeCancel';

/**
 * Resolve absolute URL for a logical API resource.
 * Callers must not append ?isSandbox=1.
 */
export function resolvePartnerUrl(
	connectKey: string | undefined | null,
	endpoint: LogicalEndpoint,
	id?: string,
): string {
	const vindi = isVindiKey(connectKey);

	switch (endpoint) {
		case 'orders':
			return vindi ? `${API_V1_BASE}/orders` : `${WS_V7_BASE}/connect/ws/orders`;
		case 'order': {
			const orderId = encodeURIComponent(id || '');
			return vindi
				? `${API_V1_BASE}/orders/${orderId}`
				: `${WS_V7_BASE}/connect/ws/orders/${orderId}`;
		}
		case 'connectInfo':
			return vindi
				? `${API_V1_BASE}/connectInfo`
				: `${WS_V7_BASE}/connect/connectInfo`;
		case 'publicKeys':
			if (vindi) {
				throw new Error('public-keys is PagBank-only; use tokenize/config for Vindi');
			}
			return `${WS_V7_BASE}/connect/ws/public-keys`;
		case 'tokenizeConfig':
			return `${API_V1_BASE}/tokenize/config`;
		case 'checkouts':
			if (vindi) {
				throw new Error(
					'Payment Link is not available for Vindi Connect Keys (CONVD…). Use PIX or Credit Card orders instead.',
				);
			}
			return `${WS_V7_BASE}/connect/ws/checkouts`;
		case 'split': {
			if (vindi) {
				throw new Error('Payment split is not available for Vindi Connect Keys (CONVD…).');
			}
			const splitId = encodeURIComponent(id || '');
			return `${WS_V7_BASE}/connect/ws/splits/${splitId}`;
		}
		case 'splitCustodyRelease': {
			if (vindi) {
				throw new Error('Payment split is not available for Vindi Connect Keys (CONVD…).');
			}
			const splitId = encodeURIComponent(id || '');
			return `${WS_V7_BASE}/connect/ws/splits/${splitId}/custody/release`;
		}
		case 'chargeCancel': {
			const chargeId = encodeURIComponent(id || '');
			return vindi
				? `${API_V1_BASE}/charges/${chargeId}/cancel`
				: `${WS_V7_BASE}/connect/ws/charges/${chargeId}/cancel`;
		}
		default:
			throw new Error(`Unknown endpoint: ${endpoint}`);
	}
}

export function assertPagBankOnlyOperation(
	connectKey: string | undefined | null,
	operationLabel: string,
): void {
	if (isVindiKey(connectKey)) {
		throw new Error(
			`${operationLabel} is not available for Vindi Connect Keys (CONVD… / CONVDSANDBOX…). Use a PagBank Connect Key (CON…) or choose PIX / Credit Card / Get Order Status.`,
		);
	}
}

export function assertNoSplitForVindi(
	connectKey: string | undefined | null,
	hasSplit: boolean,
): void {
	if (hasSplit && isVindiKey(connectKey)) {
		throw new Error(
			'Payment split is not available for Vindi Connect Keys (CONVD…). Remove Split Receivers or use a PagBank Connect Key.',
		);
	}
}

/** Prefer QRCODE.PNG link href (Vindi/PB v1); fall back to first image-like link. */
export function pickQrCodeImageHref(qrCode: any): string | undefined {
	if (!qrCode?.links || !Array.isArray(qrCode.links)) return undefined;
	const byRel = qrCode.links.find(
		(l: any) => typeof l?.rel === 'string' && l.rel.toUpperCase() === 'QRCODE.PNG',
	);
	if (byRel?.href) return byRel.href;
	const byMedia = qrCode.links.find(
		(l: any) => typeof l?.media === 'string' && l.media.includes('image'),
	);
	return byMedia?.href;
}
