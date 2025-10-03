const axios = require('axios');

async function testWebhook() {
    try {
        const webhookUrl = 'http://localhost:5678/webhook-test/0d01ab42-35de-4b91-a13a-6adf4d37119d/pagbank-webhook';
        
        console.log('🔍 Testing webhook with sample data...');
        
        const response = await axios.post(webhookUrl, {
            test: true
        }, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ Webhook response:', response.data);
        
    } catch (error) {
        console.log('❌ Error testing webhook:', error.message);
    }
}

testWebhook();
