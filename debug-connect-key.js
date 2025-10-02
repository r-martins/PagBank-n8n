#!/usr/bin/env node

const https = require('https');

console.log('🔍 Debug da Validação da Connect Key');
console.log('=====================================\n');

// Função para testar a Connect Key
async function testConnectKey(connectKey) {
  console.log(`📋 Testando Connect Key: ${connectKey.substring(0, 10)}...`);
  
  const baseURL = 'https://ws.pbintegracoes.com/pspro/v7';
  const url = `${baseURL}/connect/connectInfo`;

  console.log(`🌐 URL: ${url}`);
  console.log(`🔧 Connect Key prefix: ${connectKey.substring(0, 10)}`);

  const options = {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${connectKey}`,
      'Platform': 'n8n',
      'Platform-Version': '1.113.3',
      'Module-Version': '1.0.0',
      'Content-Type': 'application/json',
    },
  };

  console.log('\n📤 Headers enviados:');
  console.log(JSON.stringify(options.headers, null, 2));

  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      console.log(`\n📥 Status Code: ${res.statusCode}`);
      console.log(`📥 Status Message: ${res.statusMessage}`);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log('\n📥 Response Headers:');
        console.log(JSON.stringify(res.headers, null, 2));
        
        console.log('\n📥 Response Body:');
        try {
          const jsonData = JSON.parse(data);
          console.log(JSON.stringify(jsonData, null, 2));
          
          if (res.statusCode === 200) {
            console.log('\n✅ Sucesso! Connect Key válida');
            console.log(`🔧 Ambiente detectado: ${jsonData.isSandbox ? 'Sandbox' : 'Produção'}`);
            resolve({
              success: true,
              status: jsonData.status,
              environment: jsonData.isSandbox ? 'Sandbox' : 'Produção',
              data: jsonData
            });
          } else {
            console.log('\n❌ Erro na validação');
            resolve({
              success: false,
              status: res.statusCode,
              data: jsonData
            });
          }
        } catch (error) {
          console.log('\n📥 Response Body (raw):');
          console.log(data);
          console.log('\n❌ Erro ao parsear JSON:', error.message);
          resolve({
            success: false,
            status: res.statusCode,
            data: data
          });
        }
      });
    });

    req.on('error', (error) => {
      console.log('\n❌ Erro na requisição:', error.message);
      reject(error);
    });

    req.end();
  });
}

// Função principal
async function main() {
  try {
    // Teste com uma Connect Key de exemplo (você pode substituir pela sua)
    const connectKey = process.argv[2];
    
    if (!connectKey) {
      console.log('❌ Uso: node debug-connect-key.js <CONNECT_KEY>');
      console.log('📝 Exemplo: node debug-connect-key.js CONSANDBOX_1234567890abcdef');
      process.exit(1);
    }

    console.log('🚀 Iniciando teste...\n');
    
    const result = await testConnectKey(connectKey);
    
    console.log('\n📊 Resultado Final:');
    console.log('==================');
    console.log(`✅ Sucesso: ${result.success}`);
    console.log(`📊 Status: ${result.status}`);
    console.log(`📋 Dados: ${JSON.stringify(result.data, null, 2)}`);
    
  } catch (error) {
    console.error('💥 Erro fatal:', error.message);
    process.exit(1);
  }
}

main();
