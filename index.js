require('dotenv').config();
const express = require('express');
const axios = require('axios');
const crypto = require('crypto');

const app = express();
app.use(express.json());

// Env vars: WHATSAPP_TOKEN, PHONE_NUMBER_ID, VERIFY_TOKEN, APP_SECRET
const token = process.env.WHATSAPP_TOKEN;
const phoneNumberId = process.env.PHONE_NUMBER_ID;
const verifyToken = process.env.VERIFY_TOKEN;
const appSecret = process.env.APP_SECRET;

// Webhook verification (GET)
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const challenge = req.query['hub.challenge'];
  const vToken = req.query['hub.verify_token'];
  if (mode === 'subscribe' && vToken === verifyToken) {
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

// Verify signature helper (optional but recommended)
function verifySignature(req) {
  const signature = req.headers['x-hub-signature-256'];
  if (!signature) return false;
  const hmac = crypto.createHmac('sha256', appSecret || '');
  const payload = JSON.stringify(req.body);
  hmac.update(payload);
  const expected = 'sha256=' + hmac.digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch (e) {
    return false;
  }
}

// Webhook receiver (POST)
app.post('/webhook', (req, res) => {
  // If APP_SECRET is set, verify signature
  if (appSecret && !verifySignature(req)) {
    console.warn('Invalid signature');
    return res.sendStatus(403);
  }
  const body = req.body;
  // Maneja mensajes entrantes
  if (body.object && body.entry) {
    body.entry.forEach(entry => {
      (entry.changes || []).forEach(change => {
        const val = change.value;
        if (val && val.messages) {
          val.messages.forEach(message => {
            const from = message.from; // número del usuario
            const text = message.text && message.text.body;
            console.log('Mensaje entrante de', from, text);
            // Responde con eco (ejemplo)
            if (text) sendTextMessage(from, `Recibí: ${text}`).catch(console.error);
          });
        }
        // También puedes manejar status, delivery, etc. aquí
      });
    });
  }
  res.sendStatus(200);
});

async function sendTextMessage(to, text) {
  const url = `https://graph.facebook.com/v17.0/${phoneNumberId}/messages`;
  const payload = {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body: text }
  };
  const res = await axios.post(url, payload, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
  });
  return res.data;
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Listening ${PORT}`));
