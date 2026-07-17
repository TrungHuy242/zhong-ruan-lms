/**
 * CourseComparisonTable — bảng so sánh nhanh 3 lộ trình.
 *
 * Desktop: bảng ngang 4 cột (cấp độ, thời lượng, học phí, phù hợp).
 * Mobile: chuyển thành dạng card xếp dọc — mỗi khóa 1 card với label : value
 * (tránh bảng bị cắt ngang trên màn hình nhỏ).
 */
import { coursesContent } from "../data/coursesContent";
import styles from "./CourseComparisonTable.module.css";

export function CourseComparisonTable() {
  return (
    <>
      {/* Desktop / Tablet: bảng */}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">Cấp độ</th>
              <th scope="col">Thời lượng</th>
              <th scope="col">Số buổi</th>
              <th scope="col">Học phí</th>
              <th scope="col">Phù hợp với ai</th>
            </tr>
          </thead>
          <tbody>
            {coursesContent.map((c) => (
              <tr key={c.slug}>
                <td>
                  <span className={styles.levelBadge}>{c.level}</span>
                  <br />
                  <strong>{c.name}</strong>
                </td>
                <td>{c.durationLabel}</td>
                <td>{c.lessons} buổi</td>
                <td>
                  <strong className={styles.price}>{c.price}</strong>
                </td>
                <td className={styles.audienceCell}>{c.targetAudience}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: dạng card xếp dọc */}
      <div className={styles.cards}>
        {coursesContent.map((c) => (
          <div key={c.slug} className={styles.card}>
            <div className={styles.cardHeader}>
              <span className={styles.levelBadge}>{c.level}</span>
              <strong className={styles.cardName}>{c.name}</strong>
            </div>
            <dl className={styles.cardList}>
              <div className={styles.cardRow}>
                <dt>Thời lượng</dt>
                <dd>{c.durationLabel}</dd>
              </div>
              <div className={styles.cardRow}>
                <dt>Số buổi</dt>
                <dd>{c.lessons} buổi</dd>
              </div>
              <div className={styles.cardRow}>
                <dt>Học phí</dt>
                <dd>
                  <strong className={styles.price}>{c.price}</strong>
                </dd>
              </div>
              <div className={styles.cardRow}>
                <dt>Phù hợp</dt>
                <dd>{c.targetAudience}</dd>
              </div>
            </dl>
          </div>
        ))}
      </div>
    </>
  );
}