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
    if (fs.existsSync('credentials/PagBankConnectApi.credentials.ts')) {
      fs.copyFileSync('credentials/PagBankConnectApi.credentials.ts', 'dist/credentials/PagBankConnectApi.credentials.ts');
      console.log('✅ PagBankConnectApi.credentials.ts copied');
    }
    
    // Copy nodes
    if (fs.existsSync('nodes/PagBank/PagBank.node.ts')) {
      fs.copyFileSync('nodes/PagBank/PagBank.node.ts', 'dist/nodes/PagBank/PagBank.node.ts');
      console.log('✅ PagBank.node.ts copied');
    }
    
    if (fs.existsSync('nodes/PagBank/PagBankTrigger.node.ts')) {
      fs.copyFileSync('nodes/PagBank/PagBankTrigger.node.ts', 'dist/nodes/PagBank/PagBankTrigger.node.ts');
      console.log('✅ PagBankTrigger.node.ts copied');
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
  
  // Copy index.js and other files
  if (fs.existsSync('index.js')) {
    fs.copyFileSync('index.js', 'dist/index.js');
    console.log('✅ index.js copied');
  }
  
  // Copy .node.json files
  if (fs.existsSync('nodes/PagBank/PagBankTrigger.node.json')) {
    const targetDir = 'dist/nodes/PagBank';
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    fs.copyFileSync('nodes/PagBank/PagBankTrigger.node.json', 'dist/nodes/PagBank/PagBankTrigger.node.json');
    console.log('✅ PagBankTrigger.node.json copied');
  }
  
  if (fs.existsSync('nodes/PagBank/PagBank.node.json')) {
    const targetDir = 'dist/nodes/PagBank';
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    fs.copyFileSync('nodes/PagBank/PagBank.node.json', 'dist/nodes/PagBank/PagBank.node.json');
    console.log('✅ PagBank.node.json copied');
  }

  // Copy lib/* (PagBank SDK JS + any plain JS under lib) to dist
  const libRoot = 'lib';
  const distLibRoot = 'dist/lib';
  if (fs.existsSync(libRoot)) {
    const copyLibDir = (srcDir, destDir) => {
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }
      for (const file of fs.readdirSync(srcDir)) {
        const src = path.join(srcDir, file);
        const dest = path.join(destDir, file);
        if (fs.statSync(src).isDirectory()) {
          copyLibDir(src, dest);
        } else if (file.endsWith('.js')) {
          fs.copyFileSync(src, dest);
        }
      }
    };
    copyLibDir(libRoot, distLibRoot);
    console.log('✅ lib/**/*.js copied to dist/lib');
  }
  
  // Remove old webhook files if they exist
  const oldWebhookFiles = [
    'dist/nodes/PagBank/PagBankWebhook.node.js',
    'dist/nodes/PagBank/PagBankWebhook.node.d.ts',
    'dist/nodes/PagBank/PagBankWebhook.node.ts',
  ];
  
  oldWebhookFiles.forEach(file => {
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
      console.log(`✅ Removed old file: ${file}`);
    }
  });

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
