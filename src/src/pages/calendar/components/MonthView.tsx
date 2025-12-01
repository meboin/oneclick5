import { useState } from 'react';
import { CalendarEvent, Template } from '../../../types/calendar';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface MonthViewProps {
  events: CalendarEvent[];
  selectedTemplate: Template | null;
  onAddEvent: (event: Omit<CalendarEvent, 'id'>) => void;
  onDeleteEvent: (eventId: string) => void;
  onEditTemplate: (template: Template) => void;
}

const DAYS = ['월','화','수','목','금','토','일'];
const MONTHS = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];

/**
 * 월간 보기 컴포넌트. 한 달을 표시하고 각 날짜에 있는 이벤트 수를 보여줍니다.
 * 주간 보기와 글자 크기 비율을 맞추기 위해 상세 팝업과 일정 수 표시 영역의 텍스트 크기를 조정했습니다.
 */
export default function MonthView({ events, selectedTemplate, onAddEvent, onDeleteEvent, onEditTemplate }: MonthViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; event: CalendarEvent; } | null>(null);
  const [selectedDayEvents, setSelectedDayEvents] = useState<{ date: string; events: CalendarEvent[]; } | null>(null);

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

  const goToPrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const goToNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToToday = () => setCurrentDate(new Date());

  /**
   * 셀 클릭 핸들러: 일정이 있는 경우 상세 팝업을, 없고 템플릿이 선택된 경우 새 일정을 생성합니다.
   */
  const handleCellClick = (e: React.MouseEvent, dayData: any) => {
    if (!dayData.isCurrentMonth) return;
    const dayEvents = getEventsForDay(dayData);
    if (dayEvents.length > 0) {
      e.stopPropagation();
      setSelectedDayEvents({
        date: `${dayData.fullDate.getMonth() + 1}월 ${dayData.date}일`,
        events: dayEvents
      });
      return;
    }
    if (selectedTemplate) {
      const dayOfWeek = (dayData.fullDate.getDay() + 6) % 7;
      onAddEvent({
        templateId: selectedTemplate.id,
        template: selectedTemplate,
        startTime: '09:00',
        endTime: `${9 + Math.floor(selectedTemplate.duration / 60)}:${(selectedTemplate.duration % 60).toString().padStart(2, '0')}`,
        day: dayOfWeek
      });
    }
  };

  /**
   * 이벤트 클릭 핸들러: 템플릿에 연결된 URL과 첨부 파일을 열어줍니다.
   */
  const handleEventClick = async (event: CalendarEvent) => {
    const template = event.template;
    // 열 첨부파일 먼저
    if (template.attachments && template.attachments.length > 0) {
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
        } else if ((att as any).file && (att as any).file instanceof File) {
          const objectUrl = URL.createObjectURL((att as any).file);
          window.open(objectUrl, '_blank');
        }
      }
    } else if ((template as any).fileData) {
      // backwards compatibility
      try {
        const response = await fetch((template as any).fileData);
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        window.open(objectUrl, '_blank');
      } catch {
        window.open((template as any).fileData, '_blank');
      }
      return;
    } else if ((template as any).file && (template as any).file instanceof File) {
      const objectUrl = URL.createObjectURL((template as any).file);
      window.open(objectUrl, '_blank');
      return;
    }
    // 마지막으로 URL
    if (template.urls && template.urls.length > 0) {
      const validUrls = template.urls.filter(url => url.trim());
      if (validUrls.length > 0) {
        validUrls.forEach(url => {
          window.open(url, '_blank');
        });
        return;
      }
    }
  };

  /**
   * 우클릭 컨텍스트 메뉴 핸들러
   */
  const handleEventContextMenu = (e: React.MouseEvent, event: CalendarEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, event });
  };
  const handleEditEvent = () => {
    if (contextMenu) {
      onEditTemplate(contextMenu.event.template);
      setContextMenu(null);
    }
  };
  const handleDeleteEventFromContext = () => {
    if (contextMenu) {
      onDeleteEvent(contextMenu.event.id);
      setContextMenu(null);
    }
  };
  const handleClickOutside = () => {
    setContextMenu(null);
    setSelectedDayEvents(null);
  };
  /**
   * 특정 날짜에 해당하는 이벤트 목록 반환
   */
  const getEventsForDay = (dayData: any) => {
    if (!dayData.isCurrentMonth) return [];
    const dayOfWeek = (dayData.fullDate.getDay() + 6) % 7;
    return events.filter(event => event.day === dayOfWeek);
  };
  const isToday = (dayData: any) => {
    const today = new Date();
    return dayData.fullDate.toDateString() === today.toDateString();
  };

  return (
    <div className="flex-1 bg-white" onClick={handleClickOutside}>
      {/* 월간 헤더 */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <div className="flex items-center space-x-4">
          <h2 className="text-2xl font-bold text-gray-900">
            {year}년 {MONTHS[month]}
          </h2>
          <button
            onClick={goToToday}
            className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors cursor-pointer whitespace-nowrap"
          >
            오늘
          </button>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={goToPrevMonth}
            className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={goToNextMonth}
            className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors cursor-pointer"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 border-b border-gray-200">
        {DAYS.map(day => (
          <div
            key={day}
            className="p-4 text-center font-medium text-gray-900 border-r border-gray-200 last:border-r-0"
          >
            {day}
          </div>
        ))}
      </div>
      {/* 달력 그리드 */}
      <div className="grid grid-cols-7" style={{ height: 'calc(100vh - 280px)' }}>
        {calendarDays.map((dayData, index) => {
          const dayEvents = getEventsForDay(dayData);
          const isTodayCell = isToday(dayData);
          // Determine background classes: grey for non-current month, otherwise white with hover tint depending on events/selection
          let bgClass = '';
          if (!dayData.isCurrentMonth) {
            bgClass = 'bg-gray-100 hover:bg-gray-150';
          } else if (dayEvents.length > 0) {
            bgClass = 'bg-white hover:bg-green-50';
          } else if (selectedTemplate) {
            bgClass = 'bg-white hover:bg-blue-50';
          } else {
            bgClass = 'bg-white hover:bg-gray-50';
          }
          return (
            <div
              key={index}
              className={`border-r border-b border-gray-200 last:border-r-0 p-2 cursor-pointer transition-colors min-h-[120px] ${bgClass}`}
              onClick={e => handleCellClick(e, dayData)}
            >
              <div className="flex flex-col h-full">
                <div
                  className={`text-sm font-medium mb-2 ${
                    !dayData.isCurrentMonth
                      ? 'text-gray-400'
                      : isTodayCell
                      ? 'text-blue-600 bg-blue-100 w-6 h-6 rounded-full flex items-center justify-center'
                      : 'text-gray-900'
                  }`}
                >
                  {dayData.date}
                </div>
                <div
                  className="flex-1 flex items-center justify-center"
                  onClick={e => {
                    if (dayEvents.length > 0 && dayData.isCurrentMonth) {
                      e.stopPropagation();
                      setSelectedDayEvents({
                        date: `${dayData.fullDate.getMonth() + 1}월 ${dayData.date}일`,
                        events: dayEvents
                      });
                    }
                  }}
                >
                  {dayEvents.length > 0 && dayData.isCurrentMonth && (
                    <div className="text-center cursor-pointer hover:scale-110 transition-transform">
                      <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-[10px] font-medium mb-1 hover:bg-blue-600">
                        {dayEvents.length}
                      </div>
                      <div className="text-[9px] text-gray-600">일정</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {/* 일정 상세 보기 팝업 */}
      {selectedDayEvents && (
        <div
          className="fixed inset-0 bg-black/20 flex items-center justify-center z-50"
          onClick={() => setSelectedDayEvents(null)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-96 overflow-hidden"
            onClick={e => e.stopPropagation()}
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
                        <h4 className="font-medium text-gray-900 text-[10px]">
                          {event.template.name}
                        </h4>
                        <p className="text-[9px] text-gray-600 mt-1">
                          {event.startTime} - {event.endTime}
                        </p>
                        {event.template.description && (
                          <p className="text-[9px] text-gray-500 mt-1">
                            {event.template.description}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          onDeleteEvent(event.id);
                          if (selectedDayEvents.events.length === 1) {
                            setSelectedDayEvents(null);
                          } else {
                            setSelectedDayEvents(prev =>
                              prev
                                ? {
                                    ...prev,
                                    events: prev.events.filter(e => e.id !== event.id)
                                  }
                                : null
                            );
                          }
                        }}
                        className="w-6 h-6 flex items-center justify-center text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      >
                        <i className="ri-delete-bin-line w-4 h-4 flex items-center justify-center"></i>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* 컨텍스트 메뉴 */}
      {contextMenu && (
        <div
          className="fixed bg-white border border-gray-200 rounded-lg shadow-lg py-2 z-50"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={handleEditEvent}
            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center whitespace-nowrap"
          >
            <i className="ri-edit-line w-4 h-4 flex items-center justify-center mr-2"></i>
            수정
          </button>
          <button
            onClick={handleDeleteEventFromContext}
            className="w-full px-4 py-2 text-left text-red-600 hover:bg-red-50 flex items-center whitespace-nowrap"
          >
            <i className="ri-delete-bin-line w-4 h-4 flex items-center justify-center mr-2"></i>
            삭제
          </button>
        </div>
      )}
    </div>
  );
}