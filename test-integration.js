#!/usr/bin/env node

const https = require('https');
const http = require('http');

console.log('🧪 Testando Integração PagBank Connect n8n');
console.log('============================================');

// Test 1: Verificar se n8n está rodando
console.log('\n1. Verificando se n8n está rodando...');

const testN8n = () => {
  return new Promise((resolve, reject) => {
    const req = http.get('http://localhost:5678', (res) => {
      if (res.statusCode === 200) {
        console.log('✅ n8n está rodando em http://localhost:5678');
        resolve(true);
      } else {
        console.log('❌ n8n não está respondendo corretamente');
        reject(false);
      }
    });
    
    req.on('error', (err) => {
      console.log('❌ n8n não está rodando:', err.message);
      reject(err);
    });
    
    req.setTimeout(5000, () => {
      console.log('❌ Timeout ao conectar com n8n');
      reject(new Error('Timeout'));
    });
  });
};

// Test 2: Verificar se a API do PagBank está acessível
console.log('\n2. Verificando conectividade com PagBank Connect...');

const testPagBankAPI = () => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'ws.pbintegracoes.com',
      port: 443,
      path: '/pspro/v7/connect/ws/checkouts?isSandbox=1',
      method: 'GET',
      headers: {
        'User-Agent': 'n8n-test'
      }
    };

    const req = https.request(options, (res) => {
      if (res.statusCode === 401) {
        console.log('✅ API do PagBank Connect está acessível (401 = esperado sem credenciais)');
        resolve(true);
      } else {
        console.log(`⚠️  API do PagBank Connect respondeu com status: ${res.statusCode}`);
        resolve(true);
      }
    });
    
    req.on('error', (err) => {
      console.log('❌ Erro ao conectar com API do PagBank:', err.message);
      reject(err);
    });
    
    req.setTimeout(10000, () => {
      console.log('❌ Timeout ao conectar com API do PagBank');
      reject(new Error('Timeout'));
    });
    
    req.end();
  });
};

// Test 3: Verificar arquivos da integração
console.log('\n3. Verificando arquivos da integração...');

const fs = require('fs');
const path = require('path');

const checkIntegrationFiles = () => {
  const files = [
    '~/.n8n/custom/index.js',
    '~/.n8n/custom/credentials/PagBankConnect.credentials.ts',
    '~/.n8n/custom/nodes/PagBank/PagBankSimple.node.ts',
    '~/.n8n/custom/nodes/PagBank/PagBankWebhook.node.ts'
  ];
  
  let allFilesExist = true;
  
  files.forEach(file => {
    const fullPath = file.replace('~', process.env.HOME);
    if (fs.existsSync(fullPath)) {
      console.log(`✅ ${file}`);
    } else {
      console.log(`❌ ${file} - arquivo não encontrado`);
      allFilesExist = false;
    }
  });
  
  return allFilesExist;
};

// Executar todos os testes
async function runTests() {
  try {
    await testN8n();
    await testPagBankAPI();
    const filesOk = checkIntegrationFiles();
    
    console.log('\n=====================================');
    console.log('📋 RESUMO DOS TESTES');
    console.log('=====================================');
    console.log('✅ n8n está rodando');
    console.log('✅ API do PagBank Connect está acessível');
    console.log(filesOk ? '✅ Arquivos da integração estão instalados' : '❌ Alguns arquivos estão faltando');
    
    console.log('\n🎯 PRÓXIMOS PASSOS:');
    console.log('1. Abra http://localhost:5678 no navegador');
    console.log('2. Crie sua conta de administrador');
    console.log('3. Vá em Credentials → Add Credential');
    console.log('4. Procure por "PagBank Connect"');
    console.log('5. Configure sua Connect Key');
    console.log('6. Teste a validação da Connect Key');
    console.log('7. Crie um workflow de teste');
    
    console.log('\n📚 DOCUMENTAÇÃO:');
    console.log('- Guia completo: SETUP-N8N.md');
    console.log('- Exemplos: examples/');
    console.log('- Suporte: ricardo@pbintegracoes.com');
    
  } catch (error) {
    console.log('\n❌ ERRO:', error.message);
    console.log('\n🔧 SOLUÇÕES:');
    console.log('1. Verifique se n8n está rodando: n8n start');
    console.log('2. Verifique sua conexão com a internet');
    console.log('3. Reinstale a integração: node build.js && cp -r dist/* ~/.n8n/custom/');
  }
}

runTests();
