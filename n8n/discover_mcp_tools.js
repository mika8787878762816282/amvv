const MCP_URL = 'https://app.n8nproagentvocal.com/mcp-server/http';
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlYzQ2YjA3Mi1lZDFmLTQ2NDgtODQ0NC01YjdkOGVlZjU0Y2EiLCJpc3MiOiJuOG4iLCJhdWQiOiJtY3Atc2VydmVyLWFwaSIsImp0aSI6IjdlM2Y1YzMwLTI1MzktNGViMy05NDEyLWUwY2RkZjkwZWY5NiIsImlhdCI6MTc2OTY4NTgyN30.jrad4pppjwRuZDs8SKObNE2o89XknzbpcyTK1hZqNlY';

async function discoverTools() {
    try {
        console.log(`Querying tools from ${MCP_URL} with NEW token and headers...`);
        const response = await fetch(MCP_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${TOKEN}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json, text/event-stream'
            },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'tools/list',
                params: {},
                id: 1
            })
        });

        const text = await response.text();
        console.log(`Status: ${response.status}`);
        console.log(`Response: ${text.substring(0, 1000)}${text.length > 1000 ? '...' : ''}`);

    } catch (error) {
        console.error('Error discovering tools:', error);
    }
}

discoverTools();
