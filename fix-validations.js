const fs = require('fs');

// Read the file
let content = fs.readFileSync('/Users/martins/www/pagbank-n8n/dist/nodes/PagBank/PagBankSimple.node.js', 'utf8');

// Fix 1: Add minimum value validation after amount validation
content = content.replace(
	/if \(!amount \|\| amount <= 0\) \{\s*throw new NodeOperationError\(this\.getNode\(\), 'Valor é obrigatório e deve ser maior que zero'\);\s*\}/g,
	`if (!amount || amount <= 0) {
						throw new NodeOperationError(this.getNode(), 'Valor é obrigatório e deve ser maior que zero');
					}
					if (amount < 1) {
						throw new NodeOperationError(this.getNode(), 'Valor mínimo é R$ 1,00');
					}`
);

// Fix 2: Add CPF/CNPJ validation after email validation
content = content.replace(
	/if \(!buyerEmail\) \{\s*throw new NodeOperationError\(this\.getNode\(\), 'Email do comprador é obrigatório'\);\s*\}/g,
	`if (!buyerEmail) {
						throw new NodeOperationError(this.getNode(), 'Email do comprador é obrigatório');
					}
					// Validar CPF/CNPJ se fornecido
					if (buyerTaxId && buyerTaxId !== "01234567890") {
						const taxId = buyerTaxId.replace(/\\D/g, ''); // Remove caracteres não numéricos
						if (taxId.length !== 11 && taxId.length !== 14) {
							throw new NodeOperationError(this.getNode(), 'CPF deve ter 11 dígitos ou CNPJ deve ter 14 dígitos');
						}
					}`
);

// Write the file back
fs.writeFileSync('/Users/martins/www/pagbank-n8n/dist/nodes/PagBank/PagBankSimple.node.js', content);

console.log('✅ Validações adicionadas com sucesso!');
