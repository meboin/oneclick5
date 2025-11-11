import { useState, useRef, useEffect } from 'react';
import { Template } from '../../../types/calendar';

interface TemplateStorageProps {
  templates: Template[];
  selectedTemplate: Template | null;
  onSelectTemplate: (template: Template) => void;
  onDeleteTemplate: (templateId: string) => void;
  onEditTemplate: (template: Template) => void;
}

const STORAGE_KEY = 'template-storage-height';
const COLLAPSED_KEY = 'template-storage-collapsed';
const MIN_HEIGHT = 200;
const MAX_HEIGHT = 600;
const INITIAL_HEIGHT = 300;
const COLLAPSE_THRESHOLD = 100;

/**
 * 템플릿 저장 공간 컴포넌트. 아래에 고정되어 있고 드래그하여 높이를 조절할 수
 * 있으며 템플릿 목록을 렌더링하고 선택/수정/삭제 기능을 제공합니다. 높이와
 * 접힘 상태는 localStorage에 저장되어 유지됩니다.
 */
export default function TemplateStorage({
  templates,
  selectedTemplate,
  onSelectTemplate,
  onDeleteTemplate,
  onEditTemplate
}: TemplateStorageProps) {
  const [height, setHeight] = useState(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    return saved ? parseInt(saved, 10) : INITIAL_HEIGHT;
  });
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem(COLLAPSED_KEY) : null;
    return saved ? JSON.parse(saved) : false;
  });
  const [isResizing, setIsResizing] = useState(false);
  const [startY, setStartY] = useState(0);
  const [startHeight, setStartHeight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // 높이와 접힘 상태 저장
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, height.toString());
    }
  }, [height]);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(COLLAPSED_KEY, JSON.stringify(isCollapsed));
    }
  }, [isCollapsed]);

  // 리사이즈 시작
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsResizing(true);
    setStartY(e.clientY);
    setStartHeight(height);
    e.preventDefault();
  };
  // 리사이즈 처리
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const deltaY = startY - e.clientY;
      const newHeight = startHeight + deltaY;
      if (newHeight <= COLLAPSE_THRESHOLD) {
        setIsCollapsed(true);
        setHeight(INITIAL_HEIGHT);
      } else {
        setIsCollapsed(false);
        const clampedHeight = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, newHeight));
        setHeight(clampedHeight);
      }
    };
    const handleMouseUp = () => {
      setIsResizing(false);
    };
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'ns-resize';
      document.body.style.userSelect = 'none';
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, startY, startHeight]);

  // 접힘/펼침 토글
  const toggleCollapse = () => {
    setIsCollapsed(prev => !prev);
  };
  const handleDragStart = (e: React.DragEvent, template: Template) => {
    e.dataTransfer.setData('template', JSON.stringify(template));
  };
  const displayHeight = isCollapsed ? 60 : height;

  return (
    <div
      ref={containerRef}
      className="bg-white border-t border-gray-200 relative z-20"
      style={{ height: `${displayHeight}px`, position: 'fixed', bottom: 0, left: 0, right: 0, transition: isResizing ? 'none' : 'height 0.2s ease-out' }}
    >
      {/* 리사이즈 핸들 */}
      <div
        className={`absolute top-0 left-0 right-0 h-2 cursor-ns-resize ${isResizing ? 'bg-blue-500/30' : 'hover:bg-blue-500/20'}`}
        onMouseDown={handleMouseDown}
        title="드래그하여 크기 조절"
      >
        <div className={`absolute top-0 left-1/2 transform -translate-x-1/2 w-12 h-1 bg-gray-300 rounded-b mt-0.5 ${isResizing ? 'bg-blue-500' : 'hover:bg-blue-500'}`}></div>
      </div>
      {/* 헤더 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">템플릿 저장 공간</h3>
        <button
          onClick={toggleCollapse}
          className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 cursor-pointer"
          title={isCollapsed ? '펼치기' : '접기'}
        >
          <i className={`w-4 h-4 flex items-center justify-center ${isCollapsed ? 'ri-arrow-up-line' : 'ri-arrow-down-line'}`}></i>
        </button>
      </div>
      {/* 콘텐츠 영역 */}
      {!isCollapsed && (
        <div className="p-4 overflow-y-auto" style={{ height: `${height - 80}px` }}>
          {templates.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <i className="ri-folder-open-line w-12 h-12 flex items-center justify-center mx-auto mb-3 text-gray-300"></i>
              <p>저장된 템플릿이 없습니다</p>
              <p className="text-sm">새 템플릿을 생성해보세요</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {templates.map(template => (
                <div
                  key={template.id}
                  className={`p-3 border rounded-lg cursor-pointer group ${
                    selectedTemplate?.id === template.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                  }`}
                  draggable
                  onDragStart={e => handleDragStart(e, template)}
                  onClick={() => onSelectTemplate(template)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: template.color }}></div>
                    <div className="flex space-x-1 opacity-0 group-hover:opacity-100">
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          onEditTemplate(template);
                        }}
                        className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-blue-600 cursor-pointer"
                        title="수정"
                      >
                        <i className="ri-edit-line w-3 h-3 flex items-center justify-center"></i>
                      </button>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          onDeleteTemplate(template.id);
                        }}
                        className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-red-600 cursor-pointer"
                        title="삭제"
                      >
                        <i className="ri-delete-bin-line w-3 h-3 flex items-center justify-center"></i>
                      </button>
                    </div>
                  </div>
                  <h4 className="font-medium text-gray-900 text-sm mb-1 truncate">{template.name}</h4>
                  <p className="text-xs text-gray-600 mb-2 line-clamp-2">{template.description || '설명 없음'}</p>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>
                      {Math.floor(template.duration / 60)}시간 {template.duration % 60}분
                    </span>
                    <i className="ri-drag-move-line w-3 h-3 flex items-center justify-center opacity-50"></i>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}