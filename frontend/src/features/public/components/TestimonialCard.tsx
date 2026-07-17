/**
 * TestimonialCard — card testimonial placeholder.
 *
 * PLACEHOLDER: nội dung ghi rõ "chờ cập nhật", không tự bịa lời khen giả.
 */
import { Star } from "lucide-react";
import type { TestimonialItem } from "../data/homeContent";
import styles from "./TestimonialCard.module.css";

interface TestimonialCardProps {
  testimonial: TestimonialItem;
}

export function TestimonialCard({ testimonial }: TestimonialCardProps) {
  return (
    <div className={styles.card}>
      {/* Avatar placeholder tròn */}
      <div className={styles.avatar}>
        <span className={styles.avatarInitials}>{testimonial.avatarInitials}</span>
      </div>

      {/* Rating placeholder */}
      <div className={styles.rating} aria-label="5 trên 5 sao">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            size={16}
            fill="currentColor"
            strokeWidth={0}
            className={styles.star}
            aria-hidden="true"
          />
        ))}
      </div>

      {/* Nội dung placeholder */}
      <blockquote className={styles.content}>
        <p>{testimonial.content}</p>
      </blockquote>

      {/* Tên + level */}
      <div className={styles.author}>
        <span className={styles.name}>{testimonial.name}</span>
        <span className={styles.level}>{testimonial.level}</span>
      </div>
    </div>
  );
}
