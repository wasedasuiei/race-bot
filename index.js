const express = require('express');
const { google } = require('googleapis');
const line = require('@line/bot-sdk');
const path = require('path');

const app = express();
const port = process.env.PORT;

// Googleスプレッドシート設定
const KEYFILEPATH = path.join(__dirname, 'raceanalysisbot-461100-94f4c3011031.json');
const SPREADSHEET_ID = '1oY3EgNWp3rzgCILgOdnFEM4J9iPPFE238BYipOEziVc';

// LINE設定
const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};

const client = new line.Client(config);

// ✅ Webhookエンドポイントにのみ middleware を使用
app.post('/webhook', line.middleware(config), async (req, res) => {
  try {
    const events = req.body.events;
    for (const event of events) {
      if (event.type === 'message' && event.message.type === 'text') {
        const keyword = event.message.text.trim();
        const replyMessage = await createReplyMessage(keyword);

        if (replyMessage) {
          await client.replyMessage(event.replyToken, replyMessage);
        } else {
          await client.replyMessage(event.replyToken, {
            type: 'text',
            text: `「${keyword}」の分析結果は見つかりませんでした。`
          });
        }
      }
    }
    res.sendStatus(200);
  } catch (error) {
    console.error('❌ Error in webhook handler:', error);
    res.sendStatus(500);
  }
});

// ✅ Googleスプレッドシートからデータ取得
async function getSheetData() {
  const auth = new google.auth.GoogleAuth({
    keyFile: KEYFILEPATH,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const authClient = await auth.getClient();
  const sheets = google.sheets({ version: 'v4', auth: authClient });

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'シート1!A1:J1000',
  });

  return res.data.values || [];
}

// ✅ Flex Messageの作成
function createFlexLinks(rows, keyword) {
  const buttons = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const player = row[0] || '';
    const raceName = row[2] || '';
    const raceDate = row[4] || '';
    const url = row[6] || '';

    if (player.includes(keyword) && url) {
      buttons.push({
        type: "button",
        action: {
          type: "uri",
          label: `${raceName} (${raceDate})`,
          uri: url
        },
        margin: "md"
      });
    }
  }

  if (buttons.length === 0) return null;

  return {
    type: "flex",
    altText: `${keyword}の分析結果`,
    contents: {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        contents: buttons
      }
    }
  };
}

// ✅ 返信メッセージ作成
async function createReplyMessage(keyword) {
  const rows = await getSheetData();
  return createFlexLinks(rows, keyword);
}

// ✅ サーバー起動（PORTはRender指定）
app.listen(port, () => {
  console.log(`✅ Server is running on port ${port}`);
});



