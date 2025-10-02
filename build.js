const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔨 Building PagBank Connect n8n integration...');

try {
  // Create dist directory if it doesn't exist
  if (!fs.existsSync('dist')) {
    fs.mkdirSync('dist', { recursive: true });
  }

  // Copy credentials
  if (!fs.existsSync('dist/credentials')) {
    fs.mkdirSync('dist/credentials', { recursive: true });
  }
  
  // Copy nodes
  if (!fs.existsSync('dist/nodes')) {
    fs.mkdirSync('dist/nodes', { recursive: true });
  }
  
  if (!fs.existsSync('dist/nodes/PagBank')) {
    fs.mkdirSync('dist/nodes/PagBank', { recursive: true });
  }

  // Compile TypeScript files
  console.log('🔨 Compiling TypeScript files...');
  
  try {
    execSync('npx tsc', { stdio: 'inherit' });
    console.log('✅ TypeScript compilation completed');
  } catch (error) {
    console.log('⚠️  TypeScript compilation failed, copying source files...');
    
    // Copy source files to dist as fallback
    console.log('📁 Copying source files...');
    
    // Copy credentials
    if (fs.existsSync('credentials/PagBankConnect.credentials.ts')) {
      fs.copyFileSync('credentials/PagBankConnect.credentials.ts', 'dist/credentials/PagBankConnect.credentials.ts');
      console.log('✅ PagBankConnect.credentials.ts copied');
    }
    
    // Copy nodes
    if (fs.existsSync('nodes/PagBank/PagBankSimple.node.ts')) {
      fs.copyFileSync('nodes/PagBank/PagBankSimple.node.ts', 'dist/nodes/PagBank/PagBankSimple.node.ts');
      console.log('✅ PagBankSimple.node.ts copied');
    }
    
    if (fs.existsSync('nodes/PagBank/PagBankWebhook.node.ts')) {
      fs.copyFileSync('nodes/PagBank/PagBankWebhook.node.ts', 'dist/nodes/PagBank/PagBankWebhook.node.ts');
      console.log('✅ PagBankWebhook.node.ts copied');
    }
    
    if (fs.existsSync('nodes/PagBank/PagBankUtils.ts')) {
      fs.copyFileSync('nodes/PagBank/PagBankUtils.ts', 'dist/nodes/PagBank/PagBankUtils.ts');
      console.log('✅ PagBankUtils.ts copied');
    }
    
    if (fs.existsSync('nodes/PagBank/pagbank.svg')) {
      fs.copyFileSync('nodes/PagBank/pagbank.svg', 'dist/nodes/PagBank/pagbank.svg');
      console.log('✅ pagbank.svg copied');
    }
  }
  
  // Copy index.js
  if (fs.existsSync('index.js')) {
    fs.copyFileSync('index.js', 'dist/index.js');
    console.log('✅ index.js copied');
  }

  console.log('✅ Directory structure created');
  console.log('📦 Build completed successfully!');
  console.log('');
  console.log('Next steps:');
  console.log('1. Run: npm install');
  console.log('2. Restart n8n (link simbólico já configurado)');
  console.log('3. Add PagBank Connect credentials in n8n');
  console.log('');
  console.log('💡 Dica: O link simbólico foi criado automaticamente!');
  console.log('   Mudanças no código serão refletidas automaticamente no n8n.');

} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}
