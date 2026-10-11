const OpenAI = require("openai");

const client = new OpenAI({
    apiKey: process.env.GEMINI_API_KEY,
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/"
});

// ============================
// PERSONA SYSTEM PROMPTS
// ============================

const personas = {
    default: "You are a helpful tourist safety AI assistant.",
    "tourist safety guide": "You are a tourist safety guide for the Tourist Safety Monitoring System. Give practical, clear advice about safer travel, local precautions, destinations, and responsible tourism. For immediate danger, advise the user to contact local emergency services.",
    "incident response assistant": "You are an incident response assistant for the Tourist Safety Monitoring System. Help tourists understand what to do after a safety incident, gather relevant details, and identify appropriate next steps. For immediate danger, advise the user to contact local emergency services.",
    "travel companion": "You are a helpful travel companion for the Tourist Safety Monitoring System. Answer everyday travel questions clearly, keep the user's safety in mind, and avoid presenting uncertain information as fact."
};

const fineTunePrompt = "Keep responses short, clear, and under 3-4 sentences. Avoid long explanations."

// ============================
// Conversation Memory
// ============================

let conversation = [];
let currentPersona = "default";

// ============================
// Limit memory size
// ============================

function limitMemory() {
    const MAX_MESSAGES = 12; // adjust if needed

    if (conversation.length > MAX_MESSAGES) {
        conversation = [
            conversation[0], // keep system prompt
            ...conversation.slice(-MAX_MESSAGES)
        ];
    }
}

// ============================
// Set Persona
// ============================

function setPersona(persona) {
    const normalized = persona.toLowerCase(); // ✅ FIX
    currentPersona = normalized in personas ? normalized : "default";

    conversation = [
        {
            role: "system",
            content: personas[currentPersona] + fineTunePrompt
        }
    ];
}

// ============================
// Reset Conversation
// ============================

function resetConversation() {
    conversation = [
        {
            role: "system",
            content: personas[currentPersona] + fineTunePrompt
        }
    ];
}

// ============================
// Get Streaming Response
// ============================

async function getStreamingResponse(userMessage, res) {
    try {
        if (conversation.length === 0) {
            setPersona(currentPersona);
        }

        conversation.push({ role: "user", content: userMessage });
        limitMemory();

        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");

        const stream = await client.chat.completions.create({
            model: "gemini-3.8-flash",
            messages: conversation,
            stream: true,
        });

        let fullReply = "";

        for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta?.content || "";
            if (!delta) continue;

            fullReply += delta;
            res.write(`data: ${JSON.stringify({ delta })}\n\n`);
        }

        conversation.push({ role: "assistant", content: fullReply });
        res.write("data: [DONE]\n\n");
        res.end();
    } catch (error) {
        console.error("Error:", error);

        if (!res.headersSent) {
            res.status(500).json({ error: "Error generating response" });
            return;
        }

        res.write(`data: ${JSON.stringify({ error: "Error generating response" })}\n\n`);
        res.end();
    }
}

module.exports = {
    getStreamingResponse,
    setPersona,
    resetConversation
};
