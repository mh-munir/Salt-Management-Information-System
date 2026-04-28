import { type ChangeEvent, type InputHTMLAttributes } from "react";
import { normalizeNumberLikeString, localizeDigitsForLanguage } from "@/lib/number-input";
import { useLanguage } from "@/lib/useLanguage";

type FloatingInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "placeholder"> & {
  label: string;
  containerClassName?: string;
  labelClassName?: string;
  inputClassName?: string;
};

export default function FloatingInput({
  label,
  containerClassName = "",
  labelClassName = "",
  inputClassName = "",
  type,
  inputMode,
  min,
  step,
  onChange,
  value,
  ...props
}: FloatingInputProps) {
  const { language } = useLanguage();
  const isNumericField = type === "number";
  const allowDecimal = step !== 1 && step !== "1";
  const allowNegative =
    typeof min === "number" ? min < 0 : typeof min === "string" ? Number(min) < 0 : false;

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (isNumericField) {
      event.target.value = normalizeNumberLikeString(event.target.value, {
        allowDecimal,
        allowNegative,
      });
    }

    onChange?.(event);
  };

  return (
    <label className={`floating-field ${containerClassName}`.trim()}>
      <input
        {...props}
        type={isNumericField ? "text" : type}
        inputMode={inputMode ?? (isNumericField ? (allowDecimal ? "decimal" : "numeric") : undefined)}
        min={min}
        step={step}
        value={
          isNumericField && value != null
            ? localizeDigitsForLanguage(String(value), language)
            : value
        }
        onChange={handleChange}
        placeholder=" "
        className={`floating-field__input ${inputClassName}`.trim()}
      />
      <span className={`floating-field__label ${labelClassName}`.trim()}>{label}</span>
    </label>
  );
}
