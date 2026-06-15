// config.js — Client-specific configuration.
// THE ONLY FILE THAT CHANGES WHEN DEPLOYING FOR A NEW CLIENT.
// Contains exactly two values: WEBHOOK_URL and DATA_URL. Nothing else.
// For local development, these are hardcoded.
// For production in Coolify, set these via environment variables.

// Detect environment: if running in Coolify, use window location; otherwise use local defaults
const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';

const WEBHOOK_URL = isProduction
  ? (window.__ENV_WEBHOOK_URL || 'https://n8n.cubby.ma/webhook/refresh-report')
  : 'https://n8n.cubby.ma/webhook/refresh-report';

const DATA_URL = isProduction
  ? (window.__ENV_DATA_URL || '/api/data')
  : 'http://127.0.0.1:3001';
