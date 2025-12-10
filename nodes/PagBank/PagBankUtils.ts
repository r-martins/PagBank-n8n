import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
	NodeOperationError,
} from 'n8n-workflow';

// Helper function to extract PagBank error messages
function extractPagBankErrorMessage(error: any): { message: string; description: string } {
	let errorMessage = 'Request failed';
	let errorDescription = 'Please check your input data and try again.';
	
	if (error.response) {
		const responseBody = error.response.body || error.response.data || error.response;
		
		// Check for PagBank specific error format
		if (responseBody?.error_messages && Array.isArray(responseBody.error_messages)) {
			const firstError = responseBody.error_messages[0];
			errorMessage = firstError.description || firstError.message || 'API request failed';
			
			// Create helpful description based on error code
			const errorCode = firstError.code || 'Unknown';
			const parameterName = firstError.parameter_name;
			
			switch (errorCode) {
				case '40002':
					if (parameterName === 'customer.tax_id') {
						errorDescription = 'Please provide a valid CPF (11 digits) or CNPJ (14 digits) for the customer.';
					} else if (parameterName === 'customer.email') {
						errorDescription = 'Please provide a valid email address for the customer.';
					} else {
						errorDescription = 'Please check the input data and ensure all required fields are correctly formatted.';
					}
					break;
				case '40001':
					errorDescription = 'Please check your Connect Key and ensure it is valid and active.';
					break;
				case '40003':
					errorDescription = 'Please check the payment amount and ensure it is valid.';
					break;
				default:
					errorDescription = `Error code: ${errorCode}. Please check the PagBank documentation for more details.`;
			}
			
			if (parameterName) {
				errorDescription += ` (Parameter: ${parameterName})`;
			}
		} else if (responseBody?.message) {
			errorMessage = responseBody.message;
		} else if (responseBody?.error) {
			errorMessage = responseBody.error;
		}
	}
	
	return { message: errorMessage, description: errorDescription };
}

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
		throw new NodeOperationError(this.getNode(), 'PagBank Connect credentials not found');
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
			'Authorization': `Bearer ${connectKey}`,
			'Platform': 'n8n',
			'Platform-Version': '1.113.3',
			'Module-Version': '1.3.4',
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
		const response = await this.helpers.httpRequest(options);
		return response;
	} catch (error: any) {
		// Extract PagBank specific error message
		const { message: errorMessage, description: errorDescription } = extractPagBankErrorMessage(error);
			
		throw new NodeOperationError(this.getNode(), errorMessage, {
			description: errorDescription,
		});
	}
}

export async function validateConnectKey(
	this: IExecuteFunctions,
	connectKey: string,
): Promise<{ isValid: boolean; status: string; message: string; accountInfo?: any }> {
	try {
		const response = await pagBankConnectRequest.call(this, 'GET', '/connect/connectInfo');
		
		// Verificar status da resposta
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
		throw new Error('CPF must have 11 digits or CNPJ must have 14 digits');
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
			'PAID': 'Paid',
			'WAITING': 'Waiting for Payment',
			'DECLINED': 'Declined',
			'CANCELED': 'Canceled',
			'REFUNDED': 'Refunded',
			'PENDING': 'Pending',
			'ACTIVE': 'Active',
			'INACTIVE': 'Inactive',
	};

	return statusMap[status] || status;
}

export function getPaymentMethodText(method: string): string {
	const methodMap: Record<string, string> = {
			'CREDIT_CARD': 'Credit Card',
			'DEBIT_CARD': 'Debit Card',
		'PIX': 'PIX',
			'BOLETO': 'Bank Slip',
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
	
		return 'Unknown error';
}

export function sanitizeCardData(cardData: any): any {
		// Remove sensitive card data for logs
	const sanitized = { ...cardData };
	delete sanitized.number;
	delete sanitized.securityCode;
	delete sanitized.encrypted;
	return sanitized;
}

export function formatWebhookData(webhookData: any): any {
		// Format webhook data to facilitate usage
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
