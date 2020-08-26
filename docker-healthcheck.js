const http = require('http');

const path = process.env.HEALTHCHECK_PATH || '/healthcheck';
const port = process.env.DEFAULT_HTTP_PORT || 4000;
const options = {
  host: '0.0.0.0',
  port: port,
  path: path,
  timeout: 2000,
};

const healthCheck = http.request(options, (response) => {

    // check for valid response
    if (response.statusCode === 200) {
      process.exit(0);
    }

    console.log(`HEALTHCHECK INVALID: ${response.statusCode}`);
    process.exit(1);
});

healthCheck.on('error', function (error) {
  console.error('HEALTHCHECK ERROR');
  process.exit(1);
});

healthCheck.end();