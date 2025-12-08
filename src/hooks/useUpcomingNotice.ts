// src/hooks/useUpcomingNotice.ts
import { useEffect, useState } from "react";
import type { CalendarEvent } from "../types/calendar";

export interface UpcomingNotice {
  eventId: string;
  title: string;
  minutesLeft: number;
  start: Date;
}

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

/**
 * events 배열에서
 * - 지금보다 이후이고
 * - 앞으로 1시간 이내에 시작하는 일정들 중
 *   가장 빨리 시작하는 일정 1개를 골라
 *   "몇 분 남았는지" 정보까지 함께 반환.
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

    const updateNotice = () => {
      const now = new Date();
      const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

      let best: UpcomingNotice | null = null;

      for (const ev of events) {
        if (!ev.start) continue;
        const start = toDate(ev.start as any);

        // 이미 시작한 일정은 제외
        if (start <= now) continue;
        // 1시간 이후 일정은 제외
        if (start > oneHourLater) continue;

        const diffMs = start.getTime() - now.getTime();
        const minutesLeft = Math.ceil(diffMs / 60000); // 분 단위 반올림

        if (!best || minutesLeft < best.minutesLeft) {
          best = {
            eventId: ev.id,
            title: ev.title,
            minutesLeft,
            start,
          };
        }
      }

      setNotice(best);
    };

    // 바로 한 번 계산
    updateNotice();

    // 30초마다 갱신
    const id = window.setInterval(updateNotice, 30_000);
    return () => window.clearInterval(id);
  }, [events]);

  return notice;
}
