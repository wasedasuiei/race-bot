const express = require('express');
const { google } = require('googleapis');
const line = require('@line/bot-sdk');
const path = require('path');

const app = express();
const port = process.env.PORT;

// Googleスプレッドシート設定
const KEYFILEPATH = path.join(__dirname, 'raceanalysisbot-461100-94f4c3011031.json'); // あなたの認証JSONファイル名
const SPREADSHEET_ID = '1oY3EgNWp3rzgCILgOdnFEM4J9iPPFE238BYipOEziVc'; // スプレッドシートID

// LINE設定
const config = {
  channelAccessToken: 'RtqsdAs4xmnJZYnyJ03p5Nuo7zTaImbCyFrPcxQrLBXXRz0y7G4GlU9qnbb8kYZ2spKu0ZLvnANAND5SF0a1jGhoI+CMY6fTRNtmPK8jRAtnHSgUMHivk7huxkEVwK4KCW+KeJi9JeTmdDTGziJInQdB04t89/1O/w1cDnyilFU=',
  channelSecret: '269dad14802814e711d95cc535d34868',
};

const client = new line.Client(config);

app.post('/webhook', express.json(), line.middleware(config), async (req, res) => {
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
    console.error(error);
    res.sendStatus(500);
  }
});

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

function createFlexLinks(rows, keyword) {
  const buttons = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row[0] && row[0].includes(keyword)) {
      const raceName = row[2] || '-';
      const raceDate = row[4] || '-';
      buttons.push({
        type: "button",
        action: {
          type: "uri",
          label: `${raceName} (${raceDate})`,
          uri: row[6] || 'https://example.com',
        }
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
        contents: [
          {
            type: "box",
            layout: "vertical",
            margin: "md",
            contents: buttons
          }
        ]
      }
    }
  };
}

async function createReplyMessage(keyword) {
  const rows = await getSheetData();
  return createFlexLinks(rows, keyword);
}

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});


