// Simular como o n8n carrega o nó
const fs = require('fs');
const path = '/Users/martins/www/pagbank-n8n/dist/nodes/PagBank/PagBankSimple.node.js';

console.log('Arquivo existe?', fs.existsSync(path));

try {
  const NodeClass = require(path);
  console.log('Tipo do export:', typeof NodeClass);
  console.log('É função?', typeof NodeClass === 'function');
  console.log('Nome da classe:', NodeClass.name);
  
  // Simular o que o n8n faz
  const instance = new NodeClass();
  console.log('Instância criada:', !!instance);
  console.log('Tem description?', !!instance.description);
} catch (error) {
  console.log('Erro:', error.message);
  console.log('Stack:', error.stack);
}
