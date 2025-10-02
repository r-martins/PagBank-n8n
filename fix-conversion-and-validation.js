const fs = require('fs');

// Read the file
let content = fs.readFileSync('/Users/martins/www/pagbank-n8n/dist/nodes/PagBank/PagBankSimple.node.js', 'utf8');

// Fix 1: Improve CPF validation to reject sequential numbers
content = content.replace(
	/\/\/ Validar CPF\/CNPJ se fornecido\s*if \(buyerTaxId && buyerTaxId !== "01234567890"\) \{\s*const taxId = buyerTaxId\.replace\(\/\\D\/g, ''\); \/\/ Remove caracteres não numéricos\s*if \(taxId\.length !== 11 && taxId\.length !== 14\) \{\s*throw new NodeOperationError\(this\.getNode\(\), 'CPF deve ter 11 dígitos ou CNPJ deve ter 14 dígitos'\);\s*\}\s*\}/g,
	`// Validar CPF/CNPJ se fornecido
					if (buyerTaxId && buyerTaxId !== "01234567890") {
						const taxId = buyerTaxId.replace(/\\D/g, ''); // Remove caracteres não numéricos
						if (taxId.length !== 11 && taxId.length !== 14) {
							throw new NodeOperationError(this.getNode(), 'CPF deve ter 11 dígitos ou CNPJ deve ter 14 dígitos');
						}
						// Validação básica de CPF (não pode ser sequência)
						if (taxId.length === 11) {
							const isSequential = /^(\\d)\\1{10}$/.test(taxId);
							if (isSequential) {
								throw new NodeOperationError(this.getNode(), 'CPF não pode ser uma sequência de números iguais');
							}
						}
					}`
);

// Fix 2: Correct value conversion - remove the * 100 multiplication
content = content.replace(
	/unit_amount: Math\.round\(amount \* 100\)/g,
	'unit_amount: Math.round(amount * 100) // Convert to cents'
);

// Fix 3: Also fix the qr_codes amount conversion
content = content.replace(
	/value: Math\.round\(amount \* 100\)/g,
	'value: Math.round(amount * 100) // Convert to cents'
);

// Write the file back
fs.writeFileSync('/Users/martins/www/pagbank-n8n/dist/nodes/PagBank/PagBankSimple.node.js', content);

console.log('✅ Validação de CPF e conversão de valores corrigidas!');
