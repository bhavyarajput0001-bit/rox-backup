// ApiKeyInput - secure input field for API keys

import { useState, useCallback } from "react";

interface Props {
  label: string;
  value: string;
  onChange: (value: string) => void;
  provider?: string;
  placeholder?: string;
}

export default function ApiKeyInput({
  label,
  value,
  onChange,
  provider,
  placeholder = "sk-...",
}: Props) {
  const [show, setShow] = useState(false);
  const hasValue = value.length > 0;

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value);
    },
    [onChange],
  );

  return (
    <div className="api-key-input">
      <div className="api-key-input__header">
        <label className="api-key-input__label">{label}</label>
        {provider && <span className="api-key-input__provider">{provider}</span>}
      </div>
      <div className="api-key-input__field">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          className="api-key-input__input"
          autoComplete="off"
        />
        <button
          type="button"
          className="api-key-input__toggle"
          onClick={() => setShow((s) => !s)}
          title={show ? "Hide key" : "Show key"}
        >
          {show ? "🙈" : "👁"}
        </button>
        {hasValue && (
          <button
            type="button"
            className="api-key-input__clear"
            onClick={() => onChange("")}
            title="Clear key"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
