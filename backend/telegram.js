const https = require('https');

class TelegramNotifier {
  constructor() {
    require('dotenv').config();
    this.token = process.env.TELEGRAM_BOT_TOKEN;
    this.chatId = process.env.TELEGRAM_CHAT_ID;
  }

  sendMessage(message) {
    if (!this.token || !this.chatId || this.token === 'your_telegram_bot_token_here') {
      console.log('📱 [TELEGRAM MOCK] Message would be sent: ', message);
      return;
    }

    const url = `https://api.telegram.org/bot${this.token}/sendMessage`;
    const payload = JSON.stringify({
      chat_id: this.chatId,
      text: message,
      parse_mode: 'HTML'
    });

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = https.request(url, options, (res) => {
      res.on('data', () => {}); // consume data
    });

    req.on('error', (e) => {
      console.error('❌ [TELEGRAM ERROR]:', e.message);
    });

    req.write(payload);
    req.end();
  }

  notifySlotFound(slotData) {
    const text = `🚨 <b>SUPER FASAH - SLOT FOUND!</b> 🚨\n\n` +
                 `📍 <b>Port:</b> ${slotData.port}\n` +
                 `🕒 <b>Time:</b> ${slotData.time}\n` +
                 `📦 <b>Type:</b> ${slotData.type}\n\n` +
                 `⚡ Turbo Engine is ready to book. Check Dashboard!`;
    this.sendMessage(text);
  }
}

module.exports = new TelegramNotifier();
