import { HTMLAttributes, ReactNode } from "react";
import styles from "./Card.module.css";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  padding?: "sm" | "md" | "lg";
}

function classNames(...values: Array<string | false | undefined | null>): string {
  return values.filter(Boolean).join(" ");
}

export function Card({
  children,
  padding = "md",
  className,
  ...rest
}: CardProps) {
  return (
    <div
      className={classNames(styles.card, styles[`padding_${padding}`], className)}
      {...rest}
    >
      {children}
    </div>
  );
}
