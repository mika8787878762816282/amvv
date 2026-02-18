import fs from 'fs';
import path from 'path';

const N8N_HOST = 'https://app.n8nproagentvocal.com';
const PUBLIC_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlYzQ2YjA3Mi1lZDFmLTQ2NDgtODQ0NC01YjdkOGVlZjU0Y2EiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzY5Njg2NjgyLCJleHAiOjE3NzIyMzMyMDB9.66Z4Slu5B2c0XYcunpekKZLw6_dZEqCp7NVPYzAl33U';
const WORKFLOW_PATH = 'c:/Users/SAMUEL SIBONY/antigravity/amg-renovation/n8n/ai_visualisation.json';

async function importWorkflow() {
    try {
        console.log(`Importing workflow to ${N8N_HOST}...`);

        const workflowData = JSON.parse(fs.readFileSync(WORKFLOW_PATH, 'utf8'));

        // Ensure required fields are present
        workflowData.name = "AMG - Visualisation IA (Imported)";
        workflowData.settings = workflowData.settings || {
            executionOrder: 'v1',
            saveExecutionProgress: true,
            saveManualExecutions: true,
            callerPolicy: 'workflowsFromSameOwner'
        };

        delete workflowData.id; // Ensure it's treated as new

        const response = await fetch(`${N8N_HOST}/api/v1/workflows`, {
            method: 'POST',
            headers: {
                'X-N8N-API-KEY': PUBLIC_API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(workflowData)
        });

        const result = await response.json();

        if (response.ok) {
            console.log('Workflow IMPORTED successfully!');
            console.log('New Workflow ID:', result.id);
            console.log('Workflow Name:', result.name);
        } else {
            console.error('Failed to import workflow:', result);
        }
    } catch (error) {
        console.error('Error during workflow import:', error);
    }
}

importWorkflow();
