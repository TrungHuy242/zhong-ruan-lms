import { forwardRef, ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./Button.module.css";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  loadingText?: string;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

function classNames(...values: Array<string | false | undefined | null>): string {
  return values.filter(Boolean).join(" ");
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    isLoading = false,
    loadingText,
    fullWidth = false,
    leftIcon,
    rightIcon,
    children,
    disabled,
    type = "button",
    className,
    ...rest
  },
  ref
) {
  const isDisabled = disabled || isLoading;
  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      aria-busy={isLoading || undefined}
      className={classNames(
        styles.button,
        styles[`variant_${variant}`],
        styles[`size_${size}`],
        fullWidth && styles.fullWidth,
        isLoading && styles.loading,
        className
      )}
      {...rest}
    >
      {isLoading ? (
        <>
          <span className={styles.spinner} aria-hidden="true" />
          <span>{loadingText ?? children}</span>
        </>
      ) : (
        <>
          {leftIcon ? <span className={styles.icon}>{leftIcon}</span> : null}
          <span>{children}</span>
          {rightIcon ? <span className={styles.icon}>{rightIcon}</span> : null}
        </>
      )}
    </button>
  );
});
