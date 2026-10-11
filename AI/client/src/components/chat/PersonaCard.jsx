function PersonaCard({
    name,
    shortDescription,
    description,
    active,
    onClick,
}) {
    return (
        <button
            type="button"
            className={`persona-card ${active ? "active" : ""}`}
            data-persona={name}
            data-description={description}
            aria-current={active ? "true" : undefined}
            onClick={onClick}
        >
            <span className="persona-name">{name}</span>
            <span className="persona-desc">{shortDescription}</span>
        </button>
    );
}

export default PersonaCard;