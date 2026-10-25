import { useEffect, useRef } from "react";
import ChatMessage from "./ChatMessage";

function ChatWindow({ messages }) {
    const messagesRef = useRef(null);

    useEffect(() => {
        if (messagesRef.current) {
            messagesRef.current.scrollTo({
    top: messagesRef.current.scrollHeight,
    behavior: "smooth",
});
        }
    }, [messages]);

    return (
        <section
            ref={messagesRef}
            className="messages"
        >
            {messages.map((message, index) => (
                <ChatMessage
                    key={index}
                    role={message.role}
                    text={message.text}
                    typing={message.typing}
                />
            ))}
        </section>
    );
}

export default ChatWindow;  