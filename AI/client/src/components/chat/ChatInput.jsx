import { useState, useRef } from "react";
import { streamChatResponse } from "../../services/chatService";

function ChatInput( { persona, messages, setMessages } ) {
    const [input, setInput] = useState( "" );
    const [isLoading, setIsLoading] = useState( false );
    const textareaRef = useRef( null );
    function autoResize() {
        const textarea = textareaRef.current;

        if ( !textarea ) return;

        textarea.style.height = "auto";
        textarea.style.height = `${Math.min(
            textarea.scrollHeight,
            140
        )}px`;
    }
    async function handleSubmit( e ) {
        if ( isLoading ) return;
        e.preventDefault();

        if ( !input.trim() ) return;

        const userMessage = input;

        // Add both the user message and an empty AI message
        setMessages( ( prev ) => [
            ...prev,
            {
                role: "user",
                text: userMessage,
            },
            {
                role: "typing",
            },
        ] );

        setInput( "" );
        if ( textareaRef.current ) {
            textareaRef.current.style.height = "auto";
        }

        try {
            setIsLoading( true );
            await streamChatResponse(
                userMessage,
                persona.name,
                ( chunk ) => {
                    setMessages( ( prev ) => {
                        const updated = [...prev];

                        updated[updated.length - 1] = {
                            role: "ai",
                            text:
                                ( updated[updated.length - 1].text || "" ) +
                                chunk,
                        };

                        return updated;
                    } );
                }
            );
        } catch ( err ) {
            setMessages( ( prev ) => {
                const updated = [...prev];

                updated[updated.length - 1] = {
                    role: "ai",
                    text: "I could not process that request. Please try again, or contact local emergency services if you are in immediate danger.",
                };

                return updated;
            } );
        }
        finally {
            setIsLoading( false );
        }
    }


    return (
        <footer className="chat-input-area">
            <form className="chat-form" onSubmit={handleSubmit}>
                <label
                    htmlFor="chat-input"
                    className="sr-only"
                >
                    Describe your travel question or safety concern
                </label>

                <textarea
                    disabled={isLoading}
                    ref={textareaRef}
                    id="chat-input"
                    rows={1}
                    value={input}
                    onChange={( e ) => {
                        setInput( e.target.value );
                        autoResize();
                    }}
                    onKeyDown={( e ) => {
                        if ( e.key === "Enter" && !e.shiftKey ) {
                            e.preventDefault();
                            handleSubmit( e );
                        }
                    }}
                    placeholder="Describe your travel question or safety concern..."
                />

                <button
                    className="send-btn"
                    type="submit"
                    disabled={isLoading}
                >
                    {isLoading ? "Checking..." : "Send"}
                </button>
            </form>
        </footer>
    );
}

export default ChatInput;