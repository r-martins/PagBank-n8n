import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class PagBankConnect implements ICredentialType {
	name = 'pagBankConnect';
	displayName = 'PagBank Connect';
	documentationUrl = 'https://pbintegracoes.com/connect/autorizar/?utm_source=n8n';
	properties: INodeProperties[] = [
		{
			displayName: 'Connect Key',
			name: 'connectKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description: 'Your PagBank Connect Key. Get it at: https://pbintegracoes.com/connect/autorizar/?utm_source=n8n',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'Authorization': '=Bearer {{$credentials.connectKey}}',
				'Platform': 'n8n',
				'Platform-Version': '1.113.3',
				'Module-Version': '1.3.1',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			url: 'https://ws.pbintegracoes.com/pspro/v7/connect/connectInfo',
			method: 'GET',
			headers: {
				'Authorization': '=Bearer {{$credentials.connectKey}}',
				'Platform': 'n8n',
				'Platform-Version': '1.113.3',
				'Module-Version': '1.3.1',
			},
		},
	};
}
