// Deploy dist folder to Netlify using their API (no interactive CLI needed)
import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// We'll use Netlify's deploy API
// First, create a new site, then deploy files to it

const NETLIFY_API = 'https://api.netlify.com/api/v1';

async function getAllFiles(dir, base = dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            files.push(...await getAllFiles(fullPath, base));
        } else {
            const relativePath = '/' + path.relative(base, fullPath).replace(/\\/g, '/');
            const content = fs.readFileSync(fullPath);
            const sha1 = createHash('sha1').update(content).digest('hex');
            files.push({ path: relativePath, sha1, fullPath, size: content.length });
        }
    }
    return files;
}

async function deploy() {
    const distDir = path.join(__dirname, 'dist');

    console.log('📁 Scanning dist folder...');
    const files = await getAllFiles(distDir);
    console.log(`   Found ${files.length} files`);

    // Create file digest (path -> sha1 hash)
    const fileDigest = {};
    for (const f of files) {
        fileDigest[f.path] = f.sha1;
    }

    // Step 1: Create a new site (no auth needed for anonymous deploys)
    console.log('\n🌐 Creating new Netlify site...');
    const siteResponse = await fetch(`${NETLIFY_API}/sites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
    });

    if (!siteResponse.ok) {
        const err = await siteResponse.text();
        console.error('Failed to create site:', err);
        process.exit(1);
    }

    const site = await siteResponse.json();
    const siteId = site.id;
    const siteUrl = site.ssl_url || site.url;
    console.log(`   Site created: ${siteUrl}`);
    console.log(`   Site ID: ${siteId}`);

    // Step 2: Create a deploy with file digests
    console.log('\n📤 Creating deploy...');
    const deployResponse = await fetch(`${NETLIFY_API}/sites/${siteId}/deploys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            files: fileDigest
        })
    });

    if (!deployResponse.ok) {
        const err = await deployResponse.text();
        console.error('Failed to create deploy:', err);
        process.exit(1);
    }

    const deploy = await deployResponse.json();
    const deployId = deploy.id;
    const required = deploy.required || [];
    console.log(`   Deploy ID: ${deployId}`);
    console.log(`   Files to upload: ${required.length}/${files.length}`);

    // Step 3: Upload required files
    for (const sha of required) {
        const file = files.find(f => f.sha1 === sha);
        if (!file) continue;

        const content = fs.readFileSync(file.fullPath);
        console.log(`   Uploading: ${file.path} (${file.size} bytes)`);

        const uploadResponse = await fetch(`${NETLIFY_API}/deploys/${deployId}/files${file.path}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/octet-stream' },
            body: content
        });

        if (!uploadResponse.ok) {
            console.error(`   ❌ Failed to upload ${file.path}:`, await uploadResponse.text());
        }
    }

    // Step 4: Wait for deploy to be ready
    console.log('\n⏳ Waiting for deploy to be ready...');
    let attempts = 0;
    while (attempts < 30) {
        const statusResponse = await fetch(`${NETLIFY_API}/deploys/${deployId}`);
        const status = await statusResponse.json();

        if (status.state === 'ready') {
            console.log(`\n✅ Deployment complete!`);
            console.log(`🔗 URL: ${status.ssl_url || status.url}`);
            console.log(`\n📋 Site admin: https://app.netlify.com/sites/${site.name}`);
            return;
        }

        if (status.state === 'error') {
            console.error('❌ Deploy failed:', status.error_message);
            process.exit(1);
        }

        console.log(`   State: ${status.state}...`);
        await new Promise(r => setTimeout(r, 2000));
        attempts++;
    }

    console.log('⚠️ Deploy is taking longer than expected. Check the Netlify dashboard.');
    console.log(`   Site URL: ${siteUrl}`);
}

deploy().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
