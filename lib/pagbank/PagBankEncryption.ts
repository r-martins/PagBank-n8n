// PagBank Encryption Wrapper
// This file provides a TypeScript interface to the PagBank JavaScript SDK
// Uses our N8N-compatible implementation

// Import our N8N-compatible PagSeguro SDK
const PagSeguroSDK = require('./pagseguro-n8n-compatible.js');

// Export both the internal module and the wrapper function
export { PagSeguroSDK as PagBankSDK };

export function encryptCard(cardData: {
    publicKey: string;
    holder: string;
    number: string;
    expMonth: string;
    expYear: string;
    securityCode: string;
}): string {
    try {
        const result = PagSeguroSDK.encryptCard(cardData);
        
        if (result.hasErrors) {
            if (result.errors && result.errors.length > 0) {
                const firstError = result.errors[0];
                if (firstError) {
                    const errorMessage = firstError.message || 'Encryption failed';
                    const errorCode = firstError.code ? ` (Code: ${firstError.code})` : '';
                    throw new Error(`PagBank encryption failed: ${errorMessage}${errorCode}`);
                }
            }
            throw new Error('PagBank encryption failed');
        }
        
        if (!result.encryptedCard) {
            throw new Error('PagBank encryption returned no result');
        }
        
        return result.encryptedCard;
        
    } catch (error: any) {
        throw new Error(`Failed to encrypt card data: ${error.message}`);
    }
}