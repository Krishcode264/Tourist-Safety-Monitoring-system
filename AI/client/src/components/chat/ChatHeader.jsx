function ChatHeader({ persona }) {
    return (
        <header className="chat-header">
            <div className="chat-title-wrap">
                <h1>{persona.name}</h1>

                <p>{persona.description}</p>
            </div>

            <button
                className="menu-btn"
                type="button"
                aria-label="Open personas menu"
            >
                Menu
            </button>
        </header>
    );
}

export default ChatHeader;