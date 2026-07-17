/**
 * CourseRoadmap — timeline lộ trình học theo giai đoạn.
 */
import type { RoadmapItem } from "../data/coursesContent";
import styles from "./CourseRoadmap.module.css";

interface CourseRoadmapProps {
  items: RoadmapItem[];
}

export function CourseRoadmap({ items }: CourseRoadmapProps) {
  return (
    <ol className={styles.timeline} aria-label="Lộ trình học">
      {items.map((item, i) => (
        <li key={i} className={styles.item}>
          <div className={styles.marker}>
            <span className={styles.markerNum}>{i + 1}</span>
          </div>
          <div className={styles.content}>
            <div className={styles.headRow}>
              <h3 className={styles.stage}>{item.stage}</h3>
              <span className={styles.sessions}>{item.sessions}</span>
            </div>
            <p className={styles.description}>{item.description}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}