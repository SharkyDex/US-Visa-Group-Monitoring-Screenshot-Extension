const express = require('express');
const multer = require('multer');
const fetch = require('node-fetch');
const cors = require('cors');
const FormData = require('form-data');

const app = express();
const upload = multer();

app.use(cors());

const BOT_TOKEN = '8467998828:AAE6IDBvcSI7M4k2cqDLTPE0e2PQ2Rn-Mc8';
const CHAT_ID = '-1002421392126'; 

app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const telegramUrl = `https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`;

    const form = new FormData();
    form.append('chat_id', CHAT_ID);
    form.append('photo', req.file.buffer, {
      filename: 'screenshot.jpg', 
      contentType: req.file.mimetype
    });

    const response = await fetch(telegramUrl, {
      method: 'POST',
      body: form
    });

    const result = await response.json();

    if (!response.ok || !result.ok) {
      console.error('Telegram error:', result);
      return res.status(500).send('Failed to send to Telegram');
    }

    res.send('Image sent successfully!');
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).send('Internal error');
  }
});

app.listen(3000, () => {
  console.log('Uploader running on http://localhost:3000');
});

