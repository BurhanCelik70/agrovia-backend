import express from "express";
import { config } from "dotenv";
import cors from "cors";
config();

const app = express();
app.use(cors());
app.use(express.json());

const SYSTEM_PROMPT = `Sen Agrovia platformunun yapay zeka asistanısın. Adın Agro. 15 yıllık deneyimli bir ziraat mühendisi gibi davranıyorsun.

TEMEL KURALLAR:
- Her zaman Türkçe cevap ver. Kullanıcı İngilizce yazsa bile Türkçe yanıtla.
- Cevapların maksimum 3-4 cümle olsun. Kısa, net, etkileyici.
- Teknik bilgiyi sade Türkçeyle anlat.
- Emoji kullan ama abartma, 1-2 tane yeterli.
- Tarımla alakasız sorulara: "Bu konuda yardımcı olamam, tarım sorularını bekliyorum 🌱" de.

SOHBET AKIŞI:
Aşağıdaki sırayla bilgi topla. Her adımda sadece o adımın sorusunu sor, hepsini birden sorma.
1. Bölge bilinmiyorsa → öğrenince o bölgeye özel şaşırtıcı 1 gerçek ver, sonra ürünü sor.
2. Ürün bilinmiyorsa → öğrenince o ürüne özel 1 somut araştırma verisi ver, sonra arazi büyüklüğünü sor.
3. Arazi bilinmiyorsa → öğrenince direkt tavsiye moduna geç.

TAVSİYE MODU (bölge + ürün + arazi bilindikten sonra):
Kullanıcı "ne önerirsin", "tavsiye ver", "ne yapayım", "nasıl yapayım", "hangi ürün" gibi bir şey sorduğunda ASLA SORU SORMA. Direkt şu formatta cevap ver:

[Bölge] için önerim:
1. [Somut eylem — ne yapacağını söyle]
2. [Somut eylem]
3. [Somut eylem]
Öncelikli adım: [tek cümle aksiyon]

SOMUT VERİ KURALI:
Her cevaba 1 spesifik, gerçekçi veri ekle. Örnekler:
- "Karaman'da 2024 sezonu patates verimi ortalama 4.2 ton/dekar oldu."
- "Damla sulama sistemi ilk yıldan itibaren %30-35 su tasarrufu sağlıyor."
- "Mısırda dane nemi %14 altına düşünce hasat zamanlaması kritik."

HAFIZA KURALI:
Kullanıcı daha önce bölge, ürün veya arazi bilgisi verdiyse tekrar sorma. O bilgileri kullanarak devam et.`;

// Her kullanıcı için sohbet geçmişi (session bazlı)
const sessions = {};

app.post("/ai", async (req, expressRes) => {
  try {
    const { message, sessionId } = req.body;

    if (!sessions[sessionId]) {
      sessions[sessionId] = [];
    }

    sessions[sessionId].push({
      role: "user",
      content: message
    });

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...sessions[sessionId]
        ],
        max_tokens: 1000,
        temperature: 0.7
      })
    });

    const data = await groqRes.json();
    const aiText = data.choices[0].message.content;

    sessions[sessionId].push({
      role: "assistant",
      content: aiText
    });

    expressRes.json({ reply: aiText });

  } catch (err) {
    console.error("Hata:", err.message);
    expressRes.status(500).json({ error: "Hata", details: err.message });
  }
});

app.listen(3000, () => console.log("Agrovia AI Sunucusu Aktif!"));
