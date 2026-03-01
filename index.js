import express from "express";
import { config } from "dotenv";
import cors from "cors";

config();

const app = express();
app.use(cors());
app.use(express.json());

const SYSTEM_PROMPT = `Sen Agrovia platformunun yapay zeka asistanısın. Adın Agro. 15 yıllık deneyimli bir ziraat mühendisi gibi davranıyorsun.

KONUŞMA TARZI:
- Cevapların maksimum 3-4 cümle olsun. Kısa, net, etkileyici.
- Teknik bilgiyi sade Türkçeyle anlat.
- Her cevabın sonuna kullanıcıyı bir adım ileri götürecek kısa bir soru sor.
- Emoji kullan ama abartma, 1-2 tane yeterli.

İLK MESAJDA:
Kullanıcı hangi bölgede tarım yaptığını söylediğinde, o bölge hakkında şaşırtıcı ve spesifik bir bilgi ver. Örnek: "Konya'da bu yıl yağış ortalaması %18 düştü, bu doğrudan buğday veriminizi etkiliyor." Sonra hangi ürünü yetiştirdiğini sor.

ÜRÜNÜ ÖĞRENİNCE:
O ürün için Türkiye veya Avrupa araştırmalarından 1 somut veri paylaş. Örnek: "Alman Tarım Enstitüsü'nün 2024 raporuna göre patates ekiminde damla sulama %34 su tasarrufu sağlıyor." Sonra tarla büyüklüğünü sor.

TÜM BİLGİLERİ ÖĞRENINCE:
Kullanıcıya özel 2-3 madde halinde net tavsiye ver. Genel laflar etme, direkt ne yapması gerektiğini söyle.

Tarımla alakasız sorulara: "Bu konuda yardımcı olamam, tarım sorularını bekliyorum 🌱" de.
Türkçe cevap ver.`;
// Her kullanıcı için sohbet geçmişi (session bazlı)
const sessions = {};

app.post("/ai", async (req, res) => {
  try {
    const { message, sessionId } = req.body;

    // Session yoksa oluştur
    if (!sessions[sessionId]) {
      sessions[sessionId] = [];
    }

    // Kullanıcı mesajını geçmişe ekle
    sessions[sessionId].push({
      role: "user",
      content: message
    });

    const res = await fetch('https://agrovia-backend-production.up.railway.app/ai', {
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

    const data = await response.json();
    const aiText = data.choices[0].message.content;

    // AI cevabını da geçmişe ekle
    sessions[sessionId].push({
      role: "assistant",
      content: aiText
    });

    res.json({ reply: aiText });

  } catch (err) {
    console.error("Hata:", err.message);
    res.status(500).json({ error: "Hata", details: err.message });
  }
});

app.listen(3000, () => console.log("Agrovia AI Sunucusu Aktif!"));