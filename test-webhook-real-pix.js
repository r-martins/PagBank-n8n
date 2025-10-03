const http = require('http');

// Dados reais do PagBank PIX pago
const pagbankData = {
    "id": "ORDE_227492CB-4B55-4A5A-B0E1-2F3B90C2195F",
    "reference_id": "453",
    "created_at": "2023-08-04T00:31:47.434-03:00",
    "customer": {
        "name": "João dos Téstes",
        "email": "teste202228103@ricardomar2tins.net.br",
        "tax_id": "95840332399"
    },
    "items": [
        {
            "reference_id": "307",
            "name": "Ebook Sucesso nas vendas",
            "quantity": 1,
            "unit_amount": 100
        }
    ],
    "shipping": {
        "address": {
            "street": "Rua da Sé",
            "number": "123",
            "locality": "Boqueirão",
            "city": "São Paulo",
            "region_code": "SP",
            "country": "BRA",
            "postal_code": "11045510"
        }
    },
    "qr_codes": [
        {
            "id": "QRCO_3CC1C687-4B2D-4B8B-918E-C14E698CF090",
            "expiration_date": "2023-08-05T00:31:45.000-03:00",
            "amount": {
                "value": 100
            },
            "text": "00020101021226830014br.gov.bcb.pix2561api.pagseguro.com/pix/v2/3CC1C687-4B2D-4B8B-918E-C14E698CF09027600016BR.COM.PAGSEGURO01363CC1C687-4B2D-4B8B-918E-C14E698CF09052048999530398654041.005802BR5922Ricardo Felipe Noronha6006Santos62070503***63042460",
            "arrangements": [
                "PIX"
            ],
            "links": [
                {
                    "rel": "QRCODE.PNG",
                    "href": "https://api.pagseguro.com/qrcode/QRCO_3CC1C687-4B2D-4B8B-918E-C14E698CF090/png",
                    "media": "image/png",
                    "type": "GET"
                },
                {
                    "rel": "QRCODE.BASE64",
                    "href": "https://api.pagseguro.com/qrcode/QRCO_3CC1C687-4B2D-4B8B-918E-C14E698CF090/base64",
                    "media": "text/plain",
                    "type": "GET"
                }
            ]
        }
    ],
    "notification_urls": [
        "https://webhook.site/57730f29-ac28-4580-a92c-2f3d8fe004b5/?wc_api=rm_ps_notif&hash=1ba7d"
    ],
    "links": [
        {
            "rel": "SELF",
            "href": "https://api.pagseguro.com/orders/ORDE_227492CB-4B55-4A5A-B0E1-2F3B90C2195F",
            "media": "application/json",
            "type": "GET"
        },
        {
            "rel": "PAY",
            "href": "https://api.pagseguro.com/orders/ORDE_227492CB-4B55-4A5A-B0E1-2F3B90C2195F/pay",
            "media": "application/json",
            "type": "POST"
        }
    ],
    "charges": [
        {
            "id": "CHAR_4D7CED5B-026D-47D5-99DE-5424DA30E0C4",
            "reference_id": "453",
            "status": "PAID",
            "created_at": "2023-08-04T00:33:36.811-03:00",
            "paid_at": "2023-08-04T00:33:37.966-03:00",
            "amount": {
                "value": 100,
                "currency": "BRL",
                "summary": {
                    "total": 100,
                    "paid": 100,
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
                    "notification_id": "NTF_971CB7A8-DCD7-4AE9-812B-39C43CAE7E04",
                    "end_to_end_id": "E60746948202308040333A2843DYY5IA",
                    "holder": {
                        "name": "RICARDO FELIPE NORONHA MARTINS          ",
                        "tax_id": "***644818**"
                    }
                }
            },
            "links": [
                {
                    "rel": "SELF",
                    "href": "https://api.pagseguro.com/charges/CHAR_4D7CED5B-026D-47D5-99DE-5424DA30E0C4",
                    "media": "application/json",
                    "type": "GET"
                },
                {
                    "rel": "CHARGE.CANCEL",
                    "href": "https://api.pagseguro.com/charges/CHAR_4D7CED5B-026D-47D5-99DE-5424DA30E0C4/cancel",
                    "media": "application/json",
                    "type": "POST"
                }
            ],
            "metadata": {}
        }
    ]
};

console.log('🚀 Testando webhook PagBank com dados reais de PIX pago...');
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
