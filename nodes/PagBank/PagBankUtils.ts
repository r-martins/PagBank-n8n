import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
	NodeOperationError,
} from 'n8n-workflow';

export interface PagBankConnectRequestOptions {
	method: string;
	url: string;
	body?: any;
	qs?: any;
	headers?: any;
}

export async function pagBankConnectRequest(
	this: IExecuteFunctions,
	method: string,
	endpoint: string,
	body?: any,
	qs?: any,
): Promise<any> {
	const credentials = await this.getCredentials('pagBankConnect');
	
	if (!credentials) {
		throw new NodeOperationError(this.getNode(), 'Credenciais do PagBank Connect não encontradas');
	}

	const baseURL = 'https://ws.pbintegracoes.com/pspro/v7';
	const connectKey = (credentials as any).connectKey;
	const isSandbox = connectKey && connectKey.startsWith('CONSANDBOX');
	
	let url = `${baseURL}${endpoint}`;
	if (isSandbox) {
		url += url.includes('?') ? '&isSandbox=1' : '?isSandbox=1';
	}

	const options: any = {
		method,
		url,
		headers: {
			'Authentication': `Bearer ${connectKey}`,
			'Platform': 'n8n',
			'Platform-Version': '1.113.3',
			'Module-Version': '1.0.0',
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
		const response = await this.helpers.request(options);
		return response;
	} catch (error: any) {
		if (error.response) {
			const errorMessage = error.response.body?.error_messages?.[0]?.description || 
								error.response.body?.message || 
								error.message;
			throw new NodeOperationError(this.getNode(), `Erro na API do PagBank Connect: ${errorMessage}`);
		}
		throw new NodeOperationError(this.getNode(), `Erro na requisição: ${error.message}`);
	}
}

export async function validateConnectKey(
	this: IExecuteFunctions,
	connectKey: string,
): Promise<{ isValid: boolean; status: string; message: string; accountInfo?: any }> {
	try {
		const baseURL = 'https://ws.pbintegracoes.com/pspro/v7';
		const isSandbox = connectKey.startsWith('CONSANDBOX');
		let url = `${baseURL}/connect/connectInfo`;
		if (isSandbox) {
			url += '?isSandbox=1';
		}

		const options: any = {
			method: 'GET',
			url,
			headers: {
				'Authentication': `Bearer ${connectKey}`,
				'Platform': 'n8n',
				'Platform-Version': '1.113.3',
				'Module-Version': '1.0.0',
			},
			json: true,
		};

		const response = await this.helpers.request(options);
		
		// Verificar status da resposta
		if (response.status === 'VALID') {
			return {
				isValid: true,
				status: 'VALID',
				message: 'Connect Key válida e ativa',
				accountInfo: response,
			};
		} else if (response.status === 'INVALID') {
			return {
				isValid: false,
				status: 'INVALID',
				message: 'Connect Key inválida - conta pessoal (BUYER) não é permitida',
				accountInfo: response,
			};
		} else if (response.status === 'UNAUTHORIZED') {
			return {
				isValid: false,
				status: 'UNAUTHORIZED',
				message: 'Connect Key não autorizada ou expirada',
				accountInfo: response,
			};
		} else {
			return {
				isValid: false,
				status: 'UNKNOWN',
				message: 'Erro desconhecido ao validar Connect Key',
				accountInfo: response,
			};
		}
	} catch (error: any) {
		if (error.response?.status === 401) {
			return {
				isValid: false,
				status: 'UNAUTHORIZED',
				message: 'Connect Key inválida ou expirada',
			};
		}
		
		return {
			isValid: false,
			status: 'UNKNOWN',
			message: `Erro ao validar Connect Key: ${error.message}`,
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
		throw new Error(`Campos obrigatórios não preenchidos: ${missingFields.join(', ')}`);
	}
}

export function formatCurrency(value: number): string {
	return (value / 100).toFixed(2);
}

export function formatPhoneNumber(phone: string): string {
	// Remove todos os caracteres não numéricos
	return phone.replace(/\D/g, '');
}

export function formatTaxId(taxId: string): string {
	// Remove todos os caracteres não numéricos
	const cleanTaxId = taxId.replace(/\D/g, '');
	
	// Valida se é CPF (11 dígitos) ou CNPJ (14 dígitos)
	if (cleanTaxId.length === 11) {
		return cleanTaxId; // CPF
	} else if (cleanTaxId.length === 14) {
		return cleanTaxId; // CNPJ
	} else {
		throw new Error('CPF deve ter 11 dígitos ou CNPJ deve ter 14 dígitos');
	}
}

export function validateCPF(cpf: string): boolean {
	const cleanCPF = cpf.replace(/\D/g, '');
	
	if (cleanCPF.length !== 11) return false;
	if (/^(\d)\1{10}$/.test(cleanCPF)) return false; // Todos os dígitos iguais
	
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
	if (/^(\d)\1{13}$/.test(cleanCNPJ)) return false; // Todos os dígitos iguais
	
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
		'PAID': 'Pago',
		'WAITING': 'Aguardando Pagamento',
		'DECLINED': 'Negado',
		'CANCELED': 'Cancelado',
		'REFUNDED': 'Estornado',
		'PENDING': 'Pendente',
		'ACTIVE': 'Ativo',
		'INACTIVE': 'Inativo',
	};

	return statusMap[status] || status;
}

export function getPaymentMethodText(method: string): string {
	const methodMap: Record<string, string> = {
		'CREDIT_CARD': 'Cartão de Crédito',
		'DEBIT_CARD': 'Cartão de Débito',
		'PIX': 'PIX',
		'BOLETO': 'Boleto',
	};

	return methodMap[method] || method;
}

export function formatErrorResponse(error: any): string {
	if (error.error_messages && Array.isArray(error.error_messages)) {
		return error.error_messages.map((msg: any) => 
			`${msg.parameter_name ? `${msg.parameter_name}: ` : ''}${msg.description}`
		).join('; ');
	}
	
	if (error.message) {
		return error.message;
	}
	
	return 'Erro desconhecido';
}

export function sanitizeCardData(cardData: any): any {
	// Remove dados sensíveis do cartão para logs
	const sanitized = { ...cardData };
	delete sanitized.number;
	delete sanitized.securityCode;
	delete sanitized.encrypted;
	return sanitized;
}

export function formatWebhookData(webhookData: any): any {
	// Formata dados do webhook para facilitar o uso
	return {
		orderId: webhookData.id,
		referenceId: webhookData.reference_id,
		status: webhookData.charges?.[0]?.status,
		paymentMethod: webhookData.charges?.[0]?.payment_method?.type,
		amount: webhookData.charges?.[0]?.amount?.value,
		currency: webhookData.charges?.[0]?.amount?.currency,
		customer: webhookData.customer,
		items: webhookData.items,
		createdAt: webhookData.created_at,
		paidAt: webhookData.charges?.[0]?.paid_at,
		rawData: webhookData,
	};
}
