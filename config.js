// config.js
require('dotenv').config();

const credentials = {
  'olukai-store.myshopify.com': {
    domain: process.env.OLUKAI_STORE_DOMAIN,
    key: process.env.OLUKAI_STORE_KEY,
    secret: process.env.OLUKAI_STORE_SECRET,
    token: process.env.OLUKAI_STORE_TOKEN,
  },
  'vip-olukai.myshopify.com': {
    domain: process.env.VIP_OLUKAI_DOMAIN,
    key: process.env.VIP_OLUKAI_KEY,
    secret: process.env.VIP_OLUKAI_SECRET,
    token: process.env.VIP_OLUKAI_TOKEN,
  },
  'ca-olukai.myshopify.com': {
    domain: process.env.CA_OLUKAI_DOMAIN,
    key: process.env.CA_OLUKAI_KEY,
    secret: process.env.CA_OLUKAI_SECRET,
    token: process.env.CA_OLUKAI_TOKEN,
  },
  'olukai-store-dev.myshopify.com': {
    domain: process.env.OLUKAI_STORE_DEV_DOMAIN,
    key: process.env.OLUKAI_STORE_DEV_KEY,
    secret: process.env.OLUKAI_STORE_DEV_SECRET,
    token: process.env.OLUKAI_STORE_DEV_TOKEN,
  }
};

const domainActions = {
    'olukai-store.myshopify.com': () => process.env.OLUKAI_STORE_ACCESS_TOKEN,
    'vip-olukai.myshopify.com': () => process.env.VIP_OLUKAI_ACCESS_TOKEN,
    'ca-olukai.myshopify.com': () => process.env.CA_OLUKAI_ACCESS_TOKEN,
    'olukai-store-dev.myshopify.com': () => process.env.OLUKAI_STORE_DEV_ACCESS_TOKEN
  }
  
  module.exports = { credentials, domainActions }
