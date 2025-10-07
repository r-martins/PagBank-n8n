#!/usr/bin/env node

const https = require('https');

console.log('🔑 Testando Validação da Connect Key');
console.log('=====================================');

// Função para testar a Connect Key
async function testConnectKey(connectKey) {
  return new Promise((resolve, reject) => {
    const baseURL = 'https://ws.pbintegracoes.com/pspro/v7';
    const isSandbox = connectKey.startsWith('CONSANDBOX');
    let url = `${baseURL}/connect/connectInfo`;
    if (isSandbox) {
      url += '?isSandbox=1';
    }

    console.log(`\n🔍 Testando Connect Key: ${connectKey.substring(0, 10)}...`);
    console.log(`🌐 URL: ${url}`);
    console.log(`🏷️  Ambiente: ${isSandbox ? 'Sandbox' : 'Produção'}`);

    const options = {
      hostname: 'ws.pbintegracoes.com',
      port: 443,
      path: isSandbox ? '/pspro/v7/connect/connectInfo?isSandbox=1' : '/pspro/v7/connect/connectInfo',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${connectKey}`,
        'Platform': 'n8n',
        'Platform-Version': '1.113.3',
        'Module-Version': '1.0.0',
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          
          console.log(`\n📊 Status da Resposta: ${res.statusCode}`);
          console.log(`📋 Dados da Conta:`);
          console.log(`   - Status: ${response.status}`);
          console.log(`   - Ambiente: ${response.isSandbox ? 'Sandbox' : 'Produção'}`);
          console.log(`   - Referência: ${response.reference}`);
          console.log(`   - Expira em: ${response.expiresAt}`);
          console.log(`   - Email: ${response.authorizerEmail || 'Desconhecido'}`);
          
          if (response.status === 'VALID') {
            console.log('✅ Connect Key VÁLIDA e ATIVA');
            resolve({
              isValid: true,
              status: 'VALID',
              message: 'Connect Key válida e ativa',
              accountInfo: response
            });
          } else if (response.status === 'INVALID') {
            console.log('❌ Connect Key INVÁLIDA - Conta pessoal (BUYER)');
            resolve({
              isValid: false,
              status: 'INVALID',
              message: 'Connect Key inválida - conta pessoal (BUYER) não é permitida',
              accountInfo: response
            });
          } else if (response.status === 'UNAUTHORIZED') {
            console.log('❌ Connect Key NÃO AUTORIZADA');
            resolve({
              isValid: false,
              status: 'UNAUTHORIZED',
              message: 'Connect Key não autorizada ou expirada',
              accountInfo: response
            });
          } else {
            console.log('⚠️  Status desconhecido');
            resolve({
              isValid: false,
              status: 'UNKNOWN',
              message: 'Erro desconhecido ao validar Connect Key',
              accountInfo: response
            });
          }
        } catch (error) {
          console.log('❌ Erro ao processar resposta:', error.message);
          console.log('📄 Resposta raw:', data);
          reject(error);
        }
      });
    });
    
    req.on('error', (error) => {
      console.log('❌ Erro na requisição:', error.message);
      reject(error);
    });
    
    req.setTimeout(10000, () => {
      console.log('❌ Timeout na requisição');
      reject(new Error('Timeout'));
    });
    
    req.end();
  });
}

// Função principal
async function main() {
  console.log('📝 Para testar sua Connect Key, execute:');
  console.log('node test-connect-key.js CONSANDBOX...');
  console.log('ou');
  console.log('node test-connect-key.js CON...');
  console.log('\n💡 Exemplo:');
  console.log('node test-connect-key.js CONSANDBOXCA0E5C9805C352E75F211CA87BF1EB');
  
  // Verificar se foi passada uma Connect Key
  const connectKey = process.argv[2];
  
  if (!connectKey) {
    console.log('\n❌ Connect Key não fornecida');
    console.log('📖 Uso: node test-connect-key.js <CONNECT_KEY>');
    process.exit(1);
  }
  
  // Validar formato da Connect Key
  if (!connectKey.startsWith('CON') && !connectKey.startsWith('CONSANDBOX')) {
    console.log('\n❌ Formato inválido da Connect Key');
    console.log('📖 A Connect Key deve começar com "CON" ou "CONSANDBOX"');
    process.exit(1);
  }
  
  try {
    const result = await testConnectKey(connectKey);
    
    console.log('\n=====================================');
    console.log('📋 RESUMO DA VALIDAÇÃO');
    console.log('=====================================');
    console.log(`✅ Válida: ${result.isValid ? 'Sim' : 'Não'}`);
    console.log(`📊 Status: ${result.status}`);
    console.log(`💬 Mensagem: ${result.message}`);
    
    if (result.accountInfo) {
      console.log(`🏷️  Ambiente: ${result.accountInfo.isSandbox ? 'Sandbox' : 'Produção'}`);
      console.log(`📅 Expira em: ${result.accountInfo.expiresAt}`);
    }
    
    console.log('\n🎯 PRÓXIMOS PASSOS:');
    if (result.isValid) {
      console.log('1. ✅ Connect Key está válida');
      console.log('2. 🔧 Configure no n8n');
      console.log('3. 🧪 Teste os workflows');
    } else {
      console.log('1. ❌ Connect Key inválida');
      console.log('2. 🔑 Obtenha uma nova Connect Key em: https://pbintegracoes.com/connect/autorizar/?utm_source=n8n');
      console.log('3. 🔄 Tente novamente');
    }
    
  } catch (error) {
    console.log('\n❌ ERRO:', error.message);
    console.log('\n🔧 SOLUÇÕES:');
    console.log('1. Verifique se a Connect Key está correta');
    console.log('2. Verifique sua conexão com a internet');
    console.log('3. Tente novamente em alguns minutos');
  }
}

main();
