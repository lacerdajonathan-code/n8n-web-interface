const express = require('express');
const axios = require('axios');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const N8N_MCP_BASE_URL = process.env.N8N_MCP_URL || 'https://n8n-mcp-production-3cbe.up.railway.app';
const N8N_MCP_URL = `${N8N_MCP_BASE_URL}/mcp`;  // Endpoint correto
const N8N_API_KEY = process.env.N8N_API_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhYTZjZGYwNy03YmRjLTRiODItODc5Zi1kMThiYWU3ZDkzOTUiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU1MzIzOTgxfQ.nhmavwjCB_2WnY22wM3ekmXz9QpHINSCFcNTMDrSJCA';

// Middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: false
}));
app.use(cors({
  origin: '*',
  credentials: false
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Teste de conectividade com n8n-MCP
app.get('/api/test-mcp', async (req, res) => {
  try {
    // Testar endpoint base
    const baseResponse = await axios.get(N8N_MCP_BASE_URL);
    
    // Testar endpoint MCP
    const mcpResponse = await axios.get(N8N_MCP_URL);
    
    res.json({ 
      status: 'success',
      base_url: N8N_MCP_BASE_URL,
      mcp_url: N8N_MCP_URL,
      base_response: baseResponse.data,
      mcp_response: mcpResponse.data
    });
  } catch (error) {
    res.json({ 
      status: 'error',
      url: N8N_MCP_URL,
      error: error.message,
      code: error.code,
      response: error.response?.data
    });
  }
});

// Proxy para n8n-MCP com autenticação correta
app.post('/api/mcp', async (req, res) => {
  try {
    console.log('📨 MCP Request:', {
      method: req.body.method,
      url: N8N_MCP_URL,
      timestamp: new Date().toISOString()
    });

    // Formato JSON-RPC correto
    const mcpRequest = {
      jsonrpc: "2.0",
      id: Date.now(),
      method: req.body.method,
      params: req.body.params || {}
    };

    // Headers com autenticação Bearer
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${N8N_API_KEY}`
    };

    const response = await axios.post(N8N_MCP_URL, mcpRequest, {
      headers: headers,
      timeout: 30000
    });

    console.log('✅ MCP Success:', {
      status: response.status,
      method: req.body.method
    });

    res.json(response.data);

  } catch (error) {
    console.error('❌ MCP Error:', {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      data: error.response?.data
    });

    res.status(500).json({ 
      error: 'Falha ao conectar com n8n-MCP',
      details: error.message,
      url: N8N_MCP_URL,
      status: error.response?.status,
      responseData: error.response?.data
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    n8n_mcp_base: N8N_MCP_BASE_URL,
    n8n_mcp_endpoint: N8N_MCP_URL,
    environment: process.env.NODE_ENV || 'development'
  });
});

// Info da API
app.get('/api/info', (req, res) => {
  res.json({
    name: 'N8N Web Interface',
    version: '1.0.0',
    n8n_mcp_base: N8N_MCP_BASE_URL,
    n8n_mcp_endpoint: N8N_MCP_URL,
    endpoints: ['/api/mcp', '/api/test-mcp', '/health']
  });
});

// Serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.lis
