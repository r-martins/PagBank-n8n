const axios = require('axios');

async function testWebhook() {
    try {
        console.log('🧪 Testando webhook com dados...');
        
        // URL do webhook (substitua pelo ID do seu workflow)
        const webhookUrl = 'http://localhost:5678/webhook-test/bbf26c08-b3c9-477e-9cc9-f9b1ec69e161/pagbank-webhook';
        
        const testData = {
            "id": "ORDE_TEST-123",
            "reference_id": "TEST-001",
            "created_at": "2025-01-03T12:00:00.000Z",
            "customer": {
                "name": "João da Silva",
                "email": "joao@exemplo.com",
                "tax_id": "12345678901"
            },
            "charges": [
                {
                    "id": "CHAR_TEST-123",
                    "status": "PAID",
                    "amount": {
                        "value": 1000,
                        "currency": "BRL"
                    }
                }
            ]
        };

        console.log('📤 Enviando dados para o webhook...');
        const response = await axios.post(webhookUrl, testData, {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });

        console.log('✅ Webhook funcionando!');
        console.log('Status:', response.status);
        console.log('Response:', response.data);
        
    } catch (error) {
        console.error('❌ Erro no webhook:');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        } else {
            console.error('Error:', error.message);
        }
    }
}

testWebhook();
