import {
  forwardRef,
  InputHTMLAttributes,
  ReactNode,
  useId,
} from "react";
import styles from "./Input.module.css";

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: string;
  error?: string;
  hint?: string;
  rightIcon?: ReactNode;
  onRightIconClick?: () => void;
}

function classNames(...values: Array<string | false | undefined | null>): string {
  return values.filter(Boolean).join(" ");
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    label,
    error,
    hint,
    rightIcon,
    onRightIconClick,
    id,
    className,
    disabled,
    type = "text",
    ...rest
  },
  ref
) {
  const autoId = useId();
  const inputId = id ?? `input-${autoId}`;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;
  const describedBy = [error ? errorId : null, hint ? hintId : null]
    .filter(Boolean)
    .join(" ") || undefined;

  return (
    <div className={classNames(styles.wrapper, className)}>
      {label ? (
        <label htmlFor={inputId} className={styles.label}>
          {label}
        </label>
      ) : null}
      <div
        className={classNames(
          styles.fieldWrapper,
          error && styles.hasError,
          disabled && styles.disabled
        )}
      >
        <input
          ref={ref}
          id={inputId}
          type={type}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={styles.input}
          {...rest}
        />
        {rightIcon ? (
          <button
            type="button"
            tabIndex={-1}
            aria-label="Toggle password visibility"
            className={styles.rightIconButton}
            onClick={onRightIconClick}
            disabled={disabled}
          >
            {rightIcon}
          </button>
        ) : null}
      </div>
      {error ? (
        <span id={errorId} className={styles.errorText} role="alert">
          {error}
        </span>
      ) : hint ? (
        <span id={hintId} className={styles.hintText}>
          {hint}
        </span>
      ) : null}
    </div>
  );
});
