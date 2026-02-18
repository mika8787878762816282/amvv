import fs from 'fs';
import path from 'path';

const N8N_HOST = 'https://app.n8nproagentvocal.com';
const PUBLIC_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlYzQ2YjA3Mi1lZDFmLTQ2NDgtODQ0NC01YjdkOGVlZjU0Y2EiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzY5Njg2NjgyLCJleHAiOjE3NzIyMzMyMDB9.66Z4Slu5B2c0XYcunpekKZLw6_dZEqCp7NVPYzAl33U';

async function activateWorkflows() {
    const targetIds = [
        'LVxyboyvTl30r7nf', 'm8e1uiT9iVzlJulk', 'S8HBsWTjvBFHu9F0',
        'iRvZ5VBDSWwjh7dh', 'rUmLAdE8d4b4FVEm', 'jAcYlND522basZBL'
    ];

    console.log(`Starting activation for ${targetIds.length} workflows...`);

    for (const id of targetIds) {
        try {
            console.log(`Activating ID: ${id}...`);
            const response = await fetch(`${N8N_HOST}/api/v1/workflows/${id}/activate`, {
                method: 'POST',
                headers: {
                    'X-N8N-API-KEY': PUBLIC_API_KEY,
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();

            if (response.ok) {
                console.log(`[SUCCESS] Workflow ${id} activated.`);
            } else {
                console.error(`[FAILED] Workflow ${id} activation:`, result.message || result);
            }
        } catch (error) {
            console.error(`Error activating ${id}:`, error);
        }
    }
}

activateWorkflows();
