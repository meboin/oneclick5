import { useState, useRef, useEffect } from 'react';
import { CalendarEvent } from '../../../types/calendar';

interface CalendarWidgetProps {
  isOpen: boolean;
  onClose: () => void;
  events: CalendarEvent[];
  onCreateTemplate: () => void;
}

interface WidgetState {
  x: number;
  y: number;
  /**
   * Whether the widget is pinned to the page (desktop mode). When true, the
   * widget is always visible on the page without a full‑screen overlay and
   * can be dragged to any location. When false, the widget is displayed as
   * a modal overlay that can be opened/closed with the widget toggle.
   */
  isDesktopMode: boolean;
}

const STORAGE_KEY = 'calendar-widget-state';

// Key for persisting the widget's own view mode (week/month)
const WIDGET_VIEW_MODE_KEY = 'calendar-widget-view-mode';

/**
 * 캘린더 위젯. 팝업이나 데스크톱 모드에서 월간/주간 캘린더를 표시하고 이벤트를 클릭하면
 * URL을 열고 첨부 파일을 볼 수 있습니다. 첨부 파일은 템플릿의 attachments 배열이나
 * fileData(File 객체) 속성을 통해 열립니다.
 */
export default function CalendarWidget({ isOpen, onClose, events, onCreateTemplate }: CalendarWidgetProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [widgetState, setWidgetState] = useState<WidgetState>(() => {
    // Load position from localStorage but always start in overlay mode (not pinned).
    const saved = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          x: typeof parsed.x === 'number' ? parsed.x : window.innerWidth / 2 - 250,
          y: typeof parsed.y === 'number' ? parsed.y : window.innerHeight / 2 - 275,
          isDesktopMode: false
        };
      } catch {
        // ignore parse failure and fall back to defaults
      }
    }
    return {
      x: window.innerWidth / 2 - 250,
      y: window.innerHeight / 2 - 275,
      isDesktopMode: false
    };
  });
  const widgetRef = useRef<HTMLDivElement>(null);

  // Ref for the weekly time grid (07~18). This ref will be used to control
  // the scroll position when the user drags vertically to view hours beyond
  // 14:00 in the weekly view.
  const weekGridRef = useRef<HTMLDivElement>(null);

  // State for vertical drag scrolling within the weekly time grid. When the
  // user presses the mouse on the grid and drags up or down, the grid’s
  // scrollTop is adjusted accordingly.
  const [isVerticalDragging, setIsVerticalDragging] = useState(false);
  const [verticalDragStartY, setVerticalDragStartY] = useState(0);
  const [verticalScrollStart, setVerticalScrollStart] = useState(0);

  // View mode for the widget: 'month' or 'week'. Persisted to localStorage
  const [widgetViewMode, setWidgetViewMode] = useState<'month' | 'week'>(() => {
    if (typeof window === 'undefined') return 'month';
    const saved = localStorage.getItem(WIDGET_VIEW_MODE_KEY);
    return saved === 'week' || saved === 'month' ? (saved as 'month' | 'week') : 'month';
  });

  // Persist widget view mode
  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(WIDGET_VIEW_MODE_KEY, widgetViewMode);
  }, [widgetViewMode]);

  // 위젯이 열릴 때 중앙으로 위치 재설정 (데스크톱 모드가 아닐 때만)
  useEffect(() => {
    if (isOpen && !widgetState.isDesktopMode) {
      setWidgetState(prev => ({
        ...prev,
        x: window.innerWidth / 2 - 300,
        y: window.innerHeight / 2 - 325
      }));
    }
  }, [isOpen, widgetState.isDesktopMode]);

  // 상태 저장
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(widgetState));
    }
  }, [widgetState]);

  /**
   * 주간 범위를 반환합니다. 현재 날짜 기준 월요일과 일요일 날짜를 계산해
   * 표시용 문자열 범위를 제공합니다.
   */
  const getWeekRange = () => {
    const dayOfWeek = (currentDate.getDay() + 6) % 7; // Monday = 0
    const start = new Date(currentDate);
    start.setDate(currentDate.getDate() - dayOfWeek);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return {
      start,
      end
    };
  };

  // 드래그 시작 핸들러
  const handleMouseDown = (e: React.MouseEvent) => {
    // Allow dragging in both overlay and pinned modes
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    const rect = widgetRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({ x: e.clientX - widgetState.x, y: e.clientY - widgetState.y });
    }
  };

  // 드래그 중 처리
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      e.preventDefault();
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;
      const maxX = window.innerWidth - 600;
      const maxY = window.innerHeight - 650;
      setWidgetState(prev => ({
        ...prev,
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
      }));
    };
    const handleMouseUp = (e: MouseEvent) => {
      e.preventDefault();
      setIsDragging(false);
    };
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove, { passive: false });
      document.addEventListener('mouseup', handleMouseUp, { passive: false });
      document.body.style.cursor = 'grabbing';
      document.body.style.userSelect = 'none';
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, dragOffset, widgetState.isDesktopMode]);

  /**
   * 주간 시간표 그리드에서 마우스 다운 시 호출됩니다. 이 핸들러는 세로 드래그
   * 스크롤을 활성화합니다. 이벤트 내부 요소(예: 일정 블록)를 클릭하는 경우에도
   * 호출될 수 있으므로 event.stopPropagation()을 사용해 외부 드래그와 겹치지
   * 않도록 합니다.
   */
  const handleWeekGridMouseDown = (e: React.MouseEvent) => {
    // Prevent default to avoid text selection and mixed drag behaviours
    e.preventDefault();
    setIsVerticalDragging(true);
    setVerticalDragStartY(e.clientY);
    setVerticalScrollStart(weekGridRef.current?.scrollTop ?? 0);
  };

  // 전역 마우스 무브/업 리스너를 추가하여 세로 드래그 스크롤을 구현합니다. 드래그가
  // 활성화된 동안에는 마우스를 움직일 때마다 scrollTop을 업데이트하고, 마우스
  // 버튼을 놓으면 드래그 상태를 종료합니다.
  useEffect(() => {
    const handleMove = (event: MouseEvent) => {
      if (!isVerticalDragging) return;
      const diffY = event.clientY - verticalDragStartY;
      if (weekGridRef.current) {
        weekGridRef.current.scrollTop = verticalScrollStart - diffY;
      }
    };
    const handleUp = () => {
      if (isVerticalDragging) {
        setIsVerticalDragging(false);
      }
    };
    if (isVerticalDragging) {
      document.addEventListener('mousemove', handleMove);
      document.addEventListener('mouseup', handleUp);
      // Change cursor globally to indicate dragging
      document.body.style.cursor = 'grabbing';
      document.body.style.userSelect = 'none';
    }
    return () => {
      if (isVerticalDragging) {
        document.removeEventListener('mousemove', handleMove);
        document.removeEventListener('mouseup', handleUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };
  }, [isVerticalDragging, verticalDragStartY, verticalScrollStart]);

  /**
   * 월 네비게이션 함수
   */
  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  /**
   * 주 네비게이션 함수. 현재 날짜를 기준으로 일주일씩 이동합니다.
   */
  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setDate(prev.getDate() + (direction === 'prev' ? -7 : 7));
      return newDate;
    });
  };

  /**
   * 현재 월의 달력 데이터를 생성. 월요일을 주의 시작으로 처리합니다.
   */
  const generateCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const firstDayOfWeek = (firstDay.getDay() + 6) % 7;
    const calendarDays: any[] = [];
    const prevMonth = new Date(year, month, 0);
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      calendarDays.push({
        date: prevMonth.getDate() - i,
        isCurrentMonth: false,
        isNextMonth: false,
        fullDate: new Date(year, month - 1, prevMonth.getDate() - i)
      });
    }
    for (let date = 1; date <= lastDay.getDate(); date++) {
      calendarDays.push({
        date,
        isCurrentMonth: true,
        isNextMonth: false,
        fullDate: new Date(year, month, date)
      });
    }
    const remainingDays = 42 - calendarDays.length;
    for (let date = 1; date <= remainingDays; date++) {
      calendarDays.push({
        date,
        isCurrentMonth: false,
        isNextMonth: true,
        fullDate: new Date(year, month + 1, date)
      });
    }
    return calendarDays;
  };

  /**
   * 현재 주의 달력 데이터를 생성. 월요일을 주의 시작으로 처리합니다.
   * 7개의 dayData 객체를 반환하며, 각 객체는 해당 날짜의 정보와
   * fullDate를 포함합니다. 주간 뷰에서는 month/nextMonth 구분을 하지
   * 않아 isCurrentMonth는 항상 true로 설정됩니다.
   */
  const generateWeekDays = () => {
    // Determine Monday of the current week (Monday = 0)
    const today = currentDate;
    const dayOfWeek = (today.getDay() + 6) % 7;
    const monday = new Date(today);
    monday.setDate(today.getDate() - dayOfWeek);
    const weekDays: any[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      weekDays.push({
        date: date.getDate(),
        isCurrentMonth: true,
        isNextMonth: false,
        fullDate: date
      });
    }
    return weekDays;
  };

  /**
   * 특정 날짜에 해당하는 이벤트 목록을 반환합니다. 월간 뷰에서는 요일만을 기준으로
   * 이벤트를 매핑합니다.
   */
  const getEventsForDay = (dayData: any) => {
    if (!dayData.isCurrentMonth) return [];
    const dayOfWeek = (dayData.fullDate.getDay() + 6) % 7;
    return events.filter(event => event.day === dayOfWeek);
  };

  /**
   * ---- 위젯 주간 그리드 로직 ----
   * 주간 위젯 뷰에서는 시간표 그리드를 표시하기 위해 시간(HOURS)과 요일(dayIndex)별로
   * 이벤트를 매핑합니다. `getEventForCellWidget`은 특정 요일과 시간에 해당하는 이벤트를
   * 찾고, `isEventStartWidget`와 `getEventHeightWidget`는 이벤트 블록의 시작과 높이를 계산합니다.
   */
  const HOURS = Array.from({ length: 12 }, (_, i) => i + 7); // 07:00~18:00
  const getEventForCellWidget = (dayIndex: number, hour: number) => {
    return events.find(event => {
      const eventStartHour = parseInt(event.startTime.split(':')[0], 10);
      const eventEndHour = parseInt(event.endTime.split(':')[0], 10);
      const eventEndMinute = parseInt(event.endTime.split(':')[1], 10);
      // If event ends at a minute >0, treat end hour as inclusive of next hour
      const actualEndHour = eventEndMinute > 0 ? eventEndHour + 1 : eventEndHour;
      return event.day === dayIndex && hour >= eventStartHour && hour < actualEndHour;
    });
  };
  const isEventStartWidget = (event: CalendarEvent, hour: number) => {
    const eventStartHour = parseInt(event.startTime.split(':')[0], 10);
    return hour === eventStartHour;
  };
  const getEventHeightWidget = (event: CalendarEvent) => {
    const startHour = parseInt(event.startTime.split(':')[0], 10);
    const endHour = parseInt(event.endTime.split(':')[0], 10);
    const endMinute = parseInt(event.endTime.split(':')[1], 10);
    const startMinutes = startHour * 60;
    const endMinutes = endHour * 60 + endMinute;
    const durationHours = (endMinutes - startMinutes) / 60;
    return Math.max(1, Math.ceil(durationHours));
  };

  /**
   * 오늘인지 여부를 확인합니다.
   */
  const isToday = (dayData: any) => {
    const today = new Date();
    return dayData.fullDate.toDateString() === today.toDateString();
  };

  // 상세 일정 보기 상태
  const [selectedDayEvents, setSelectedDayEvents] = useState<{
    date: string;
    events: CalendarEvent[];
  } | null>(null);

  /**
   * 셀 클릭 핸들러: 일정이 있는 경우 상세 팝업을 열어줍니다.
   */
  const handleDayClick = (dayData: any) => {
    if (!dayData.isCurrentMonth) return;
    const dayEvents = getEventsForDay(dayData);
    if (dayEvents.length > 0) {
      setSelectedDayEvents({
        date: `${dayData.fullDate.getMonth() + 1}월 ${dayData.date}일`,
        events: dayEvents
      });
    }
  };

  /**
   * 이벤트 클릭 핸들러: 템플릿의 URL을 열고 파일이 있으면 열어줍니다. attachments 배열이
   * 있으면 모든 첨부파일을 열고, 이후 URL을 열어줍니다.
   */
  const handleEventClick = async (event: CalendarEvent) => {
    const template = event.template as any;
    // 먼저 첨부파일들을 모두 연다 (attachments 속성이 있는 경우)
    if (template.attachments && Array.isArray(template.attachments) && template.attachments.length > 0) {
      for (const att of template.attachments) {
        if (att.fileData) {
          try {
            const response = await fetch(att.fileData);
            const blob = await response.blob();
            const objectUrl = URL.createObjectURL(blob);
            window.open(objectUrl, '_blank');
          } catch {
            window.open(att.fileData, '_blank');
          }
        } else if (att.file && att.file instanceof File) {
          // Fallback: if File object still exists in memory
          const objectUrl = URL.createObjectURL(att.file);
          window.open(objectUrl, '_blank');
        }
      }
      return;
    }
    // backwards compatibility: single fileData
    if (template.fileData) {
      try {
        const response = await fetch(template.fileData);
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        window.open(objectUrl, '_blank');
      } catch {
        window.open(template.fileData, '_blank');
      }
      return;
    }
    // backwards compatibility: single File object
    if (template.file && template.file instanceof File) {
      const objectUrl = URL.createObjectURL(template.file);
      window.open(objectUrl, '_blank');
      return;
    }
    // 마지막으로 URL들을 열기
    if (template.urls && template.urls.length > 0) {
      const validUrls = template.urls.filter((url: string) => url.trim());
      if (validUrls.length > 0) {
        validUrls.forEach((url: string) => {
          window.open(url, '_blank');
        });
      }
    }
  };

  // Determine the calendar days based on widget view mode
  const calendarDays = widgetViewMode === 'month' ? generateCalendarDays() : generateWeekDays();

  // If the widget is not open, do not render. Desktop (pinned) mode is disabled.
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.1)' }}
      onClick={onClose}
    >
      <div
        ref={widgetRef}
        className={`w-[600px] bg-white/20 backdrop-blur-lg border border-white/30 rounded-xl shadow-2xl ${
          isDragging ? '' : 'transition-all duration-200'
        } ${(isOpen || widgetState.isDesktopMode) ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
        style={{
          position: 'absolute',
          left: widgetState.x,
          top: widgetState.y,
          pointerEvents: 'auto'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div
          className={`flex items-center justify-between p-4 border-b border-white/20 ${
            isDragging ? 'cursor-grabbing' : 'cursor-grab'
          }`}
          onMouseDown={handleMouseDown}
        >
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full"></div>
            <h3 className="text-black font-semibold">
              {widgetViewMode === 'week' ? '주간 캘린더' : '월간 캘린더'}
            </h3>
          </div>
          <div className="flex items-center space-x-1">
            {/* 보기 전환 버튼 */}
            <div className="flex items-center rounded overflow-hidden text-xs bg-white/30">
              <button
                onClick={() => setWidgetViewMode('week')}
                className={`px-2 py-1 ${widgetViewMode === 'week' ? 'bg-white/50 text-black' : 'text-black/70 hover:bg-white/20'}`}
              >
                주간
              </button>
              <button
                onClick={() => setWidgetViewMode('month')}
                className={`px-2 py-1 ${widgetViewMode === 'month' ? 'bg-white/50 text-black' : 'text-black/70 hover:bg-white/20'}`}
              >
                월간
              </button>
            </div>
            {/* 바탕화면 모드(핀) 기능 제거됨: 해당 버튼을 표시하지 않습니다 */}
            {/* 빈 공간을 유지하여 레이아웃 유지 */}
            <div className="w-7 h-7"></div>
            {/* 닫기 버튼 */}
            <button
              onClick={() => {
                onClose();
              }}
              className={`w-7 h-7 flex items-center justify-center bg-white/20 text-black hover:bg-red-500/30 rounded cursor-pointer ${
                isDragging ? '' : 'transition-colors duration-150'
              }`}
            >
              <i className="ri-close-line w-4 h-4 flex items-center justify-center"></i>
            </button>
          </div>
        </div>
        {/* 네비게이션 */}
        <div className="flex items-center justify-between p-4 border-b border-white/20">
          <button
            onClick={() => {
              widgetViewMode === 'month' ? navigateMonth('prev') : navigateWeek('prev');
            }}
            className={`w-7 h-7 flex items-center justify-center bg-white/20 text-black hover:bg-white/30 rounded cursor-pointer ${
              isDragging ? '' : 'transition-colors duration-150'
            }`}
          >
            <i className="ri-arrow-left-line w-4 h-4 flex items-center justify-center"></i>
          </button>
          <h4 className="text-black font-semibold text-sm">
            {widgetViewMode === 'month'
              ? `${currentDate.getFullYear()}년 ${currentDate.getMonth() + 1}월`
              : (() => {
                  const { start, end } = getWeekRange();
                  const startMonth = start.getMonth() + 1;
                  const endMonth = end.getMonth() + 1;
                  const rangeText =
                    startMonth === endMonth
                      ? `${startMonth}월 ${start.getDate()}일 - ${end.getDate()}일`
                      : `${startMonth}월 ${start.getDate()}일 - ${endMonth}월 ${end.getDate()}일`;
                  return rangeText;
                })()}
          </h4>
          <button
            onClick={() => {
              widgetViewMode === 'month' ? navigateMonth('next') : navigateWeek('next');
            }}
            className={`w-7 h-7 flex items-center justify-center bg-white/20 text-black hover:bg-white/30 rounded cursor-pointer ${
              isDragging ? '' : 'transition-colors duration-150'
            }`}
          >
            <i className="ri-arrow-right-line w-4 h-4 flex items-center justify-center"></i>
          </button>
        </div>
        {/* 요일 헤더 */}
        <div className="grid grid-cols-7 border-b border-white/20">
          {['월', '화', '수', '목', '금', '토', '일'].map(day => (
            <div
              key={day}
              className="text-center text-black font-medium py-3 border-r border-white/20 last:border-r-0 text-xs"
            >
              {day}
            </div>
          ))}
        </div>
        {/* 달력/주간 그리드 */}
        {widgetViewMode === 'week' ? (
          <div
            ref={weekGridRef}
            className="grid grid-cols-8 overflow-y-auto"
            style={{ maxHeight: '320px', cursor: isVerticalDragging ? 'grabbing' : 'grab' }}
            onMouseDown={handleWeekGridMouseDown}
          >
            {HOURS.map(hour => (
              <div key={hour} className="contents">
                {/* 시간 레이블 셀 */}
                <div
                  className="border-r border-b border-white/20 p-1 text-xs text-black flex items-center justify-center"
                  style={{ minHeight: '40px' }}
                >
                  {String(hour).padStart(2, '0')}:00
                </div>
                {/* 요일별 셀 */}
                {[0, 1, 2, 3, 4, 5, 6].map(dayIndex => {
                  const cellEvent = getEventForCellWidget(dayIndex, hour);
                  const isStart = cellEvent && isEventStartWidget(cellEvent, hour);
                  const eventHeight = cellEvent ? getEventHeightWidget(cellEvent) : 1;
                  return (
                    <div
                      key={`${hour}-${dayIndex}`}
                      className="border-r border-b border-white/20 p-1 relative"
                      style={{ minHeight: '40px' }}
                    >
                      {cellEvent && isStart && (
                        <div
                          className="absolute left-0.5 right-0.5 p-0.5 rounded text-white text-[10px] font-medium truncate cursor-pointer"
                          style={{ backgroundColor: cellEvent.template.color, height: `${eventHeight * 40 - 2}px`, top: '2px' }}
                          title={`${cellEvent.template.name} ${cellEvent.startTime}-${cellEvent.endTime}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEventClick(cellEvent);
                          }}
                        >
                          <div className="truncate">{cellEvent.template.name}</div>
                          <div className="text-[9px] opacity-75">{cellEvent.startTime} - {cellEvent.endTime}</div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-7">
            {calendarDays.map((dayData, index) => {
              const dayEvents = getEventsForDay(dayData);
              const isTodayCell = isToday(dayData);
              return (
                <div
                  key={index}
                  className={`border-r border-b border-white/20 last:border-r-0 p-2 min-h-[60px] cursor-pointer ${
                    dayData.isCurrentMonth
                      ? isDragging
                        ? ''
                        : 'hover:bg-white/10 transition-colors duration-150'
                      : 'bg-white/5'
                  }`}
                  onClick={() => handleDayClick(dayData)}
                >
                  <div className="flex flex-col h-full">
                    <div
                      className={`text-sm font-medium mb-2 ${
                        dayData.isCurrentMonth
                          ? isTodayCell
                            ? 'text-white bg-gradient-to-br from-blue-500/60 to-purple-500/60 w-6 h-6 rounded-full flex items-center justify-center'
                            : 'text-black'
                          : 'text-black/40'
                      }`}
                    >
                      {dayData.date}
                    </div>
                    {dayEvents.length > 0 && (
                      <div className="flex-1 flex items-center justify-center">
                        <div
                          className={`w-5 h-5 bg-blue-500/70 text-white rounded-full flex items-center justify-center text-xs font-medium ${
                            isDragging ? '' : 'hover:bg-blue-500/90 transition-colors'
                          }`}
                          title={`${dayEvents.length}개의 일정`}
                          onClick={(e) => {
                            e.stopPropagation();
                            // Show details when clicking count
                            handleDayClick(dayData);
                          }}
                        >
                          {dayEvents.length}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {/* 빠른 액션 영역 제거됨: 위젯 내에서 새 템플릿 생성 버튼을 표시하지 않습니다 */}
        {/* 일정 상세 보기 팝업 */}
        {selectedDayEvents && (
          <div
            className="fixed inset-0 bg-black/20 flex items-center justify-center z-60"
            onClick={() => setSelectedDayEvents(null)}
          >
            <div
              className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-96 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedDayEvents.date} 일정
                </h3>
              </div>
              <div className="p-4 overflow-y-auto max-h-80">
                <div className="space-y-3">
                  {selectedDayEvents.events.map(event => (
                    <div
                      key={event.id}
                      className="p-3 rounded-lg border border-gray-200 hover:shadow-sm transition-shadow cursor-pointer group"
                      style={{ borderLeftColor: event.template.color, borderLeftWidth: '4px' }}
                      onClick={() => handleEventClick(event)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 text-sm">
                            {event.template.name}
                          </h4>
                          <p className="text-xs text-gray-600 mt-1">
                            {event.startTime} - {event.endTime}
                          </p>
                          {event.template.description && (
                            <p className="text-xs text-gray-500 mt-1">
                              {event.template.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}