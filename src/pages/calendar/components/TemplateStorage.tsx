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
// 템플릿 저장 공간의 접힘 높이. 이 높이보다 작아지면 자동으로 접히도록 합니다.
// 접힘 상태의 헤더(타이틀 바) 높이. 드래그 시 이 높이를 기준으로 계산합니다.
// 헤더(패딩과 버튼 포함) 높이를 늘려 탬플릿 저장 공간 뒤 회색 영역을 가리도록 합니다.
// 드래그 핸들 1px과 경계선을 포함해 전체 접힘 높이를 약 60px로 설정합니다.
// 헤더 높이 (패딩 포함): p-3(12px*2) + 버튼(24px) + 테두리(약 1px) = 약 49px
// 접힘 상태에서 헤더와 외부 컨테이너의 선이 맞도록 높이를 약 50px로 설정합니다.
const HEADER_HEIGHT = 50;

/**
 * 템플릿 저장 공간 컴포넌트.
 * 주간/월간 보기와 비슷한 비율로 축소하기 위해 폰트 크기와 버튼 크기를 줄였습니다.
 * 아래에 고정되어 있고 드래그하여 높이를 조절할 수 있으며 템플릿 목록을 렌더링하고
 * 선택/수정/삭제 기능을 제공합니다. 높이와 접힘 상태는 localStorage에 저장되어 유지됩니다.
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
    // 리사이즈 시작 시 현재 보여지는 높이를 기준으로 합니다. 접힘 상태라면 헤더 높이(60px)를 사용합니다.
    setIsResizing(true);
    setStartY(e.clientY);
    // startHeight는 현재 표시되는 높이로 설정합니다. 접힘 상태에서는 HEADER_HEIGHT를 기준으로 하여
    // 클릭 시 컨테이너가 갑자기 원래 높이로 튀어오르지 않도록 합니다.
    setStartHeight(isCollapsed ? HEADER_HEIGHT : height);
    e.preventDefault();
  };
  // 리사이즈 처리
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const deltaY = startY - e.clientY;
      const newHeight = startHeight + deltaY;
      // 새 높이가 헤더 높이보다 작거나 같으면 접힘 상태로 전환합니다. 그 이하로는 더 내려가지 않습니다.
      if (newHeight <= HEADER_HEIGHT) {
        setIsCollapsed(true);
      } else {
        // 접힘 상태를 해제하고 높이를 업데이트합니다. 여기서 startHeight는 클릭 시 기준이므로
        // 드래그에 따라 자연스럽게 늘어나며 이전 높이로 갑작스럽게 이동하지 않습니다.
        setIsCollapsed(false);
        // 최소 높이보다 작을 경우에는 최소 높이를 적용합니다.
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
  // 화면에 표시되는 높이는 접힘 상태일 경우 헤더 높이만 보여줍니다.
  const displayHeight = isCollapsed ? HEADER_HEIGHT : height;

  return (
    <div
      ref={containerRef}
      className="bg-white border-t border-gray-200 relative z-20"
      style={{ height: `${displayHeight}px`, position: 'fixed', bottom: 0, left: 0, right: 0, transition: isResizing ? 'none' : 'height 0.2s ease-out' }}
    >
      {/* 리사이즈 핸들 */}
      <div
        className={`absolute top-0 left-0 right-0 h-1 cursor-ns-resize ${isResizing ? 'bg-blue-500/30' : 'hover:bg-blue-500/20'}`}
        onMouseDown={handleMouseDown}
        title="드래그하여 크기 조절"
      >
        <div className={`absolute bottom-0 left-1/2 transform -translate-x-1/2 w-6 h-1 bg-gray-100 rounded-b ${isResizing ? 'bg-blue-500' : 'hover:bg-blue-500'}`}></div>
      </div>
      {/* 헤더 */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900">템플릿 저장 공간</h3>
        <button
          onClick={toggleCollapse}
          className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 cursor-pointer"
          title={isCollapsed ? '펼치기' : '접기'}
        >
          <i className={`w-3 h-3 flex items-center justify-center ${isCollapsed ? 'ri-arrow-up-line' : 'ri-arrow-down-line'}`}></i>
        </button>
      </div>
      {/* 콘텐츠 영역 */}
      {!isCollapsed && (
        <div className="p-3 overflow-y-auto" style={{ height: `${height - HEADER_HEIGHT}px` }}>
          {templates.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              <i className="ri-folder-open-line w-8 h-8 flex items-center justify-center mx-auto mb-2 text-gray-300"></i>
              <p>저장된 템플릿이 없습니다</p>
              <p className="text-xs">새 템플릿을 생성해보세요</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
              {templates.map(template => (
                <div
                  key={template.id}
                  className={`p-2 border rounded-lg cursor-pointer group ${
                    selectedTemplate?.id === template.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                  }`}
                  draggable
                  onDragStart={e => handleDragStart(e, template)}
                  onClick={() => onSelectTemplate(template)}
                >
                  <div className="flex items-start justify-between mb-1">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: template.color }}></div>
                    <div className="flex space-x-1 opacity-0 group-hover:opacity-100">
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          onEditTemplate(template);
                        }}
                        className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-blue-600 cursor-pointer"
                        title="수정"
                      >
                        <i className="ri-edit-line w-2.5 h-2.5 flex items-center justify-center"></i>
                      </button>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          onDeleteTemplate(template.id);
                        }}
                        className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-red-600 cursor-pointer"
                        title="삭제"
                      >
                        <i className="ri-delete-bin-line w-2.5 h-2.5 flex items-center justify-center"></i>
                      </button>
                    </div>
                  </div>
                  <h4 className="font-medium text-gray-900 text-[10px] mb-1 truncate">{template.name}</h4>
                  <p className="text-[9px] text-gray-600 mb-1 line-clamp-2">{template.description || '설명 없음'}</p>
                  <div className="flex items-center justify-between text-[8px] text-gray-500">
                    <span>
                      {Math.floor(template.duration / 60)}시간 {template.duration % 60}분
                    </span>
                    <i className="ri-drag-move-line w-2.5 h-2.5 flex items-center justify-center opacity-50"></i>
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