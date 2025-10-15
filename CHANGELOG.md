# Changelog

All notable changes to this project will be documented in this file.

## [1.3.0] - 2024-10-15

### 🚀 Major Changes
- **Removed external dependencies**: Eliminated `n8n-nodes-base` dependency to comply with N8N Community Node requirements
- **Zero runtime dependencies**: Package now has no dependencies in production, only peer dependencies

### 🔧 Technical Improvements
- **Fixed icon loading**: Corrected gulpfile to copy icons to the correct location (`dist/nodes/PagBank/`)
- **Updated build process**: Icons now properly copied during build process
- **Improved package structure**: Cleaner dependency management with only `n8n-workflow` as peer dependency

### 📦 Package Changes
- **Dependencies**: Moved from `dependencies` to `peerDependencies` and `devDependencies`
- **Build optimization**: Streamlined build process for better compatibility
- **Icon fixes**: Resolved icon display issues in N8N interface

### 🎯 Compliance
- **N8N Community Node ready**: Package now meets all requirements for N8N Community Node approval
- **No external dependencies**: Eliminates potential security and compatibility issues
- **Clean architecture**: Follows N8N best practices for community nodes

### 🔄 Migration Notes
- No breaking changes for end users
- All existing functionality preserved
- Icons now display correctly in N8N interface
- Improved stability and compatibility

---

## [1.2.0] - Previous Version
- Initial release with full PagBank Connect integration
- Support for PIX, Boleto, Credit Card payments
- Webhook support for payment notifications
- Payment link creation functionality
