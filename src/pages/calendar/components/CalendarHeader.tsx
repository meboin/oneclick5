import { CalendarEvent, CalendarData } from '../../../types/calendar';
import { useState } from 'react';

interface CalendarHeaderProps {
  viewMode: 'week' | 'month';
  onViewModeChange: (mode: 'week' | 'month') => void;
  onCreateTemplate: () => void;
  onNotifications: () => void;
  onShare: () => void;
  events: CalendarEvent[];
  onToggleWidget: () => void;
  isWidgetOpen: boolean;
  /** Number of pending alert notifications. Displays a red dot when > 0. */
  alertCount?: number;
  /** List of calendars to display in the drop‑down. */
  calendars: CalendarData[];
  /** ID of the currently selected calendar. */
  selectedCalendarId: string | null;
  /** Select a calendar by ID. */
  onSelectCalendar: (id: string) => void;
  /** Rename a calendar. */
  onRenameCalendar: (id: string, newName: string) => void;
  /** Delete a calendar. */
  onDeleteCalendar: (id: string) => void;
  /** Reorder calendars by moving fromIndex to toIndex. */
  onReorderCalendars: (from: number, to: number) => void;
  /** Create a new calendar with the provided name. */
  onCreateCalendar: (name: string) => void;
}

/**
 * 캘린더 상단 헤더.
 * 주간/월간 보기 전환, 새로운 템플릿 생성 버튼, 알림/공유 버튼,
 * 위젯 토글 버튼을 제공합니다. 필요하다면 새로운 시간표 생성 버튼과
 * 현재 시간표 이름을 표시할 수 있습니다.
 */
export default function CalendarHeader({
  viewMode,
  onViewModeChange,
  onCreateTemplate,
  onNotifications,
  onShare,
  events,
  onToggleWidget,
  isWidgetOpen,
  alertCount = 0,
  calendars,
  selectedCalendarId,
  onSelectCalendar,
  onRenameCalendar,
  onDeleteCalendar,
  onReorderCalendars,
  onCreateCalendar
}: CalendarHeaderProps) {
  // Determine the currently selected calendar name
  const currentCalendar = calendars.find(c => c.id === selectedCalendarId);
  const currentName = currentCalendar?.name || '캘린더';
  // Filter today's events for display
  const todayEvents = events.filter(event => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    return event.day === adjustedDay;
  });
  // Dropdown state and drag indices
  const [isDropdownOpen, setDropdownOpen] = useState(false);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // State to control creation of a new calendar via an inline form. When true,
  // a small input panel will appear below the "새 시간표" button allowing the
  // user to enter a name and confirm or cancel.
  const [isCreateCalendarOpen, setCreateCalendarOpen] = useState(false);
  const [newCalendarName, setNewCalendarName] = useState('');

  // Handlers
  const toggleDropdown = () => setDropdownOpen(prev => !prev);
  const handleCreateCalendar = () => {
    // Toggle the inline creation form. If already open, do nothing here; the
    // form will handle confirmation. Reset the name when opening.
    setCreateCalendarOpen(true);
    setNewCalendarName('');
  };
  const handleRename = (id: string, currentName: string) => {
    const newName = typeof window !== 'undefined' ? window.prompt('새 이름을 입력하세요', currentName) : null;
    if (newName && newName.trim() !== '' && newName !== currentName) {
      onRenameCalendar(id, newName.trim());
    }
  };
  const handleDelete = (id: string, name: string) => {
    if (typeof window === 'undefined') return;
    const confirmed = window.confirm(`${name} 시간표를 삭제하시겠습니까?`);
    if (confirmed) {
      onDeleteCalendar(id);
    }
  };
  const handleDrop = () => {
    if (draggingIndex !== null && dragOverIndex !== null && draggingIndex !== dragOverIndex) {
      onReorderCalendars(draggingIndex, dragOverIndex);
    }
    setDraggingIndex(null);
    setDragOverIndex(null);
  };

  /** Confirm creation of a new calendar with the name entered by the user. */
  const confirmCreateCalendar = () => {
    const trimmed = newCalendarName.trim();
    if (trimmed !== '') {
      onCreateCalendar(trimmed);
    }
    setCreateCalendarOpen(false);
    setNewCalendarName('');
  };

  /** Cancel creation of a new calendar and close the input panel. */
  const cancelCreateCalendar = () => {
    setCreateCalendarOpen(false);
    setNewCalendarName('');
  };

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3 relative">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {/* Current calendar name */}
          <h1 className="text-xl font-bold text-gray-900">{currentName}</h1>
          {/* View mode toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => onViewModeChange('week')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                viewMode === 'week' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              주간
            </button>
            <button
              onClick={() => onViewModeChange('month')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                viewMode === 'month' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              월간
            </button>
          </div>
          {/* New schedule button with inline creation form */}
          <div className="relative ml-2">
            <button
              onClick={handleCreateCalendar}
              className="px-3 py-1.5 rounded-md bg-green-600 text-white text-xs font-medium hover:bg-green-700 transition-colors whitespace-nowrap"
            >
              새 시간표
            </button>
            {isCreateCalendarOpen && (
              <div className="absolute left-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-40 p-3">
                <input
                  type="text"
                  value={newCalendarName}
                  onChange={e => setNewCalendarName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  placeholder="새 시간표 이름"
                  autoFocus
                />
                <div className="flex justify-end space-x-2 mt-2">
                  <button
                    type="button"
                    onClick={cancelCreateCalendar}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    onClick={confirmCreateCalendar}
                    className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    확인
                  </button>
                </div>
              </div>
            )}
          </div>
          {/* Dropdown toggle and menu wrapper */}
          <div className="relative">
            <button
              onClick={toggleDropdown}
              className="w-6 h-6 flex items-center justify-center text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
              title="시간표 선택"
            >
              <i className={`ri-arrow-down-s-line w-4 h-4 flex items-center justify-center transition-transform ${
                isDropdownOpen ? 'rotate-180' : ''
              }`}></i>
            </button>
            {isDropdownOpen && (
              <div className="absolute left-1/2 transform -translate-x-1/2 mt-2 bg-white shadow-lg border border-gray-200 rounded-lg z-30 w-64">
                <div className="max-h-60 overflow-y-auto">
                  {calendars.map((cal, index) => (
                    <div
                      key={cal.id}
                      className={`flex items-center space-x-2 px-3 py-2 cursor-pointer ${
                        selectedCalendarId === cal.id ? 'bg-blue-50' : 'hover:bg-gray-50'
                      }`}
                      draggable
                      onDragStart={() => setDraggingIndex(index)}
                      onDragOver={e => {
                        e.preventDefault();
                        setDragOverIndex(index);
                      }}
                      onDrop={handleDrop}
                    >
                      {/* Drag handle */}
                      <i className="ri-drag-move-line text-gray-400"></i>
                      {/* Calendar name */}
                      <span
                        className={`flex-1 text-sm ${selectedCalendarId === cal.id ? 'font-semibold' : ''}`}
                        onClick={() => {
                          onSelectCalendar(cal.id);
                          setDropdownOpen(false);
                        }}
                      >
                        {cal.name}
                      </span>
                      {/* Rename */}
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          handleRename(cal.id, cal.name);
                        }}
                        className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-blue-600"
                        title="이름 수정"
                      >
                        <i className="ri-edit-line w-3 h-3 flex items-center justify-center"></i>
                      </button>
                      {/* Delete */}
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          handleDelete(cal.id, cal.name);
                        }}
                        className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-red-600"
                        title="삭제"
                      >
                        <i className="ri-delete-bin-line w-3 h-3 flex items-center justify-center"></i>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {todayEvents.length > 0 && (
            <div className="flex items-center space-x-1.5 bg-blue-50 px-2.5 py-1.5 rounded-lg">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
              <span className="text-xs text-blue-700 font-medium">
                오늘 {todayEvents.length}개 일정
              </span>
            </div>
          )}
          {/* Create template button */}
          <button
            onClick={onCreateTemplate}
            className="bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors font-medium text-xs whitespace-nowrap"
          >
            새 템플릿
          </button>
          {/* Notifications button */}
          <div className="relative">
            <button
              onClick={onNotifications}
              className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
            >
              <i className="ri-notification-line w-4 h-4 flex items-center justify-center"></i>
            </button>
            {alertCount > 0 && (
              <span className="absolute top-1 right-1 inline-block w-2 h-2 bg-red-500 rounded-full"></span>
            )}
          </div>
          {/* Share button */}
          <button
            onClick={onShare}
            className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
          >
            <i className="ri-share-line w-4 h-4 flex items-center justify-center"></i>
          </button>
          {/* Widget toggle */}
          <button
            onClick={onToggleWidget}
            className={`w-8 h-8 flex items-center justify-center rounded-full shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group ${
              isWidgetOpen ? 'bg-gradient-to-br from-purple-500 to-blue-600 text-white' : 'bg-gradient-to-br from-blue-500 to-purple-600 text-white'
            }`}
            title={isWidgetOpen ? '위젯 닫기' : '위젯 열기'}
          >
            <i
              className={`w-4 h-4 flex items-center justify-center group-hover:scale-110 transition-transform ${
                isWidgetOpen ? 'ri-close-line' : 'ri-calendar-line'
              }`}
            ></i>
          </button>
        </div>
      </div>
    </div>
  );
}