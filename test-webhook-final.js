const http = require('http');

// Dados reais do PagBank (exemplo de notificação de pagamento PIX)
const pagbankData = {
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
            "reference_id": "7042",
            "status": "PAID",
            "created_at": "2025-05-26T20:59:20.822-03:00",
            "paid_at": "2025-05-26T20:59:23.027-03:00",
            "amount": {
                "value": 5115,
                "currency": "BRL",
                "summary": {
                    "total": 5115,
                    "paid": 5115,
                    "refunded": 0
                }
            },
            "payment_response": {
                "code": "20000",
                "message": "SUCESSO"
            },
            "payment_method": {
                "type": "PIX",
                "pix": {
                    "notification_id": "NTF_3E7033A8-AB3E-44C0-A452-A38DB0ED3400",
                    "end_to_end_id": "3f67c271adbd48ddb6c21f77dd8de408",
                    "holder": {
                        "name": "API-PIX Payer Mock",
                        "tax_id": "***931180**"
                    }
                }
            }
        }
    ]
};

console.log('🚀 Testando webhook PagBank com dados reais...');
console.log('📊 Dados enviados:', JSON.stringify(pagbankData, null, 2));

const postData = JSON.stringify(pagbankData);

const options = {
    hostname: 'localhost',
    port: 5678,
    path: '/webhook-test/h8kNppxSWBIMyL07/pagbank-webhook',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
    }
};

const req = http.request(options, (res) => {
    console.log(`📡 Status: ${res.statusCode}`);
    console.log(`📋 Headers:`, res.headers);
    
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    
    res.on('end', () => {
        console.log('✅ Resposta recebida:');
        console.log(data);
    });
});

req.on('error', (e) => {
    console.error('❌ Erro na requisição:', e.message);
});

req.write(postData);
req.end();