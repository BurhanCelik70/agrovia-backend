import dotenv from 'dotenv';
dotenv.config();

const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + process.env.GROQ_API_KEY,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'llama-3.3-70b-versatile',
    messages: [{role: 'user', content: 'merhaba'}]
  })
});

const d = await r.json();
console.log(JSON.stringify(d));