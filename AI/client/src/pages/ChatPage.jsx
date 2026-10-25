import { useState } from "react";

import Sidebar from "../components/chat/Sidebar";
import ChatHeader from "../components/chat/ChatHeader";
import ChatWindow from "../components/chat/ChatWindow";
import ChatInput from "../components/chat/ChatInput";
import PersonaModal from "../components/chat/PersonaModal";

import "../styles/chat.css";

function ChatPage() {
    const [persona, setPersona] = useState( {
        name: "Tourist Safety Guide",
        description: "Get practical guidance for safer, more informed travel.",
    } );

    const [messages, setMessages] = useState( [
        {
            role: "ai",
            text: "Hello! I am your Tourist Safety Guide. How can I help you travel more safely today?",
        },
    ] );

    const [showModal, setShowModal] = useState( false );

    return (
        <>
            <div className="chat-layout">
                <Sidebar
                    persona={persona}
                    setPersona={setPersona}
                    messages={messages}
                    setMessages={setMessages}
                    setShowModal={setShowModal}
                />

                <main className="chat-main">
                    <ChatHeader persona={persona} />

                    <ChatWindow messages={messages} />

                    <ChatInput
                        persona={persona}
                        messages={messages}
                        setMessages={setMessages}
                    />
                </main>
            </div>

            <PersonaModal
                showModal={showModal}
                setShowModal={setShowModal}
                persona={persona}
                setPersona={setPersona}
                setMessages={setMessages}
            />
        </>
    );
}

export default ChatPage;