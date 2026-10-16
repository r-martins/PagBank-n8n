import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

import {
	PAGBANK_CONNECT_MODULE_VERSION,
	PAGBANK_PLATFORM_VERSION_HEADER,
} from '../nodes/PagBank/releaseConstants';

export class PagBankConnect implements ICredentialType {
	name = 'pagBankConnect';
	displayName = 'PB Integrações (former PagBank Connect)';
	documentationUrl = 'https://pbintegracoes.com/connect/autorizar/?utm_source=n8n';
	properties: INodeProperties[] = [
		{
			displayName: 'Connect Key',
			name: 'connectKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description:
				'PB Integrações Connect Key. PagBank: CON… / CONSANDBOX…. Vindi: CONVD… / CONVDSANDBOX…. Get it at https://pbintegracoes.com/connect/autorizar/?utm_source=n8n (sandbox: /connect/sandbox). Credential test is also available on the PagBank node.',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.connectKey}}',
				Platform: 'n8n',
				'Platform-Version': PAGBANK_PLATFORM_VERSION_HEADER,
				'Module-Version': PAGBANK_CONNECT_MODULE_VERSION,
			},
		},
	};

	/**
	 * Credential modal uses this test (not the node `testedBy`).
	 * Route by Connect Key prefix: CONVD… → API v1, otherwise → WS v7.
	 * CONVDSANDBOX… starts with CONVD, so it hits v1 correctly.
	 */
	test: ICredentialTestRequest = {
		request: {
			url: '={{($credentials.connectKey || "").startsWith("CONVD") ? "https://api.pbintegracoes.com/v1/connectInfo" : "https://ws.pbintegracoes.com/pspro/v7/connect/connectInfo"}}',
			method: 'GET',
			headers: {
				Platform: 'n8n',
				'Platform-Version': PAGBANK_PLATFORM_VERSION_HEADER,
				'Module-Version': PAGBANK_CONNECT_MODULE_VERSION,
			},
		},
	};
}
