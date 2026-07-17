/**
 * FAQAccordion — accordion câu hỏi thường gặp.
 */
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { FaqItem } from "../data/homeContent";
import styles from "./FAQAccordion.module.css";

interface FAQAccordionProps {
  items: FaqItem[];
}

export function FAQAccordion({ items }: FAQAccordionProps) {
  const [openId, setOpenId] = useState<number | null>(null);

  const toggle = (id: number) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  return (
    <div className={styles.list} role="list">
      {items.map((item) => {
        const isOpen = openId === item.id;
        return (
          <div
            key={item.id}
            className={`${styles.item} ${isOpen ? styles.itemOpen : ""}`}
            role="listitem"
          >
            <button
              type="button"
              className={styles.trigger}
              onClick={() => toggle(item.id)}
              aria-expanded={isOpen}
              aria-controls={`faq-answer-${item.id}`}
              id={`faq-question-${item.id}`}
            >
              <span className={styles.question}>{item.question}</span>
              <ChevronDown
                size={20}
                strokeWidth={2}
                className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ""}`}
                aria-hidden="true"
              />
            </button>
            <div
              id={`faq-answer-${item.id}`}
              role="region"
              aria-labelledby={`faq-question-${item.id}`}
              className={`${styles.answer} ${isOpen ? styles.answerOpen : ""}`}
            >
              <p className={styles.answerText}>{item.answer}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
