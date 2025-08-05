const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

// Proxy configuration
const proxyConfig = {
  '/api': {
    target: 'http://localhost:8000',
    changeOrigin: true,
    pathRewrite: {
      '^/api': ''
    }
  }
};

// Middleware to handle subdomain routing
app.use((req, res, next) => {
  const host = req.get('host');
  const subdomain = host.split('.')[0];
  
  // Route based on subdomain
  if (subdomain === 'app') {
    // Route to app (port 3001)
    createProxyMiddleware({
      target: 'http://localhost:3001',
      changeOrigin: true,
      ws: true, // Enable WebSocket proxying for Next.js dev server
    })(req, res, next);
  } else if (subdomain === 'localhost' || subdomain === 'www') {
    // Route to marketing site (port 3000)
    createProxyMiddleware({
      target: 'http://localhost:3000',
      changeOrigin: true,
      ws: true,
    })(req, res, next);
  } else {
    // Default to marketing site
    createProxyMiddleware({
      target: 'http://localhost:3000',
      changeOrigin: true,
      ws: true,
    })(req, res, next);
  }
});

const PORT = process.env.PORT || 3080;

app.listen(PORT, () => {
  console.log(`🚀 Development proxy server running on port ${PORT}`);
  console.log(`📱 Marketing site: http://localhost:${PORT}`);
  console.log(`🎯 App: http://app.localhost:${PORT}`);
  console.log(`\n💡 Make sure to add this line to your /etc/hosts file:`);
  console.log(`127.0.0.1 app.localhost`);
});