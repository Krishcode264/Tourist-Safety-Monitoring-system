import { useState } from "react";

const personas = [
    {
        name: "Tourist Safety Guide",
        description: "Get practical guidance for safer, more informed travel.",
        shortDescription: "Travel guidance and precautions",
    },
    {
        name: "Incident Response Assistant",
        description: "Get clear guidance for reporting and responding to safety incidents.",
        shortDescription: "Incident guidance and next steps",
    },
    {
        name: "Travel Companion",
        description: "Ask questions and stay informed throughout your journey.",
        shortDescription: "Everyday travel support",
    },
];

function PersonaModal({
    showModal,
    setShowModal,
    setPersona,
    setMessages,
}) {
    const [selectedPersona, setSelectedPersona] = useState("Tourist Safety Guide");

    if (!showModal) return null;

    function startChat() {
        const chosen = personas.find(
            (p) => p.name === selectedPersona
        );

        setPersona({
            name: chosen.name,
            description: chosen.description,
        });

        setMessages([
            {
                role: "ai",
                text: `Hello! I am your ${chosen.name}. How can I help you travel more safely today?`,
            },
        ]);

        setShowModal(false);
    }

    return (
        <div className="persona-modal">
            <div
                className="persona-modal-backdrop"
                onClick={() => setShowModal(false)}
            ></div>

            <div className="persona-modal-panel">
                <h2>Start a New Chat</h2>

                <p>
                    Choose the safety assistant that best matches your need.
                </p>

                <div className="persona-modal-list">
                    {personas.map((persona) => (
                        <button
                            key={persona.name}
                            type="button"
                            className={`persona-modal-option ${
                                selectedPersona === persona.name
                                    ? "selected"
                                    : ""
                            }`}
                            onClick={() =>
                                setSelectedPersona(
                                    persona.name
                                )
                            }
                        >
                            <span className="persona-name">
                                {persona.name}
                            </span>

                            <span className="persona-desc">
                                {
                                    persona.shortDescription
                                }
                            </span>
                        </button>
                    ))}
                </div>

                <div className="persona-modal-actions">
                    <button
                        className="modal-cancel-btn"
                        onClick={() =>
                            setShowModal(false)
                        }
                    >
                        Cancel
                    </button>

                    <button
                        className="modal-start-btn"
                        onClick={startChat}
                    >
                        Start Chat
                    </button>
                </div>
            </div>
        </div>
    );
}

export default PersonaModal;