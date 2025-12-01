import { CalendarEvent } from '../../../types/calendar';

interface CalendarHeaderProps {
  viewMode: 'week' | 'month';
  onViewModeChange: (mode: 'week' | 'month') => void;
  onCreateTemplate: () => void;
  onNotifications: () => void;
  onShare: () => void;
  events: CalendarEvent[];
  onToggleWidget: () => void;
  isWidgetOpen: boolean;
}

/**
 * 캘린더 상단 헤더. 주간/월간 보기 전환과 새로운 템플릿 생성 버튼,
 * 알림/공유 버튼, 위젯 토글 버튼을 제공합니다. 오늘 일정 수를 표시합니다.
 */
export default function CalendarHeader({
  viewMode,
  onViewModeChange,
  onCreateTemplate,
  onNotifications,
  onShare,
  events,
  onToggleWidget,
  isWidgetOpen
}: CalendarHeaderProps) {
  const todayEvents = events.filter(event => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    return event.day === adjustedDay;
  });
  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <h1 className="text-xl font-bold text-gray-900">캘린더</h1>
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
          <button
            onClick={onCreateTemplate}
            className="bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors font-medium text-xs whitespace-nowrap cursor-pointer"
          >
            새 템플릿
          </button>
          <button
            onClick={onNotifications}
            className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
          >
            <i className="ri-notification-line w-4 h-4 flex items-center justify-center"></i>
          </button>
          <button
            onClick={onShare}
            className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
          >
            <i className="ri-share-line w-4 h-4 flex items-center justify-center"></i>
          </button>
          <button
            onClick={onToggleWidget}
            className={`w-8 h-8 flex items-center justify-center rounded-full shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group ${
              isWidgetOpen ? 'bg-gradient-to-br from-purple-500 to-blue-600 text-white' : 'bg-gradient-to-br from-blue-500 to-purple-600 text-white'
            }`}
            title={isWidgetOpen ? '위젯 닫기' : '위젯 열기'}
          >
            <i className={`w-4 h-4 flex items-center justify-center group-hover:scale-110 transition-transform ${
              isWidgetOpen ? 'ri-close-line' : 'ri-calendar-line'
            }`}></i>
          </button>
        </div>
      </div>
    </div>
  );
}