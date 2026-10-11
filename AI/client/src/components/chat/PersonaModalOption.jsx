function PersonaModalOption({ name, description }) {
    return (
        <button
            className="persona-modal-option"
            type="button"
            data-persona-option={name}
        >
            <span className="persona-name">{name}</span>
            <span className="persona-desc">{description}</span>
        </button>
    );
}

export default PersonaModalOption;