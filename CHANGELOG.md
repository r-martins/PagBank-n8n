# Changelog

All notable changes to this project will be documented in this file.

## [1.3.3] - 2024-10-20

### 🔧 Marketplace Compliance
- **Replaced console statements**: All console.log/error/warn statements replaced with n8n Logger support
- **Fixed node structure**: Updated Inputs/Outputs to use `NodeConnectionTypes.Main` as per n8n standards
- **Removed n8n-workflow from devDependencies**: Cleaned up dependencies to comply with marketplace requirements
- **Fixed credentials structure**: Removed unnecessary Authorization header from test request
- **Improved field organization**: Moved optional fields to "Additional Fields" collection for better UX

### 🐛 Bug Fixes
- **Fixed workflow parameter error**: Removed displayOptions from collection child parameters (fixes "Max iterations reached" error)
- **Fixed collection structure**: Properly organized optional fields in Additional Fields collection

### 📋 What's Changed
- ✅ All console statements now use optional logger support
- ✅ Node structure compliant with n8n marketplace standards
- ✅ Workflow parameter dependencies resolved
- ✅ Better organization of optional fields
- ✅ Cleaner dependency structure

---

## [1.3.2] - 2024-10-20

### 🐛 Bug Fixes
- **Fixed CreatePixOrder endpoint**: Corrected API endpoint from `/connect/ws/checkouts` to `/connect/ws/orders` for PIX order creation
- **Resolved URL duplication issue**: Fixed double URL construction in `createPixOrder` method that was causing request failures
- **Improved error handling**: Better error messages for PIX order creation failures

### 🔧 Technical Improvements
- **API consistency**: All order creation methods now use correct endpoints
- **Request optimization**: Removed redundant URL construction in `pagBankConnectRequest` calls
- **Better debugging**: Clearer error messages for troubleshooting

### 📋 What's Fixed
- ✅ CreatePixOrder now creates PIX orders instead of checkout links
- ✅ Proper API endpoint usage for all order types
- ✅ Eliminated "Request failed" errors in PIX order creation
- ✅ Consistent behavior across all payment methods

---

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
