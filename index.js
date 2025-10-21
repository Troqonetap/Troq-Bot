import express from "express";
import bodyParser from "body-parser";
import axios from "axios";

const app = express();
app.use(bodyParser.json());

// 🔐 Environment Variables
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

// ✅ 1️⃣ Webhook Verification (Meta checks this once)
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ Webhook verified successfully!");
    res.status(200).send(challenge);
  } else {
    console.log("❌ Webhook verification failed!");
    res.sendStatus(403);
  }
});

// ✅ 2️⃣ Receive Incoming Messages from WhatsApp
app.post("/webhook", async (req, res) => {
  try {
    const data = req.body;
    console.log("📩 Incoming Message:", JSON.stringify(data, null, 2));

    if (data.entry && data.entry[0].changes && data.entry[0].changes[0].value.messages) {
      const message = data.entry[0].changes[0].value.messages[0];
      const from = message.from; // Customer’s phone number
      const type = message.type;

      if (type === "text") {
        const text = message.text.body.toLowerCase();
        console.log(`💬 Text message from ${from}: ${text}`);

        // Simple Auto Reply
        await sendMessage(from, `Hello 👋 This is TROQ Bot!\nYou said: ${text}`);
      } 
      else if (type === "audio") {
        console.log(`🎧 Voice message received from ${from}`);
        await sendMessage(from, "🎤 We received your voice message! Our team will check it soon.");
      } 
      else {
        await sendMessage(from, "⚙️ TROQ bot currently supports text and voice messages only.");
      }
    }

    res.sendStatus(200);
  } catch (error) {
    console.error("❌ Error processing webhook:", error.message);
    res.sendStatus(500);
  }
});

// ✅ 3️⃣ Function to Send WhatsApp Message
async function sendMessage(to, message) {
  try {
    const url = `https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`;

    const payload = {
      messaging_product: "whatsapp",
      to: to,
      text: { body: message },
    };

    await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
    });

    console.log(`✅ Message sent to ${to}`);
  } catch (err) {
    console.error("❌ Failed to send message:", err.response?.data || err.message);
  }
}

// ✅ 4️⃣ Start the Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 TROQ Webhook running on port ${PORT}`));
