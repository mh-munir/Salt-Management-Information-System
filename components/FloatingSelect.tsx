import { SelectHTMLAttributes, useState } from "react";

type FloatingSelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  containerClassName?: string;
  labelClassName?: string;
  selectClassName?: string;
};

export default function FloatingSelect({
  label,
  containerClassName = "",
  labelClassName = "",
  selectClassName = "",
  value,
  children,
  ...props
}: FloatingSelectProps) {
  const [isFocused, setIsFocused] = useState(false);
  const hasValue = value !== undefined && value !== "";

  return (
    <label className={`floating-field ${containerClassName}`}>
      <select
        {...props}
        value={value}
        className={`floating-field__input ${selectClassName}`}
        onFocus={e => { setIsFocused(true); props.onFocus?.(e); }}
        onBlur={e => { setIsFocused(false); props.onBlur?.(e); }}
      >
        {children}
      </select>
      <span
        className={`floating-field__label ${labelClassName}`}
        style={
          isFocused || hasValue
            ? { top: "0", transform: "translateY(-50%) scale(0.82)" }
            : {}
        }
      >
        {label}
      </span>
    </label>
  );
}
