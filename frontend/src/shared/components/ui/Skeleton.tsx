/**
 * Skeleton — placeholder loading dùng chung.
 *
 * Variants:
 *   - text        : thanh chữ nhật bo tròn (line)
 *   - circular    : hình tròn (avatar, icon)
 *   - rectangular : khối (card, image)
 *
 * Dùng shimmer animation nhẹ để người dùng biết đang tải.
 */

import type { CSSProperties } from "react";
import styles from "./Skeleton.module.css";

export type SkeletonVariant = "text" | "circular" | "rectangular";

export interface SkeletonProps {
  variant?: SkeletonVariant;
  /** Width — px hoặc "100%". Mặc định: 100% cho text/rectangular, height cho circular. */
  width?: number | string;
  /** Height — px. Mặc định: 14 cho text, = width cho circular, 100 cho rectangular. */
  height?: number | string;
  /** Class bổ sung. */
  className?: string;
  /** Inline style bổ sung. */
  style?: CSSProperties;
}

export function Skeleton({
  variant = "text",
  width,
  height,
  className,
  style,
}: SkeletonProps) {
  const isCircular = variant === "circular";
  const defaultHeight =
    variant === "text"
      ? 14
      : variant === "rectangular"
      ? 100
      : undefined;

  const finalWidth = width ?? (isCircular ? 40 : "100%");
  const finalHeight =
    height ?? (isCircular ? finalWidth : defaultHeight);

  const inlineStyle: CSSProperties = {
    width: typeof finalWidth === "number" ? `${finalWidth}px` : finalWidth,
    height: typeof finalHeight === "number" ? `${finalHeight}px` : finalHeight,
    borderRadius: isCircular ? "50%" : variant === "text" ? "4px" : "6px",
    ...style,
  };

  return (
    <span
      className={[styles.skeleton, className].filter(Boolean).join(" ")}
      style={inlineStyle}
      aria-hidden="true"
    />
  );
}