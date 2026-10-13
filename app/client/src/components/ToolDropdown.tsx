interface ToolOption<T extends string> {
  value: T;
  label: string;
}

interface ToolDropdownProps<T extends string> {
  options: readonly ToolOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

export default function ToolDropdown<T extends string>({
  options,
  value,
  onChange,
}: ToolDropdownProps<T>) {
  const selectedOption = options.find((option) => option.value === value);

  if (!selectedOption) return null;

  return (
    <details className="tool-dropdown">
      <summary className="tool-dropdown-trigger">
        {selectedOption.label}
      </summary>
      <div className="tool-dropdown-options" aria-label="Drawing tools">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`tool-dropdown-option ${option.value === value ? "active" : ""}`}
            aria-pressed={option.value === value}
            onClick={(event) => {
              onChange(option.value);
              const dropdown = event.currentTarget.closest("details");
              if (dropdown) dropdown.open = false;
            }}
          >
            {option.label}
          </button>
        ))}
      </div>
    </details>
  );
}
