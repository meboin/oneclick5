import { useState, useEffect, useRef } from 'react';
import { useCalendar } from '../../hooks/useCalendar';
import { Template } from '../../types/calendar';
import CalendarHeader from './components/CalendarHeader';
import TemplateStorage from './components/TemplateStorage';
import WeekView from './components/WeekView';
import MonthView from './components/MonthView';
import TemplateForm from './components/TemplateForm';
import CalendarWidget from './components/CalendarWidget';
import Modal from '../../components/base/Modal';
import { useUpcomingNotice } from '../../hooks/useUpcomingNotice';


/**
 * 메인 캘린더 페이지입니다. 헤더, 주간/월간 뷰, 템플릿 보관함,
 * 템플릿 생성/수정 모달 및 캘린더 위젯을 포함합니다. 또한 일정
 * 알림(1시간 전)을 제공하고 공유 기능을 구현합니다. 여러 개의
 * 시간표를 만들 수 있으며, 새 시간표를 생성하는 버튼도 제공합니다.
 */
export default function CalendarPage() {
  const {
    calendars,
    selectedCalendar,
    selectedCalendarId,
    templates,
    events,
    viewMode,
    setViewMode,
    selectedTemplate,
    addCalendar,
    selectCalendar,
    renameCalendar,
    deleteCalendar,
    reorderCalendars,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    addEvent,
    deleteEvent,
    updateEvent,
    selectTemplate,
    clearSelection
  } = useCalendar();

  // 1시간 이내로 다가온 일정 중 가장 빠른 일정 정보 (분 단위 남은 시간)
  const upcomingNotice = useUpcomingNotice(events);

  // Template modal state
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  // Widget state
  const [isWidgetOpen, setIsWidgetOpen] = useState(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('calendar-widget-open') : null;
    return saved ? JSON.parse(saved) : false;
  });
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('calendar-widget-open', JSON.stringify(isWidgetOpen));
    }
  }, [isWidgetOpen]);

  // Template modal handlers
  const handleCreateTemplate = () => {
    setEditingTemplate(null);
    setIsTemplateModalOpen(true);
  };
  const handleEditTemplate = (template: Template) => {
    setEditingTemplate(template);
    setIsTemplateModalOpen(true);
  };
  const handleTemplateSubmit = (templateData: any) => {
    if (editingTemplate) {
      updateTemplate(editingTemplate.id, templateData);
    } else {
      addTemplate(templateData);
    }
    setIsTemplateModalOpen(false);
    setEditingTemplate(null);
  };
  const handleModalClose = () => {
    setIsTemplateModalOpen(false);
    setEditingTemplate(null);
  };

  // Notification state
  const [alerts, setAlerts] = useState<{ id: string; message: string }[]>([]);
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);
  const alertedEventsRef = useRef<Set<string>>(new Set());
  // Notification effect: check every minute for events an hour away
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const nowDay = (now.getDay() + 6) % 7;
      events.forEach(ev => {
        if (ev.day === nowDay) {
          const [startHour, startMinute] = ev.startTime.split(':').map(Number);
          const eventStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), startHour, startMinute);
          const diffMinutes = (eventStart.getTime() - now.getTime()) / 60000;
          if (diffMinutes > 59 && diffMinutes <= 60) {
            const alertId = `${ev.id}-${eventStart.toISOString()}`;
            if (!alertedEventsRef.current.has(alertId)) {
              alertedEventsRef.current.add(alertId);
              const msg = `${ev.template.name} 수업 1시간 전`;
              setAlerts(prev => [...prev, { id: alertId, message: msg }]);
            }
          }
        }
      });
    }, 60000);
    return () => clearInterval(interval);
  }, [events]);

  const handleNotifications = () => {
    setIsAlertsOpen(prev => !prev);
  };
  const handleShare = async () => {
    const today = new Date();
    const day = (today.getDay() + 6) % 7;
    const todayEvents = events.filter(ev => ev.day === day);
    const shareText = todayEvents.length > 0
      ? todayEvents.map(ev => `${ev.template.name} ${ev.startTime}-${ev.endTime}`).join('\n')
      : '오늘 일정이 없습니다.';
    if (navigator.share) {
      try {
        await navigator.share({ title: '오늘 일정', text: shareText });
        return;
      } catch (err) {
        // fall through
      }
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(shareText);
        alert('오늘 일정이 클립보드에 복사되었습니다.');
      } catch {
        alert('공유 기능을 지원하지 않는 브라우저입니다.');
      }
    } else {
      alert('공유 기능을 지원하지 않는 브라우저입니다.');
    }
  };
  const handleToggleWidget = () => {
    setIsWidgetOpen(prev => !prev);
  };
  const handleCloseWidget = () => {
    setIsWidgetOpen(false);
  };

  // Create a new calendar with the given name
  const handleAddCalendar = (name: string) => {
    addCalendar(name);
  };
  // Select a calendar by ID
  const handleSelectCalendar = (id: string) => {
    selectCalendar(id);
  };
  // Rename a calendar
  const handleRenameCalendar = (id: string, newName: string) => {
    renameCalendar(id, newName);
  };
  // Delete a calendar
  const handleDeleteCalendar = (id: string) => {
    deleteCalendar(id);
  };
  // Reorder calendars
  const handleReorderCalendars = (from: number, to: number) => {
    reorderCalendars(from, to);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <CalendarHeader
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onCreateTemplate={handleCreateTemplate}
        onNotifications={handleNotifications}
        onShare={handleShare}
        events={events}
        onToggleWidget={handleToggleWidget}
        isWidgetOpen={isWidgetOpen}
        alertCount={alerts.length}
        calendars={calendars}
        selectedCalendarId={selectedCalendarId}
        onSelectCalendar={handleSelectCalendar}
        onRenameCalendar={handleRenameCalendar}
        onDeleteCalendar={handleDeleteCalendar}
        onReorderCalendars={handleReorderCalendars}
        onCreateCalendar={handleAddCalendar}
      />
      <div className="flex" style={{ height: 'calc(100vh - 50px - 60px)' }}>
        <div className="flex-1 flex flex-col">
          {viewMode === 'week' ? (
            <WeekView
              events={events}
              selectedTemplate={selectedTemplate}
              onAddEvent={addEvent}
              onDeleteEvent={deleteEvent}
              onUpdateEvent={updateEvent}
              onEditTemplate={handleEditTemplate}
            />
          ) : (
            <MonthView
              events={events}
              selectedTemplate={selectedTemplate}
              onAddEvent={addEvent}
              onDeleteEvent={deleteEvent}
              onEditTemplate={handleEditTemplate}
            />
          )}
        </div>
      </div>
      <TemplateStorage
        templates={templates}
        selectedTemplate={selectedTemplate}
        onSelectTemplate={selectTemplate}
        onDeleteTemplate={deleteTemplate}
        onEditTemplate={handleEditTemplate}
      />
      <Modal
        isOpen={isTemplateModalOpen}
        onClose={handleModalClose}
        title={editingTemplate ? '템플릿 수정' : '새 템플릿 생성'}
      >
        <TemplateForm
          onSubmit={handleTemplateSubmit}
          onCancel={handleModalClose}
          editingTemplate={editingTemplate}
        />
      </Modal>
      <CalendarWidget
        isOpen={isWidgetOpen}
        onClose={handleCloseWidget}
        events={events}
        onCreateTemplate={handleCreateTemplate}
      />

      {/* 1시간 이내로 다가온 일정 분단위 알림 */}
      {upcomingNotice && (
        <div className="fixed top-16 right-4 bg-white border border-blue-200 shadow-lg rounded-lg px-4 py-3 text-sm z-40">
          <div className="text-xs font-semibold text-blue-600 mb-1">
            곧 시작할 일정
          </div>
          <div className="font-medium text-gray-900 truncate">
            {upcomingNotice.title}
          </div>
          <div className="text-xs text-gray-600 mt-1">
            {upcomingNotice.minutesLeft}분 남았습니다
          </div>
        </div>
      )}

      {selectedTemplate && (
        <div className="fixed bottom-3 right-3 bg-blue-600 text-white px-3 py-2 rounded-lg shadow-lg">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: selectedTemplate.color }}></div>
            <span className="text-xs font-medium">{selectedTemplate.name} 선택됨</span>
            <button
              onClick={clearSelection}
              className="w-4 h-4 flex items-center justify-center text-white hover:text-gray-200 cursor-pointer"
            >
              <i className="ri-close-line w-3 h-3 flex items-center justify-center"></i>
            </button>
          </div>
        </div>
      )}
      {isAlertsOpen && (
        <div className="fixed top-16 right-4 w-80 bg-white shadow-lg rounded-lg border border-gray-200 max-h-80 overflow-y-auto z-50">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 text-sm">알림</h3>
            <button
              onClick={() => {
                setAlerts([]);
                setIsAlertsOpen(false);
                alertedEventsRef.current.clear();
              }}
              className="text-gray-500 hover:text-gray-700"
            >
              <i className="ri-close-line"></i>
            </button>
          </div>
          <div className="p-4 space-y-2">
            {alerts.length === 0 ? (
              <p className="text-sm text-gray-500">알림이 없습니다.</p>
            ) : (
              alerts.map(alert => (
                <div key={alert.id} className="text-sm text-gray-800">
                  {alert.message}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
