// src/hooks/useUpcomingNotice.ts
import { useEffect, useState } from 'react';
import type { CalendarEvent } from '../types/calendar';

export interface UpcomingNotice {
  eventId: string;
  title: string;
  minutesLeft: number;
}

/**
 * 오늘 요일의 일정들 중
 *  - 지금 이후이고
 *  - 60분 이내에 시작하는 일정들 중
 * 가장 빨리 시작하는 1개를 골라서
 * 제목 + 남은 분 수를 돌려준다.
 */
export function useUpcomingNotice(
  events: CalendarEvent[] | undefined | null
): UpcomingNotice | null {
  const [notice, setNotice] = useState<UpcomingNotice | null>(null);

  useEffect(() => {
    if (!events || events.length === 0) {
      setNotice(null);
      return;
    }

    const update = () => {
      const now = new Date();
      // 기존 코드에서 쓰던 요일 계산 로직 그대로 사용
      const nowDay = (now.getDay() + 6) % 7;

      let best: UpcomingNotice | null = null;

      for (const ev of events) {
        if (ev.day !== nowDay) continue;
        if (!ev.startTime) continue;

        const [h, m] = ev.startTime.split(':').map(Number);
        const start = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          h || 0,
          m || 0
        );

        const diffMin = (start.getTime() - now.getTime()) / 60000;

        // 0 < diff ≤ 60분만 대상
        if (diffMin <= 0 || diffMin > 60) continue;

        const minutesLeft = Math.ceil(diffMin);
        const title =
          (ev as any).template?.name ??
          (ev as any).title ??
          '이름 없는 일정';

        if (!best || minutesLeft < best.minutesLeft) {
          best = {
            eventId: ev.id,
            title,
            minutesLeft,
          };
        }
      }

      setNotice(best);
    };

    update();
    const id = window.setInterval(update, 30_000); // 30초마다 갱신
    return () => window.clearInterval(id);
  }, [events]);

  return notice;
}
