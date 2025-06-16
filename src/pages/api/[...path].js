import { createProxyMiddleware } from 'http-proxy-middleware';

// Create proxy instance
const apiProxy = createProxyMiddleware({
  target: 'http://localhost:5000',
  changeOrigin: true,
  pathRewrite: {
    '^/api': '', // Remove /api prefix when forwarding to backend
  },
});

// Export the proxy middleware
export default function handler(req, res) {
  // Don't allow non-API routes
  if (!req.url.startsWith('/api')) {
    return res.status(404).json({ error: 'Not found' });
  }

  // Forward the request to the backend
  return apiProxy(req, res);
}

// Configure the API route to handle all methods
export const config = {
  api: {
    bodyParser: false,
  },
}; 