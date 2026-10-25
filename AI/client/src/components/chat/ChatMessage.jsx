import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

function CodeBlock( { language, value } ) {
    const [copied, setCopied] = useState( false );

    async function copyCode() {
        await navigator.clipboard.writeText( value );

        setCopied( true );

        setTimeout( () => {
            setCopied( false );
        }, 2000 );
    }

    return (
        <div className="code-block">
            <div className="code-header">
                <span className="language-badge">
                    {( language || "Code" ).toUpperCase()}
                </span>

                <button
                    type="button"
                    className="copy-btn"
                    onClick={copyCode}
                >
                    {copied ? "Copied ✓" : "Copy"}
                </button>
            </div>

            <SyntaxHighlighter
                language={language}
                style={oneDark}
                PreTag="div"
            >
                {value}
            </SyntaxHighlighter>
        </div>
    );
}

function ChatMessage( { role, text } ) {
    return (
        <article className={`message ${role === "typing" ? "ai" : role}`}>
            {( role === "ai" || role === "typing" ) && (
                <div className="message-avatar">Guide</div>
            )}

            <div className="message-content">
                {role === "typing" ? (
                    <div className="typing-dots">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                ) : (
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                            code( { className, children, ...props } ) {
                                const match = /language-(\w+)/.exec(
                                    className || ""
                                );

                                return match ? (
                                    <CodeBlock
                                        language={match[1]}
                                        value={String( children ).replace( /\n$/, "" )}
                                    />
                                ) : (
                                    <code
                                        className={className}
                                        {...props}
                                    >
                                        {children}
                                    </code>
                                );
                            },
                        }}
                    >
                        {text}
                    </ReactMarkdown>
                )}
            </div>

            {role === "user" && (
                <div className="message-avatar">You</div>
            )}
        </article>
    );
}

export default ChatMessage;