const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, delay } = require('@whiskeysockets/baileys');
const pino = require('pino');
const readline = require('readline');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (text) => new Promise((resolve) => rl.question(text, resolve));

async function startBunnyBot() {
    const { state, saveCreats } = await useMultiFileAuthState('./bunny_auth_session');
    const method = process.argv[2]; // Captura el método desde la terminal

    const sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        printQRInTerminal: method === 'qr', // Solo muestra QR si el argumento es 'qr'
        auth: state,
        browser: ['BunnyGirl-Bot', 'Chrome', '1.0.0']
    });

    // MODO 2: Código de vinculación (Pairing Code)
    if (method === 'code' && !sock.authState.creds.registered) {
        console.clear();
        const phoneNumber = await question('🐰 Ingrese su número de WhatsApp con código de país (Ej: 58412xxxxxxx):\n> ');
        const cleanNumber = phoneNumber.replace(/[^0-9]/g, '');
        
        await delay(3000);
        const code = await sock.requestPairingCode(cleanNumber);
        console.log(`\n✨ Tu código de vinculación para Bunny girl-bot es: \x1b[32m${code}\x1b[0m\n`);
    }

    sock.ev.on('creds.update', saveCreats);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('🐰 Conexión cerrada. Reconectando...', shouldReconnect);
            if (shouldReconnect) startBunnyBot();
        } else if (connection === 'open') {
            console.log('🐰 ¡Bunny girl-bot 🐰 se ha conectado exitosamente a WhatsApp!');
        }
    });

    // Receptor de mensajes básicos
    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const text = msg.message.conversation || msg.message.extendedTextMessage?.text;
        const from = msg.key.remoteJid;

        if (text === '.ping') {
            await sock.sendMessage(from, { text: '🐰 ¡Bunny girl-bot activo! Pong.' }, { quoted: msg });
        }
    });
}

startBunnyBot();
