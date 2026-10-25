const { getStreamingResponse, setPersona } = require("../llmResponse.js");

const chat = (req, res) => {
    const { message, persona } = req.body || {};

    const safeMessage = String(message || "").trim();
    const safePersona = String(persona || "").trim();

    if (!safeMessage) {
        return res.status(400).json({
            error: "Message is required.",
        });
    }

    if (!safePersona) {
        return res.status(400).json({
            error: "Persona is required.",
        });
    }

    setPersona(safePersona);

    return getStreamingResponse(safeMessage, res);
};

module.exports = { chat };