// api/truth-score.js
import OpenAI from 'openai';

const xai = new OpenAI({
  apiKey: process.env.XAI_API_KEY,
  baseURL: 'https://api.x.ai/v1',
});

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { story, wallet, username, tx_link } = req.body;

  const prompt = `
You are an uncensorable truth engine for Solana normies.
Score this user-submitted save story 0-10 on truth & real impact:
- High: clear tx link/screenshot evidence, actual revocation/save, no shilling.
- Low: vague, promotional, fake, low-effort.

Story: "${story}"
Wallet: ${wallet || 'none'}
Username: @${username || 'anonymous'}
Tx: ${tx_link || 'none'}

Return ONLY valid JSON:
{
  "truth_score": number,
  "impact": "low"|"medium"|"high",
  "reason": string,
  "auto_boost": boolean,
  "suggested_reward_sol": number
}
`;

  try {
    const completion = await xai.chat.completions.create({
      model: 'grok-4.1-fast',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 300,
    });

    const judgment = JSON.parse(completion.choices[0].message.content.trim());
    res.status(200).json(judgment);
  } catch (e) {
    console.error(e);
    res.status(500).json({ truth_score: 0, auto_boost: false });
  }
}

export const config = { api: { runtime: 'edge' } };
