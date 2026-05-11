/**
 * Static release metadata for outbound headers (n8n Cloud forbids fs, process,
 * __dirname, and reading n8n/package.json from community nodes).
 * Bump `PAGBANK_CONNECT_MODULE_VERSION` together with `version` in package.json before publish.
 */
export const PAGBANK_CONNECT_MODULE_VERSION = '2.1.2';

/** Sentinel for Platform-Version when the host n8n version is not available on the public API surface. */
export const PAGBANK_PLATFORM_VERSION_HEADER = 'n8n-community';
