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

/**
 * 메인 캘린더 페이지입니다. 헤더, 주간/월간 뷰, 템플릿 보관함,
 * 템플릿 생성/수정 모달 및 캘린더 위젯을 포함합니다. 또한 일정
 * 알림(1시간 전)을 제공하고 공유 기능을 구현합니다.
 */
export default function CalendarPage() {
  const {
    templates,
    events,
    viewMode,
    selectedTemplate,
    setViewMode,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    addEvent,
    deleteEvent,
    updateEvent,
    selectTemplate,
    clearSelection
  } = useCalendar();

  // State for the template editor modal
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  // State for the widget (whether the pop‑up is visible)
  const [isWidgetOpen, setIsWidgetOpen] = useState(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('calendar-widget-open') : null;
    return saved ? JSON.parse(saved) : false;
  });

  // Persist widget open state to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('calendar-widget-open', JSON.stringify(isWidgetOpen));
    }
  }, [isWidgetOpen]);

  // Handlers for creating/editing templates
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

  // ---------------------------------------------------------------------------
  // 알림(1시간 전) 기능
  // alerts: 현재 화면에 표시할 알림 메시지 배열. 각 알림은 고유한 id를 가진다.
  const [alerts, setAlerts] = useState<{ id: string; message: string }[]>([]);
  // isAlertsOpen: 알림 패널 표시 여부
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);
  // alertedEventsRef: 이미 알림을 표시한 이벤트 id+startTime 조합을 기억하여 중복 알림을 방지한다.
  const alertedEventsRef = useRef<Set<string>>(new Set());

  // 주기적으로(매 1분) 현재 시간과 이벤트 시작 시간을 비교하여 1시간 전 알림을 생성한다.
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const nowDay = (now.getDay() + 6) % 7; // Monday‑based index: 0=Mon, 6=Sun
      events.forEach(ev => {
        if (ev.day === nowDay) {
          const [startHour, startMinute] = ev.startTime.split(':').map(Number);
          const eventStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), startHour, startMinute);
          const diffMinutes = (eventStart.getTime() - now.getTime()) / 60000;
          // Trigger when the event is between 59 and 60 minutes away
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
    }, 60000); // check every minute
    return () => clearInterval(interval);
  }, [events]);

  // 알림 버튼 클릭 시 패널 표시/숨김 토글
  const handleNotifications = () => {
    setIsAlertsOpen(prev => !prev);
  };

  // 공유 기능 구현. 오늘의 일정들을 문자열로 만들어 navigator.share 또는 클립보드 복사한다.
  const handleShare = async () => {
    const today = new Date();
    const day = (today.getDay() + 6) % 7;
    const todayEvents = events.filter(ev => ev.day === day);
    const shareText = todayEvents.length > 0
      ? todayEvents.map(ev => `${ev.template.name} ${ev.startTime}-${ev.endTime}`).join('\n')
      : '오늘 일정이 없습니다.';
    // Try Web Share API if available
    if (navigator.share) {
      try {
        await navigator.share({ title: '오늘 일정', text: shareText });
        return;
      } catch (err) {
        // fall through to clipboard copy on failure
      }
    }
    // Fallback: copy to clipboard
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

  // Widget toggle handlers
  const handleToggleWidget = () => {
    setIsWidgetOpen(prev => !prev);
  };
  const handleCloseWidget = () => {
    setIsWidgetOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with alert count */}
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
      />

      {/* Main content: either week or month view */}
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

      {/* Template storage drawer */}
      <TemplateStorage
        templates={templates}
        selectedTemplate={selectedTemplate}
        onSelectTemplate={selectTemplate}
        onDeleteTemplate={deleteTemplate}
        onEditTemplate={handleEditTemplate}
      />

      {/* Template form modal */}
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

      {/* Calendar widget pop‑up */}
      <CalendarWidget
        isOpen={isWidgetOpen}
        onClose={handleCloseWidget}
        events={events}
        onCreateTemplate={handleCreateTemplate}
      />

      {/* Selected template badge */}
      {selectedTemplate && (
        <div className="fixed bottom-3 right-3 bg-blue-600 text-white px-3 py-2 rounded-lg shadow-lg">
          <div className="flex items-center space-x-2">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: selectedTemplate.color }}
            ></div>
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

      {/* Notifications panel */}
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