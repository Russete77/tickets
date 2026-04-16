import React from 'react';
import styles from './EventTimeline.module.css';

interface TimelineItem {
  time: string;
  activity: string;
  icon?: string;
}

interface EventTimelineProps {
  timeline: TimelineItem[];
}

const EventTimeline: React.FC<EventTimelineProps> = ({ timeline }) => {
  return (
    <section className={styles.container}>
      <h2 className={styles.title}>Programação</h2>
      <div className={styles.timeline}>
        {timeline.map((item, index) => (
          <div key={index} className={styles.item}>
            <div className={styles.timeCol}>
              <span className={styles.time}>{item.time}</span>
            </div>
            <div className={styles.connector}>
              <div className={styles.dot} />
              {index < timeline.length - 1 && <div className={styles.line} />}
            </div>
            <div className={styles.content}>
              <span className={styles.icon}>{item.icon || ''}</span>
              <span className={styles.activity}>{item.activity}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default EventTimeline;
