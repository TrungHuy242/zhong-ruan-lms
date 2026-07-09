import { Card } from "../components/ui";
import styles from "./PlaceholderPage.module.css";

interface PlaceholderPageProps {
  title: string;
}

export function PlaceholderPage({ title }: PlaceholderPageProps) {
  return (
    <main className={styles.page}>
      <Card padding="lg" className={styles.card}>
        <div className={styles.icon} aria-hidden="true">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            width="40"
            height="40"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.note}>
          Trang này đang trong quá trình phát triển. Giao diện thực tế sẽ được cập
          nhật trong các bước tiếp theo.
        </p>
      </Card>
    </main>
  );
}
