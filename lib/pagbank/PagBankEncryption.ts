// PagBank Encryption Wrapper
// This file provides a TypeScript interface to the PagBank JavaScript SDK

import * as fs from 'fs';
import * as path from 'path';

// Load the PagBank SDK
const sdkPath = path.join(__dirname, '..', '..', 'PagBank', 'pagseguro.min.js');
const sdkCode = fs.readFileSync(sdkPath, 'utf8');

// Create a safe execution context for the SDK
const createSDKContext = () => {
    // Create a minimal global-like object
    const globalObj = {
        window: {},
        navigator: {},
        console: console,
        Buffer: Buffer,
        setTimeout: setTimeout,
        setInterval: setInterval,
        clearTimeout: clearTimeout,
        clearInterval: clearInterval,
        Date: Date,
        Math: Math,
        JSON: JSON,
        Array: Array,
        Object: Object,
        String: String,
        Number: Number,
        Boolean: Boolean,
        RegExp: RegExp,
        Error: Error,
        TypeError: TypeError,
        ReferenceError: ReferenceError,
        SyntaxError: SyntaxError,
        RangeError: RangeError,
        EvalError: EvalError,
        URIError: URIError,
        parseInt: parseInt,
        parseFloat: parseFloat,
        isNaN: isNaN,
        isFinite: isFinite,
        encodeURIComponent: encodeURIComponent,
        decodeURIComponent: decodeURIComponent,
        encodeURI: encodeURI,
        decodeURI: decodeURI,
        escape: escape,
        unescape: unescape,
        Infinity: Infinity,
        NaN: NaN,
        undefined: undefined,
        null: null,
        true: true,
        false: false
    };

    // Execute the SDK in this context
    const vm = require('vm');
    const context = vm.createContext(globalObj);
    vm.runInContext(sdkCode, context);
    
    return context;
};

// Cache the SDK context
let sdkContext: any = null;

export function encryptCard(cardData: {
    publicKey: string;
    holder: string;
    number: string;
    expMonth: string;
    expYear: string;
    securityCode: string;
}): string {
    try {
        // Initialize SDK context if not already done
        if (!sdkContext) {
            sdkContext = createSDKContext();
        }

        // Check if PagSeguro is available
        if (!sdkContext.PagSeguro || !sdkContext.PagSeguro.encryptCard) {
            throw new Error('PagBank SDK not loaded or encryptCard method not found');
        }

        // Prepare card data in the format expected by PagSeguro.encryptCard
        const cardDataForEncryption = {
            publicKey: cardData.publicKey,
            holder: cardData.holder,
            number: cardData.number,
            expMonth: cardData.expMonth,
            expYear: cardData.expYear,
            securityCode: cardData.securityCode
        };

        // Call the real PagSeguro.encryptCard method
        const encryptedResult = sdkContext.PagSeguro.encryptCard(cardDataForEncryption);
        
        // Check if the result is valid
        if (!encryptedResult || !encryptedResult.encryptedCard) {
            if (encryptedResult && encryptedResult.errors && encryptedResult.errors.length > 0) {
                const errorMessages = encryptedResult.errors.map((err: any) => `${err.code}: ${err.message}`).join(', ');
                throw new Error(`PagBank encryption failed: ${errorMessages}`);
            }
            throw new Error('PagSeguro.encryptCard returned invalid result');
        }
        
        // Return the encrypted card token
        return encryptedResult.encryptedCard;
        
    } catch (error: any) {
        throw new Error(`Failed to encrypt card data: ${error.message}`);
    }
}
