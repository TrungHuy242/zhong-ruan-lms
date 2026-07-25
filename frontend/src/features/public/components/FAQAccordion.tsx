/**
 * FAQAccordion — accordion câu hỏi thường gặp.
 *
 * Editorial voice (round 26-07, locked system §9):
 *   - Item là flat hairline row, không rounded, không shadow
 *   - Trigger có 3-col grid: number (id-derived 01/02) | question | indicator (+/−)
 *   - Open state: brand-red top border + indicator − thay vì +
 *   - Answer: grid-template-rows 0fr → 1fr (smooth height auto)
 *
 * Logic React giữ nguyên 100% — chỉ thêm 2 phần tử visual (triggerNumber, indicator)
 * phục vụ cho editorial system. State, a11y, prop API không đổi.
 */
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { FaqItem } from "../data/homeContent";
import styles from "./FAQAccordion.module.css";

interface FAQAccordionProps {
  items: FaqItem[];
}

const pad = (n: number): string => (n < 10 ? `0${n}` : `${n}`);

export function FAQAccordion({ items }: FAQAccordionProps) {
  const [openId, setOpenId] = useState<number | null>(null);

  const toggle = (id: number) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  return (
    <div className={styles.list} role="list">
      {items.map((item, idx) => {
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
              <span className={styles.triggerNumber} aria-hidden="true">
                {pad(idx + 1)}
              </span>
              <span className={styles.question}>{item.question}</span>
              <span className={styles.indicator} aria-hidden="true" />
              {/* Legacy lucide chevron — render giữ để không đổi JSX signature,
                  bị ẩn hoàn toàn qua CSS .chevron { display: none } */}
              <ChevronDown
                size={20}
                strokeWidth={2}
                className={styles.chevron}
                aria-hidden="true"
              />
            </button>
            <div
              id={`faq-answer-${item.id}`}
              role="region"
              aria-labelledby={`faq-question-${item.id}`}
              className={`${styles.answer} ${isOpen ? styles.answerOpen : ""}`}
            >
              <div className={styles.answerInner}>
                <p className={styles.answerText}>{item.answer}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
