import express from "express";
import bodyParser from "body-parser";
import axios from "axios";

const app = express();
app.use(bodyParser.json());

const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

function sendWhatsApp(to, body) {
  return axios.post(
    `https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`,
    { messaging_product: "whatsapp", to, text: { body } },
    { headers: { Authorization: `Bearer ${ACCESS_TOKEN}` } }
  );
}

// --- 1. Verify webhook ---
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  if (mode === "subscribe" && token === VERIFY_TOKEN) res.status(200).send(challenge);
  else res.sendStatus(403);
});

// --- 2. Handle incoming messages ---
app.post("/webhook", async (req, res) => {
  try {
    const change = req.body.entry?.[0]?.changes?.[0]?.value;
    const msg = change?.messages?.[0];
    if (!msg) return res.sendStatus(200);

    const from = msg.from;
    const type = msg.type;
    const text = type === "text" ? msg.text.body.trim().toLowerCase() : null;

    console.log(`📩 From ${from}: ${text || type}`);

    // Voice message (Case 4 continuation)
    if (type === "audio") {
      await sendWhatsApp(from, "🎤 We received your voice message! Our team will reach you soon.");
      return res.sendStatus(200);
    }

    // Main Menu
    const menu = `👋 Hi, welcome to TROQ — one-tap service helper!\nHow may I help you today?\nOur services:\n1️⃣ Driver\n2️⃣ Airport Service\n3️⃣ Logistics\n4️⃣ Voice Message\n5️⃣ Call Request`;

    if (text === "hi" || text === "hello" || text === "0" || text === "menu") {
      await sendWhatsApp(from, menu);
    }

    // --- Case 1: Driver Service ---
    else if (text === "1" || text.includes("driver")) {
      await sendWhatsApp(from, "🚗 Thanks for choosing our Driver Service!\nPlease provide your details:\nPickup location:\nDrop location:\nTime & Date:");
    } else if (text.includes("pickup") && text.includes("drop")) {
      await sendWhatsApp(from, "✅ Thanks for confirming! We’ll assign a driver and update you within 10 minutes.");
    }

    // --- Case 2: Airport Service ---
    else if (text === "2" || text.includes("airport")) {
      await sendWhatsApp(from, "✈️ Thanks for choosing Airport Service.\nPlease let us know:\n1️⃣ Airport Pickup\n2️⃣ Airport Drop\nFor main menu, enter 0.");
    } else if (text.includes("pickup") || text.includes("drop")) {
      await sendWhatsApp(from, "✅ Thanks! Our team will contact you soon for your airport service.");
    }

    // --- Case 3: Logistics Service ---
    else if (text === "3" || text.includes("logistic")) {
      await sendWhatsApp(from, "📦 Thanks for choosing Logistics Service!\nPlease share your package details.\n(For main menu, enter 0)");
    } else if (text.includes("package") || text.includes("details")) {
      await sendWhatsApp(from, "✅ Thanks! Our logistics team will contact you shortly.");
    }

    // --- Case 4: Voice Message ---
    else if (text === "4" || text.includes("voice")) {
      await sendWhatsApp(from, "🎤 Please send a voice message. Our team will get back to you soon!");
    }

    // --- Case 5: Call Request ---
    else if (text === "5" || text.includes("call")) {
      await sendWhatsApp(from, "📞 Thanks for choosing Call Request. Our team will contact you shortly.");
    }

    // --- Default ---
    else {
      await sendWhatsApp(from, "🤖 Sorry, I didn’t understand that. Type 0 for the main menu.");
    }

    res.sendStatus(200);
  } catch (e) {
    console.error("Webhook error:", e.message);
    res.sendStatus(500);
  }
});

app.get("/", (req, res) => res.send("TROQ Bot (Meta-approval edition) is live."));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 TROQ Bot running on port ${PORT}`));
