#!/usr/bin/env node

/**
 * PrivacyShield Production Build Script
 * Creates production-ready extension package
 */

const fs = require('fs');
const path = require('path');

class ProductionBuilder {
  constructor() {
    this.sourceDir = __dirname;
    this.buildDir = path.join(__dirname, 'dist');
    this.packageName = 'privacyshield-v3.0.0-production';
  }

  async build() {
    console.log('🛡️  PrivacyShield Production Build v3.0.0');
    console.log('=====================================\n');

    try {
      await this.clean();
      await this.createStructure();
      await this.copyCoreFiles();
      await this.copyUIFiles();
      await this.copyRules();
      await this.copyIcons();
      await this.copyDocumentation();
      await this.validateBuild();
      await this.createZip();
      
      console.log('\n✅ Production build completed successfully!');
      console.log(`📦 Package created: ${this.packageName}.zip`);
      console.log('\n🚀 Ready for Chrome Web Store deployment!');
      
    } catch (error) {
      console.error('\n❌ Build failed:', error.message);
      process.exit(1);
    }
  }

  async clean() {
    console.log('🧹 Cleaning build directory...');
    if (fs.existsSync(this.buildDir)) {
      fs.rmSync(this.buildDir, { recursive: true });
    }
    fs.mkdirSync(this.buildDir, { recursive: true });
  }

  async createStructure() {
    console.log('📁 Creating directory structure...');
    const dirs = [
      'src/core',
      'src/privacy', 
      'src/ui',
      'src/ai',
      'ui',
      'rules',
      'icons'
    ];

    dirs.forEach(dir => {
      fs.mkdirSync(path.join(this.buildDir, dir), { recursive: true });
    });
  }

  async copyCoreFiles() {
    console.log('📄 Copying core files...');
    
    const coreFiles = [
      'manifest.json',
      'background.js',
      'content.js',
      'src/core/constants.js',
      'src/core/storage.js',
      'src/core/utils.js',
      'src/privacy/stats.js',
      'src/privacy/fingerprint.js',
      'src/privacy/tracker-blocker.js',
      'src/ui/popup.js',
      'src/ui/settings.js',
      'src/ai/adaptive-learning-engine.js',
      'src/ai/ai-learning-monitor.js',
      'src/ai/behavioral-analyzer.js',
      'src/ai/script-monitor.js'
    ];

    for (const file of coreFiles) {
      const src = path.join(this.sourceDir, file);
      const dest = path.join(this.buildDir, file);
      
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
        console.log(`  ✓ ${file}`);
      } else {
        console.warn(`  ⚠ Warning: ${file} not found`);
      }
    }
  }

  async copyUIFiles() {
    console.log('🎨 Copying UI files...');
    
    const uiFiles = [
      'ui/popup.html',
      'ui/popup.css',
      'ui/settings.html',
      'ui/settings.css'
    ];

    for (const file of uiFiles) {
      const src = path.join(this.sourceDir, file);
      const dest = path.join(this.buildDir, file);
      
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
        console.log(`  ✓ ${file}`);
      }
    }
  }

  async copyRules() {
    console.log('📋 Copying blocking rules...');
    
    const ruleFiles = [
      'rules/ads.json',
      'rules/trackers.json',
      'rules/malware.json'
    ];

    for (const file of ruleFiles) {
      const src = path.join(this.sourceDir, file);
      const dest = path.join(this.buildDir, file);
      
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
        console.log(`  ✓ ${file}`);
      }
    }
  }

  async copyIcons() {
    console.log('🖼️  Copying icons...');
    
    const iconFiles = [
      'icons/icon16.png',
      'icons/icon32.png',
      'icons/icon48.png',
      'icons/icon128.png'
    ];

    for (const file of iconFiles) {
      const src = path.join(this.sourceDir, file);
      const dest = path.join(this.buildDir, file);
      
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
        console.log(`  ✓ ${file}`);
      }
    }
  }

  async copyDocumentation() {
    console.log('📚 Copying documentation...');
    
    const docFiles = [
      'README.md',
      'LICENSE',
      'PRODUCTION_READINESS_REPORT.md',
      'UI_DESIGN_DOCUMENTATION.md'
    ];

    for (const file of docFiles) {
      const src = path.join(this.sourceDir, file);
      const dest = path.join(this.buildDir, file);
      
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
        console.log(`  ✓ ${file}`);
      }
    }
  }

  async validateBuild() {
    console.log('🔍 Validating build...');
    
    const requiredFiles = [
      'manifest.json',
      'background.js',
      'content.js',
      'ui/popup.html',
      'ui/settings.html',
      'icons/icon16.png',
      'icons/icon128.png'
    ];

    const missing = [];
    for (const file of requiredFiles) {
      const filePath = path.join(this.buildDir, file);
      if (!fs.existsSync(filePath)) {
        missing.push(file);
      }
    }

    if (missing.length > 0) {
      throw new Error(`Missing required files: ${missing.join(', ')}`);
    }

    // Validate manifest
    const manifestPath = path.join(this.buildDir, 'manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    
    if (manifest.version !== '3.0.0') {
      throw new Error('Manifest version mismatch');
    }

    console.log('  ✓ All required files present');
    console.log('  ✓ Manifest validation passed');
  }

  async createZip() {
    console.log('📦 Creating production package...');
    
    const archiver = require('archiver');
    const output = fs.createWriteStream(`${this.packageName}.zip`);
    const archive = archiver('zip', { zlib: { level: 9 } });

    return new Promise((resolve, reject) => {
      output.on('close', () => {
        console.log(`  ✓ Package size: ${archive.pointer()} bytes`);
        resolve();
      });

      archive.on('error', reject);
      archive.pipe(output);
      
      // Add all files from build directory
      archive.directory(this.buildDir, false);
      archive.finalize();
    });
  }
}

// Run build if called directly
if (require.main === module) {
  const builder = new ProductionBuilder();
  builder.build();
}

module.exports = ProductionBuilder;
