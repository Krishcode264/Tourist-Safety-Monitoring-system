import { Link } from "react-router-dom";
import PersonaCard from "./PersonaCard";

function Sidebar({
    persona,
    setPersona,
    messages,
    setMessages,
    setShowModal,
}) {
    const changePersona = ( name, description, welcomeMessage ) => {
        setPersona( {
            name,
            description,
        } );

        setMessages( [
            {
                role: "ai",
                text: welcomeMessage,
            },
        ] );
    };

    return (
        <aside className="sidebar" aria-label="Tourist safety assistant selection">
            <div className="sidebar-top">
                <Link to="/" className="brand" aria-label="Go to home page">
                    <span>Tourist Safety AI</span>
                </Link>

                <button
                    className="new-chat-btn"
                    onClick={() => setShowModal(true)}
                >
                    + New Safety Chat
                </button>
            </div>

            <section
                className="persona-section"
                aria-labelledby="persona-heading"
            >
                <h2 id="persona-heading">Safety Assistants</h2>

                <PersonaCard
                    name="Tourist Safety Guide"
                    shortDescription="Travel guidance and precautions"
                    description="Get practical guidance for safer, more informed travel."
                    active={persona.name === "Tourist Safety Guide"}
                    onClick={() =>
                        changePersona(
                            "Tourist Safety Guide",
                            "Get practical guidance for safer, more informed travel.",
                            "Hello! I am your Tourist Safety Guide. How can I help you travel more safely today?"
                        )
                    }
                />

                <PersonaCard
                    name="Incident Response Assistant"
                    shortDescription="Incident guidance and next steps"
                    description="Get clear guidance for reporting and responding to safety incidents."
                    active={persona.name === "Incident Response Assistant"}
                    onClick={() =>
                        changePersona(
                            "Incident Response Assistant",
                            "Get clear guidance for reporting and responding to safety incidents.",
                            "Hello! I am your Incident Response Assistant. Tell me what happened and I will help with the next steps."
                        )
                    }
                />

                <PersonaCard
                    name="Travel Companion"
                    shortDescription="Everyday travel support"
                    description="Ask questions and stay informed throughout your journey."
                    active={persona.name === "Travel Companion"}
                    onClick={() =>
                        changePersona(
                            "Travel Companion",
                            "Ask questions and stay informed throughout your journey.",
                            "Hello! I am your Travel Companion. What would you like to know about your journey?"
                        )
                    }
                />
            </section>
        </aside>
    );
}

export default Sidebar;