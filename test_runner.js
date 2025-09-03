// Quick test script for Runner API
const fetch = require('node-fetch'); // You might need: npm install node-fetch@2

const RUNNER_URL = 'http://127.0.0.1:3002';

async function testRunnerAPI() {
    console.log('🧪 Testing Runner API...');
    
    try {
        // Test 1: Health check
        console.log('\n1️⃣ Testing health endpoint...');
        const healthResponse = await fetch(`${RUNNER_URL}/api/runner/health`);
        if (healthResponse.ok) {
            const health = await healthResponse.json();
            console.log('✅ Health check passed:', health);
        } else {
            console.log('❌ Health check failed:', healthResponse.status);
            return;
        }
        
        // Test 2: List processes
        console.log('\n2️⃣ Testing list endpoint...');
        const listResponse = await fetch(`${RUNNER_URL}/api/runner/list`);
        if (listResponse.ok) {
            const list = await listResponse.json();
            console.log('✅ List processes:', list);
        } else {
            console.log('❌ List failed:', listResponse.status);
        }
        
        // Test 3: Launch a simple command (dir on Windows)
        console.log('\n3️⃣ Testing process launch...');
        const launchResponse = await fetch(`${RUNNER_URL}/api/runner/launch`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                id: 'test_dir',
                cmd: 'cmd',
                args: ['/c', 'dir'],
                shell: false
            })
        });
        
        if (launchResponse.ok) {
            const launch = await launchResponse.json();
            console.log('✅ Process launched:', launch);
            
            // Wait a bit, then check logs
            console.log('\n4️⃣ Checking logs after 2 seconds...');
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Note: SSE testing would require EventSource, which is browser-only
            // For now, just confirm the launch worked
            console.log('✅ Launch test completed (check Runner API console for logs)');
            
        } else {
            const error = await launchResponse.text();
            console.log('❌ Process launch failed:', error);
        }
        
    } catch (error) {
        console.log('❌ Test failed:', error.message);
        console.log('\n💡 Make sure Runner API is running:');
        console.log('   start_runner.bat');
    }
}

// Run if called directly
if (require.main === module) {
    testRunnerAPI();
}

module.exports = { testRunnerAPI };