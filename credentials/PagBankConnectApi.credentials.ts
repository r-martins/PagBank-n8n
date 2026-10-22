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

export class PagBankConnectApi implements ICredentialType {
	/**
	 * Keep legacy credential type id so existing n8n installs keep working.
	 * Class is *Api (lint); renaming `name` to pagBankConnectApi would orphan saved credentials.
	 */
	// eslint-disable-next-line n8n-nodes-base/cred-class-field-name-unsuffixed -- preserve pagBankConnect id for existing installs
	name = 'pagBankConnect';
	displayName = 'PB Integrações (Former PagBank Connect) API';
	documentationUrl = 'https://pbintegracoes.com/autorizar/?utm_source=n8n';
	icon = { light: 'file:pagbank.svg', dark: 'file:pagbank.dark.svg' } as const;
	properties: INodeProperties[] = [
		{
			displayName: 'Connect Key',
			name: 'connectKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description:
				'PB Integrações Connect Key. Get it at https://pbintegracoes.com/autorizar/?utm_source=n8n. Test credentials also available at https://pbintegracoes.com/sandbox/?utm_source=n8n.',
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
