import { useState, useEffect } from 'react';
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
 * Main calendar page. Provides the overall layout including the header,
 * weekly/monthly views, template storage drawer, template editor modal
 * and the floating calendar widget. State is managed by the custom
 * useCalendar hook which persists data to localStorage.
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
  // State for the widget (whether the pop‑up is visible). Persisted via effect below
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

  // Placeholder handlers for notifications/share
  const handleNotifications = () => {
    alert('알림 기능은 준비 중입니다.');
  };
  const handleShare = () => {
    alert('공유 기능은 준비 중입니다.');
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
      {/* Header */}
      <CalendarHeader
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onCreateTemplate={handleCreateTemplate}
        onNotifications={handleNotifications}
        onShare={handleShare}
        events={events}
        onToggleWidget={handleToggleWidget}
        isWidgetOpen={isWidgetOpen}
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
    </div>
  );
}