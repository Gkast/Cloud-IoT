const http = require('http');

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/health',
    method: 'GET',
};

const req = http.request(options, (res) => {
    console.log(res.statusCode)
    if (res.statusCode === 200) {
        console.log('Health check succeeded: Node.js application is healthy.');
        process.exit(0);
    } else {
        console.error('Health check failed: Node.js application is unhealthy.');
        process.exit(1);
    }
});

req.on('error', () => {
    console.error('Health check failed due to an error:', error);
    process.exit(1);
});

req.end();