const axios = require('axios');

async function testWebhook() {
    try {
        console.log('🧪 Testando webhook com debug...');
        
        // URL do webhook (substitua pelo ID do seu workflow)
        const webhookUrl = 'http://localhost:5678/webhook-test/bbf26c08-b3c9-477e-9cc9-f9b1ec69e161/pagbank-webhook';
        
        const testData = {
            "id": "ORDE_AECF9A09-EBB9-4626-BBDC-7DCAEBEFCA4D",
            "reference_id": "7042",
            "created_at": "2025-05-26T20:59:03.753-03:00",
            "customer": {
                "name": "José de São Piauí",
                "email": "cliente@ricardo3martins.net.br",
                "tax_id": "01234567890"
            },
            "charges": [
                {
                    "id": "CHAR_15A88B57-B829-43DD-920F-8E85018B7F90",
                    "status": "PAID",
                    "amount": {
                        "value": 5115,
                        "currency": "BRL"
                    }
                }
            ]
        };

        console.log('📤 Enviando dados para o webhook...');
        console.log('URL:', webhookUrl);
        console.log('Dados:', JSON.stringify(testData, null, 2));
        
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