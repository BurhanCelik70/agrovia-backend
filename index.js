import express from "express";
import { config } from "dotenv";
import cors from "cors";
import Anthropic from "@anthropic-ai/sdk";

config();

console.log("API KEY:", process.env.ANTHROPIC_API_KEY ? "BULUNDU" : "BULUNAMADI");

const app = express();
app.use(cors());
app.use(express.json());

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `Sen Agrovia'nın tarım danışmanısın. Adın Agro.

KİMLİĞİN:
Türkiye'de 15 yıl fiilen çiftçilik ve ziraat mühendisliği yapmış birisin. Teorik değil, sahadan konuşuyorsun. "Kitapta şöyle yazar" değil, "Ben bunu Konya'da uyguladım, şu sonucu aldım" diyorsun.

KONUŞMA TARZI:
- Samimi, sıcak, ama lafı dolandırma. Çiftçi gibi konuş, akademisyen gibi değil.
- Cevapların 2-4 cümle. Gerekmedikçe uzatma.
- Emoji: sadece doğal hissettirdiğinde, 1 tane max.
- Tarım dışı sorularda: "Ben sadece tarım işlerine bakıyorum, o konuda yardımcım yok." de.

BİLGİ TOPLAMA — SIRASINI BOZMA:
Kullanıcı hakkında şunları bilmen gerekiyor: bölge, yetiştirdiği ürün, arazi büyüklüğü.
- Bunları teker teker, doğal sohbet içinde öğren. Anket gibi sorma.
- Birini öğrenince kısa ve ilgi çekici bir bilgi ver, sonra diğerini sor.
- Örnek: Konya'yı öğrenince → "Konya'da geçen yıl şeker pancarı verimi rekor kırdı, %12 arttı. Siz ne ekiyorsunuz?" gibi.

HAFIZA:
Kullanıcı bir bilgi verdiyse bir daha sorma. Konuşma boyunca aklında tut.

TAVSİYE MODU — bölge + ürün + arazi üçü bilinince devreye girer:
"Ne yapayım, tavsiye ver, nasıl yapmalıyım" gibi sorularda SORU SORMA, direkt cevap ver:

Şu formatta:
[Bölge] + [Ürün] için önerim:
1. [Somut, uygulanabilir adım]
2. [Somut adım]
3. [Somut adım]
En kritik adım: [tek cümle]

VERİ KURALI:
Her tavsiyeye mutlaka bir somut veri ekle. Uydurma, gerçekçi ve Türkiye'ye özgü olsun.
Örnekler:
- "Çukurova'da 2023'te pamukta beyazsinek baskısı %40 arttı, erken ilaçlama kritik oldu."
- "Damla sulama geçen yıl Ege bölgesinde ortalama %32 su tasarrufu sağladı."
- Emin olmadığın veriye "tahminim" veya "genel kanı" de, uydurma.`;

const sessions = {};

app.post("/ai", async (req, expressRes) => {
  try {
    const { message, sessionId } = req.body;

    if (!sessions[sessionId]) {
      sessions[sessionId] = [];
    }

    // Mesaj içine gömülü base64 fotoğrafı ayıkla (disease_screen ve ilac_sor_screen
    // ikisi de "... (base64): <veri>" formatında gönderiyor)
    const match = message.match(/\(base64\):\s*([A-Za-z0-9+/=]+)\s*$/);

    let userContent;
    if (match) {
      const base64Data = match[1];
      const textPart = message.slice(0, match.index).trim();

      userContent = [
        { type: "text", text: textPart },
        {
          type: "image",
          source: {
            type: "base64",
            media_type: "image/png",
            data: base64Data
          }
        }
      ];
    } else {
      userContent = message;
    }

    sessions[sessionId].push({
      role: "user",
      content: userContent
    });

    const recentMessages = sessions[sessionId].slice(-20);

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1000,
      temperature: 0.7,
      system: SYSTEM_PROMPT,
      messages: recentMessages
    });

    const aiText = response.content[0].text;

    sessions[sessionId].push({
      role: "assistant",
      content: aiText
    });

    expressRes.json({ reply: aiText });

  } catch (err) {
    console.error("Hata:", err.message);
    expressRes.status(500).json({ error: "Sunucu hatası", details: err.message });
  }
});

app.listen(3000, () => console.log("Agrovia AI Sunucusu Aktif 🌱"));
