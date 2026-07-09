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
  /** Icon bên trái input (thường là search). */
  leftIcon?: ReactNode;
  /** Icon bên phải (eye toggle, clear). Click được qua onRightIconClick. */
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
    leftIcon,
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
          error ? styles.hasError : null,
          disabled ? styles.disabled : null,
          leftIcon ? styles.hasLeftIcon : null
        )}
      >
        {leftIcon ? (
          <span className={styles.leftIcon} aria-hidden="true">
            {leftIcon}
          </span>
        ) : null}
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
