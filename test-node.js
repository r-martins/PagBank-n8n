// Teste simples para verificar a exportação
const PagBankSimple = require('./dist/nodes/PagBank/PagBankSimple.node.js');
console.log('PagBankSimple:', typeof PagBankSimple);
console.log('É função?', typeof PagBankSimple === 'function');
console.log('É classe?', PagBankSimple.toString().includes('class'));

try {
  const instance = new PagBankSimple();
  console.log('Instância criada com sucesso:', !!instance);
} catch (error) {
  console.log('Erro ao criar instância:', error.message);
}
