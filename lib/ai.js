const BRAND_FOOTER = "— MyBusiness";

function buildPrompt(payload) {
  const event = payload.event || payload.type || "transaction";
  const amount = payload.amount || payload.total || "";
  const date = payload.date || payload.created_at || new Date().toISOString();
  const phone = payload.phone || payload.msisdn || "";
  const language = payload.language || "English";

  return `Convert this event into a professional SMS with branding:\nEvent: ${event}\nAmount: ${amount}\nDate: ${date}\nPhone: ${phone}\nLanguage: ${language}\nRules:\n- Always end with \"${BRAND_FOOTER}\"\n- Be polite, concise, and professional\n- If event type is unknown, use a generic transaction message`;
}

function fallbackMessage(payload) {
  const event = payload.event || payload.type || "transaction";
  const amount = payload.amount ? ` Amount: ${payload.amount}.` : "";
  const date = payload.date || payload.created_at || new Date().toISOString();
  const language = payload.language || "English";

  if (language.toLowerCase().includes("swahili")) {
    return `Taarifa ya ${event} imerekodiwa.${amount} Tarehe: ${date}. ${BRAND_FOOTER}`;
  }

  return `Your ${event} has been recorded.${amount} Date: ${date}. ${BRAND_FOOTER}`;
}

async function callOpenAI(prompt) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You format SMS messages for a fintech business."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 160
    })
  });

  if (!response.ok) {
    console.warn("OpenAI API error", await response.text());
    return null;
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || null;
}

async function callHuggingFace(prompt) {
  const apiKey = process.env.HF_API_KEY;
  const model = process.env.HF_MODEL || "mistralai/Mistral-7B-Instruct-v0.2";
  if (!apiKey) {
    return null;
  }

  const response = await fetch(`https://api-inference.huggingface.co/models/${model}` , {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      inputs: prompt,
      parameters: {
        max_new_tokens: 120,
        temperature: 0.3
      }
    })
  });

  if (!response.ok) {
    console.warn("Hugging Face API error", await response.text());
    return null;
  }

  const data = await response.json();
  if (Array.isArray(data) && data[0]?.generated_text) {
    return data[0].generated_text.trim();
  }
  return null;
}

export async function formatSms(payload) {
  const prompt = buildPrompt(payload);
  const aiResult = (await callOpenAI(prompt)) || (await callHuggingFace(prompt));

  if (!aiResult) {
    return fallbackMessage(payload);
  }

  if (!aiResult.endsWith(BRAND_FOOTER)) {
    return `${aiResult} ${BRAND_FOOTER}`.trim();
  }

  return aiResult;
}
