import { type InputHTMLAttributes } from "react";

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
  ...props
}: FloatingInputProps) {
  return (
    <label className={`floating-field ${containerClassName}`.trim()}>
      <input
        {...props}
        placeholder=" "
        className={`floating-field__input ${inputClassName}`.trim()}
      />
      <span className={`floating-field__label ${labelClassName}`.trim()}>{label}</span>
    </label>
  );
}
