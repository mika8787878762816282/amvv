import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const N8N_HOST = 'https://app.n8nproagentvocal.com';
const PUBLIC_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlYzQ2YjA3Mi1lZDFmLTQ2NDgtODQ0NC01YjdkOGVlZjU0Y2EiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzY5Njg2NjgyLCJleHAiOjE3NzIyMzMyMDB9.66Z4Slu5B2c0XYcunpekKZLw6_dZEqCp7NVPYzAl33U';

const WORKFLOWS = [
    'quote_generation.json',
    'invoice_generation.json',
    'facebook_autopost.json',
    'review_request.json',
    'facebook_scraper.json',
    'allovoisin_scraper.json',
];

async function deployAllWorkflows() {
    console.log(`\n🚀 Deploying ${WORKFLOWS.length} workflows to ${N8N_HOST}\n`);
    const results = [];

    for (const filename of WORKFLOWS) {
        const filePath = path.join(__dirname, filename);

        if (!fs.existsSync(filePath)) {
            console.error(`  ❌ File not found: ${filename}`);
            continue;
        }

        const workflowData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        // Remove any existing ID so n8n creates a new one
        delete workflowData.id;

        // Ensure settings
        workflowData.settings = workflowData.settings || {
            executionOrder: 'v1',
            saveManualExecutions: true,
            callerPolicy: 'workflowsFromSameOwner'
        };

        try {
            console.log(`  📤 Importing: ${workflowData.name}...`);

            const importResponse = await fetch(`${N8N_HOST}/api/v1/workflows`, {
                method: 'POST',
                headers: {
                    'X-N8N-API-KEY': PUBLIC_API_KEY,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(workflowData)
            });

            const importResult = await importResponse.json();

            if (!importResponse.ok) {
                console.error(`  ❌ Import failed for ${filename}:`, importResult.message || JSON.stringify(importResult));
                continue;
            }

            console.log(`  ✅ Imported: ${importResult.name} (ID: ${importResult.id})`);

            // Activate the workflow
            console.log(`  🔌 Activating...`);
            const activateResponse = await fetch(`${N8N_HOST}/api/v1/workflows/${importResult.id}/activate`, {
                method: 'POST',
                headers: {
                    'X-N8N-API-KEY': PUBLIC_API_KEY,
                    'Content-Type': 'application/json'
                }
            });

            if (activateResponse.ok) {
                console.log(`  ⚡ Activated!`);
            } else {
                const activateError = await activateResponse.json();
                console.warn(`  ⚠️ Activation warning:`, activateError.message || JSON.stringify(activateError));
            }

            // Extract webhook URL if applicable
            const webhookNode = workflowData.nodes.find(n => n.type === 'n8n-nodes-base.webhook');
            if (webhookNode) {
                const webhookUrl = `${N8N_HOST}/webhook/${webhookNode.parameters.path}`;
                console.log(`  🔗 Webhook URL: ${webhookUrl}`);
                results.push({ name: workflowData.name, id: importResult.id, webhook: webhookUrl });
            } else {
                results.push({ name: workflowData.name, id: importResult.id, webhook: '(no webhook)' });
            }

            console.log('');
        } catch (error) {
            console.error(`  ❌ Error deploying ${filename}:`, error.message);
        }
    }

    // Summary
    console.log('\n═══════════════════════════════════════════════');
    console.log('📋 DEPLOYMENT SUMMARY');
    console.log('═══════════════════════════════════════════════');
    for (const r of results) {
        console.log(`  ${r.name}`);
        console.log(`    ID: ${r.id}`);
        console.log(`    URL: ${r.webhook}`);
    }
    console.log(`\n✅ ${results.length}/${WORKFLOWS.length} workflows deployed successfully.\n`);
}

deployAllWorkflows();
