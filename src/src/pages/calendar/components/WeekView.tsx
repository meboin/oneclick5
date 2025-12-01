import { useState } from 'react';
import { CalendarEvent, Template } from '../../../types/calendar';

interface WeekViewProps {
  events: CalendarEvent[];
  selectedTemplate: Template | null;
  onAddEvent: (event: Omit<CalendarEvent, 'id'>) => void;
  onDeleteEvent: (eventId: string) => void;
  onUpdateEvent: (eventId: string, updates: Partial<CalendarEvent>) => void;
  onEditTemplate: (template: Template) => void;
}

const DAYS = ['월', '화', '수', '목', '금', '토', '일'];
const HOURS = Array.from({ length: 12 }, (_, i) => i + 7); // 7시부터 18시까지

/**
 * 주간 보기 컴포넌트. 시간과 요일 그리드에 이벤트를 렌더링하며 템플릿을 드래그하여
 * 새 일정을 만들 수 있습니다. 이벤트를 클릭하면 템플릿의 URL과 첨부파일을 열어줍니다.
 */
export default function WeekView({
  events,
  selectedTemplate,
  onAddEvent,
  onDeleteEvent,
  onUpdateEvent,
  onEditTemplate
}: WeekViewProps) {
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    event: CalendarEvent;
  } | null>(null);

  // 셀을 클릭하여 새 이벤트 생성
  const handleCellClick = (day: number, hour: number) => {
    if (!selectedTemplate) return;
    const startTime = `${hour.toString().padStart(2, '0')}:00`;
    const endHour = hour + Math.floor(selectedTemplate.duration / 60);
    const endMinute = selectedTemplate.duration % 60;
    const endTime = `${endHour.toString().padStart(2, '0')}:${endMinute
      .toString()
      .padStart(2, '0')}`;
    onAddEvent({
      templateId: selectedTemplate.id,
      template: selectedTemplate,
      startTime,
      endTime,
      day
    });
  };

  /**
   * 이벤트 클릭 핸들러: 템플릿에 연결된 URL과 첨부 파일을 열어줍니다. fileData가
   * 존재하면 그것을, File 객체가 있으면 객체 URL을 사용합니다. 둘 다 없으면
   * 첫 번째 URL을 fetch해서 열어봅니다.
   */
  const handleEventClick = async (event: CalendarEvent) => {
    const template = event.template;
    // 첨부파일이 있으면 먼저 열기
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
    if (template.file && template.file instanceof File) {
      const objectUrl = URL.createObjectURL(template.file);
      window.open(objectUrl, '_blank');
      return;
    }
    // 파일이 없을 경우 URL을 모두 열기
    if (template.urls && template.urls.length > 0) {
      const validUrls = template.urls.filter(url => url.trim());
      if (validUrls.length > 0) {
        validUrls.forEach(url => {
          window.open(url, '_blank');
        });
        return;
      }
    }
    // 아무 동작 없음
  };

  // 우클릭 컨텍스트 메뉴 표시
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
  };

  // 드래그 앤 드롭: 셀에 템플릿을 드롭하여 일정 생성 또는 이벤트 이동
  const handleDrop = (e: React.DragEvent, day: number, hour: number) => {
    e.preventDefault();
    // 템플릿 드래그 처리
    const templateData = e.dataTransfer.getData('template');
    if (templateData) {
      const template: Template = JSON.parse(templateData);
      const startTime = `${hour.toString().padStart(2, '0')}:00`;
      const endHour = hour + Math.floor(template.duration / 60);
      const endMinute = template.duration % 60;
      const endTime = `${endHour.toString().padStart(2, '0')}:${endMinute
        .toString()
        .padStart(2, '0')}`;
      onAddEvent({
        templateId: template.id,
        template,
        startTime,
        endTime,
        day
      });
      return;
    }
    // 이벤트 드래그 처리
    const eventData = e.dataTransfer.getData('event');
    if (eventData) {
      const eventId = JSON.parse(eventData);
      const event = events.find(e => e.id === eventId);
      if (event) {
        const startTime = `${hour.toString().padStart(2, '0')}:00`;
        const endHour = hour + Math.floor(event.template.duration / 60);
        const endMinute = event.template.duration % 60;
        const endTime = `${endHour.toString().padStart(2, '0')}:${endMinute
          .toString()
          .padStart(2, '0')}`;
        onUpdateEvent(eventId, { day, startTime, endTime });
      }
    }
  };

  // 특정 셀에 해당하는 이벤트를 찾음
  const getEventForCell = (day: number, hour: number) => {
    return events.find(event => {
      const eventStartHour = parseInt(event.startTime.split(':')[0]);
      const eventEndHour = parseInt(event.endTime.split(':')[0]);
      const eventEndMinute = parseInt(event.endTime.split(':')[1]);
      const actualEndHour = eventEndMinute > 0 ? eventEndHour + 1 : eventEndHour;
      return event.day === day && hour >= eventStartHour && hour < actualEndHour;
    });
  };

  // 이벤트 시작 여부 확인
  const isEventStart = (event: CalendarEvent, hour: number) => {
    const eventStartHour = parseInt(event.startTime.split(':')[0]);
    return hour === eventStartHour;
  };

  // 이벤트가 차지하는 셀 높이 계산 (시간 수)
  const getEventHeight = (event: CalendarEvent) => {
    const startHour = parseInt(event.startTime.split(':')[0]);
    const endHour = parseInt(event.endTime.split(':')[0]);
    const endMinute = parseInt(event.endTime.split(':')[1]);
    const startMinutes = startHour * 60;
    const endMinutes = endHour * 60 + endMinute;
    const durationHours = (endMinutes - startMinutes) / 60;
    return Math.max(1, Math.ceil(durationHours));
  };

  return (
    <div className="flex-1 bg-white h-full overflow-hidden" onClick={handleClickOutside}>
      {/* 요일 헤더 */}
      <div className="grid grid-cols-8 border-b border-gray-200">
        <div className="p-2 border-r border-gray-200"></div>
        {DAYS.map(day => (
          <div
            key={day}
            className="p-2 text-center font-medium text-gray-900 border-r border-gray-200 text-sm"
          >
            {day}
          </div>
        ))}
      </div>
      {/* 시간/요일 그리드 */}
      <div className="grid grid-cols-8 h-full overflow-y-auto">
        {HOURS.map(hour => (
          <div key={hour} className="contents">
            <div
              className="p-2 border-r border-b border-gray-200 text-xs text-gray-600 font-medium flex items-center justify-center"
              style={{ minHeight: 'calc((100vh - 120px) / 12)' }}
            >
              {hour}:00
            </div>
            {DAYS.map((_, dayIndex) => {
              const cellEvent = getEventForCell(dayIndex, hour);
              const isStart = cellEvent && isEventStart(cellEvent, hour);
              const eventHeight = cellEvent ? getEventHeight(cellEvent) : 1;
              return (
                <div
                  key={`${hour}-${dayIndex}`}
                  className={`border-r border-b border-gray-200 p-1 cursor-pointer transition-colors relative ${
                    selectedTemplate ? 'hover:bg-blue-50' : 'hover:bg-gray-50'
                  }`}
                  style={{ minHeight: 'calc((100vh - 120px) / 12)' }}
                  onClick={() => handleCellClick(dayIndex, hour)}
                  onDrop={e => handleDrop(e, dayIndex, hour)}
                  onDragOver={e => e.preventDefault()}
                >
                  {cellEvent && isStart && (
                    <div
                      className="absolute left-0.5 right-0.5 p-1 rounded text-white text-xs font-medium group cursor-move z-10"
                      style={{
                        backgroundColor: cellEvent.template.color,
                        height: `calc(${eventHeight} * (100vh - 120px) / 12 - 2px)`,
                        top: '2px'
                      }}
                      draggable
                      onDragStart={e => {
                        e.dataTransfer.setData('event', JSON.stringify(cellEvent.id));
                        e.stopPropagation();
                      }}
                      onClick={e => {
                        e.stopPropagation();
                        handleEventClick(cellEvent);
                      }}
                      onContextMenu={e => handleEventContextMenu(e, cellEvent)}
                    >
                      <div className="truncate text-xs">{cellEvent.template.name}</div>
                      <div className="text-xs opacity-75">
                        {cellEvent.startTime} - {cellEvent.endTime}
                      </div>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          onDeleteEvent(cellEvent.id);
                        }}
                        className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                      >
                        <i className="ri-close-line w-2.5 h-2.5 flex items-center justify-center"></i>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      {/* 컨텍스트 메뉴 */}
      {contextMenu && (
        <div
          className="fixed bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={handleEditEvent}
            className="w-full px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-100 flex items-center whitespace-nowrap"
          >
            <i className="ri-edit-line w-3 h-3 flex items-center justify-center mr-1.5"></i>
            수정
          </button>
          <button
            onClick={handleDeleteEventFromContext}
            className="w-full px-3 py-1.5 text-left text-xs text-red-600 hover:bg-red-50 flex items-center whitespace-nowrap"
          >
            <i className="ri-delete-bin-line w-3 h-3 flex items-center justify-center mr-1.5"></i>
            삭제
          </button>
        </div>
      )}
    </div>
  );
}