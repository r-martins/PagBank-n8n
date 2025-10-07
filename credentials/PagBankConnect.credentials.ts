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
			description: 'Sua Connect Key do PagBank Connect. Obtenha em: https://pbintegracoes.com/connect/autorizar/?utm_source=n8n',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'Authorization': '=Bearer {{$credentials.connectKey}}',
				'Platform': 'n8n',
				'Platform-Version': '1.113.3',
				'Module-Version': '1.0.0',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://ws.pbintegracoes.com/pspro/v7',
			url: '/connect/connectInfo',
			method: 'GET',
		},
	};
}
