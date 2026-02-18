import fs from 'fs';

const N8N_HOST = 'https://app.n8nproagentvocal.com';
const PUBLIC_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlYzQ2YjA3Mi1lZDFmLTQ2NDgtODQ0NC01YjdkOGVlZjU0Y2EiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzY5Njg2NjgyLCJleHAiOjE3NzIyMzMyMDB9.66Z4Slu5B2c0XYcunpekKZLw6_dZEqCp7NVPYzAl33U';

async function getWebhookUrls() {
    const targetIds = [
        'LVxyboyvTl30r7nf', 'm8e1uiT9iVzlJulk', 'S8HBsWTjvBFHu9F0',
        'iRvZ5VBDSWwjh7dh', 'rUmLAdE8d4b4FVEm', 'jAcYlND522basZBL'
    ];

    console.log(`Extracting webhook URLs for ${targetIds.length} workflows...`);

    for (const id of targetIds) {
        try {
            const response = await fetch(`${N8N_HOST}/api/v1/workflows/${id}`, {
                method: 'GET',
                headers: { 'X-N8N-API-KEY': PUBLIC_API_KEY }
            });

            const data = await response.json();
            if (response.ok) {
                const webhookNode = data.nodes.find(n => n.type === 'n8n-nodes-base.webhook');
                if (webhookNode) {
                    const path = webhookNode.parameters.path;
                    const method = webhookNode.parameters.httpMethod || 'GET';
                    // Construct production URL (n8n standard format)
                    const prodUrl = `${N8N_HOST}/webhook/${path}`;
                    console.log(`- ${data.name}: ${method} ${prodUrl}`);
                } else {
                    console.log(`- ${data.name}: (No Webhook Node found - might be Cron)`);
                }
            }
        } catch (error) {
            console.error(`Error processing ${id}:`, error);
        }
    }
}

getWebhookUrls();
