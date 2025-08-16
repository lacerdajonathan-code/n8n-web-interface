const express = require('express');
const axios = require('axios');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const N8N_MCP_URL = process.env.N8N_MCP_URL || 'https://n8n-mcp-production-3cbe.up.railway.app';

// Middleware
app.use(helmet({
  contentSecurityPolicy: false
}));
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Proxy para n8n-MCP
app.post('/api/mcp', async (req, res) => {
  try {
    console.log('MCP Request:', req.body.method);
    const response = await axios.post(N8N_MCP_URL, req.body, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
    res.json(response.data);
  } catch (error) {
    console.error('MCP Error:', error.message);
    res.status(500).json({ 
      error: 'Falha ao conectar com n8n-MCP',
      details: error.message,
      url: N8N_MCP_URL
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    n8n_mcp_url: N8N_MCP_URL
  });
});

// Info da API
app.get('/api/info', (req, res) => {
  res.json({
    name: 'N8N Web Interface',
    version: '1.0.0',
    n8n_mcp_url: N8N_MCP_URL,
    endpoints: ['/api/mcp', '/health']
  });
});

// Serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 N8N Web Interface rodando na porta ${PORT}`);
  console.log(`🔗 N8N-MCP URL: ${N8N_MCP_URL}`);
});
