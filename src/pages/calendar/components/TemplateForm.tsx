import { useState, useEffect, useRef } from 'react';
import { Template } from '../../../types/calendar';

interface TemplateFormProps {
  onSubmit: (template: Omit<Template, 'id'>) => void;
  onCancel: () => void;
  editingTemplate?: Template | null;
}

// Preset colours used for template chips.
const PRESET_COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B',
  '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'
];

const DURATION_OPTIONS = [
  { label: '1시간', value: 60 },
  { label: '2시간', value: 120 },
  { label: '3시간', value: 180 },
  { label: '4시간', value: 240 }
];

// Maximum total attachment size (20MB) for general attachments.
const MAX_TOTAL_ATTACHMENT_SIZE = 20 * 1024 * 1024;

// Removed application attachment size constant since the app attachment feature has been removed.

interface Attachment {
  file?: File;
  fileData?: string;
  fileName: string;
  fileType: string;
}

export default function TemplateForm({ onSubmit, onCancel, editingTemplate }: TemplateFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: PRESET_COLORS[0],
    duration: 60,
    urls: [''],
    // Note: no separate application file state because the feature has been removed.
  });
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  // Removed appFiles state and its associated ref since application attachments are no longer supported.

  // State for adding a saved URL template. When true, an inline form
  // appears allowing the user to specify a name and a URL. Once saved,
  // the pair is persisted to localStorage under the key 'calendar-saved-links'.
  const [isAddLinkOpen, setAddLinkOpen] = useState(false);
  const [newLinkName, setNewLinkName] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('https://');

  // Index of the URL input row whose saved-link dropdown is open. When null, no dropdown is visible.
  const [openUrlMenuIndex, setOpenUrlMenuIndex] = useState<number | null>(null);
  // State for displaying a context menu on a saved link item. The context menu appears
  // on right-click and allows editing or deleting a saved link. It contains the screen
  // coordinates and the index of the saved link.
  const [savedLinkMenu, setSavedLinkMenu] = useState<{ x: number; y: number; index: number } | null>(null);
  // When editing an existing saved link, this holds its index in the saved-links array.
  // On save, the link at this index will be replaced instead of appending a new one.
  const [editingLinkIndex, setEditingLinkIndex] = useState<number | null>(null);

  // Populate form when editing existing template
  useEffect(() => {
    if (editingTemplate) {
      setFormData({
        name: editingTemplate.name,
        description: editingTemplate.description || '',
        color: editingTemplate.color,
        duration: editingTemplate.duration,
        urls: editingTemplate.urls && editingTemplate.urls.length > 0 ? editingTemplate.urls : ['']
      });
      const existing: Attachment[] = [];
      if (editingTemplate.attachments && editingTemplate.attachments.length > 0) {
        existing.push(
          ...editingTemplate.attachments.map(att => ({
            fileData: att.fileData,
            fileName: att.fileName,
            fileType: att.fileType
          }))
        );
      }
      setAttachments(existing);
    } else {
      setFormData({
        name: '',
        description: '',
        color: PRESET_COLORS[0],
        duration: 60,
        urls: ['']
      });
      setAttachments([]);
    }
  }, [editingTemplate]);

  /**
   * Context menu handler for saved link items. Records the click position and item index
   * so that a small menu can be displayed allowing the user to edit or delete the link.
   */
  const handleSavedLinkContextMenu = (e: React.MouseEvent, idx: number) => {
    e.preventDefault();
    e.stopPropagation();
    setSavedLinkMenu({ x: e.clientX, y: e.clientY, index: idx });
  };

  /**
   * Initiates editing of a saved link. Loads the saved link's name and URL into the
   * form fields and opens the link-editing panel. Marks the index being edited so
   * that the save handler will replace the existing entry instead of appending a new one.
   */
  const editSavedLink = (idx: number) => {
    try {
      const saved: { name: string; url: string }[] = JSON.parse(
        localStorage.getItem('calendar-saved-links') || '[]'
      );
      const item = saved[idx];
      if (item) {
        setNewLinkName(item.name);
        setNewLinkUrl(item.url);
        setAddLinkOpen(true);
        setEditingLinkIndex(idx);
      }
    } catch {
      /* ignore */
    }
    setSavedLinkMenu(null);
  };

  /**
   * Deletes a saved link from localStorage. Removes the item at the given index and
   * persists the updated list back to storage. Hides any open context menu after deletion.
   */
  const deleteSavedLink = (idx: number) => {
    try {
      const saved: { name: string; url: string }[] = JSON.parse(
        localStorage.getItem('calendar-saved-links') || '[]'
      );
      if (idx >= 0 && idx < saved.length) {
        saved.splice(idx, 1);
        localStorage.setItem('calendar-saved-links', JSON.stringify(saved));
      }
    } catch {
      /* ignore */
    }
    setSavedLinkMenu(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    const validUrls = formData.urls.filter(url => url.trim() !== '');
    const serializableAttachments = attachments.map(att => ({
      fileData: att.fileData,
      fileName: att.fileName,
      fileType: att.fileType
    }));
    onSubmit({
      ...formData,
      urls: validUrls,
      // Remove deprecated `apps` by explicitly setting undefined
      apps: undefined,
      attachments: serializableAttachments
    } as Omit<Template, 'id'>);
  };

  // URL handlers
  const handleUrlChange = (index: number, value: string) => {
    const newUrls = [...formData.urls];
    newUrls[index] = value;
    setFormData({ ...formData, urls: newUrls });
  };
  const addUrl = () => {
    setFormData({ ...formData, urls: [...formData.urls, ''] });
  };
  const removeUrl = (index: number) => {
    if (formData.urls.length > 1) {
      const newUrls = formData.urls.filter((_, i) => i !== index);
      setFormData({ ...formData, urls: newUrls });
    }
  };

  // Removed application file handlers since application attachments are no longer supported.

  // File reading helper
  const readFile = (file: File): Promise<Attachment> => {
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve({
          file,
          fileData: reader.result as string,
          fileName: file.name,
          fileType: file.type
        });
      };
      reader.readAsDataURL(file);
    });
  };

  // Handle file input
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList) return;
    const files = Array.from(fileList);
    let totalSize = attachments.reduce((sum, att) => sum + (att.file?.size || 0), 0);
    const newAtts: Attachment[] = [];
    for (const file of files) {
      if (totalSize + file.size > MAX_TOTAL_ATTACHMENT_SIZE) {
        alert(`총 첨부 파일 크기는 ${MAX_TOTAL_ATTACHMENT_SIZE / (1024 * 1024)}MB를 초과할 수 없습니다.`);
        break;
      }
      const att = await readFile(file);
      newAtts.push(att);
      totalSize += file.size;
    }
    if (newAtts.length > 0) {
      setAttachments(prev => [...prev, ...newAtts]);
    }
    e.target.value = '';
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      const files = Array.from(droppedFiles);
      let totalSize = attachments.reduce((sum, att) => sum + (att.file?.size || 0), 0);
      const newAtts: Attachment[] = [];
      for (const file of files) {
        if (totalSize + file.size > MAX_TOTAL_ATTACHMENT_SIZE) {
          alert(`총 첨부 파일 크기는 ${MAX_TOTAL_ATTACHMENT_SIZE / (1024 * 1024)}MB를 초과할 수 없습니다.`);
          break;
        }
        const att = await readFile(file);
        newAtts.push(att);
        totalSize += file.size;
      }
      if (newAtts.length > 0) {
        setAttachments(prev => [...prev, ...newAtts]);
      }
    }
  };
  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Template name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">템플릿 이름 *</label>
        <input
          type="text"
          value={formData.name}
          onChange={e => setFormData({ ...formData, name: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          placeholder="템플릿 이름을 입력하세요"
          required
        />
      </div>
      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">템플릿 설명</label>
        <textarea
          value={formData.description}
          onChange={e => setFormData({ ...formData, description: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          rows={3}
          placeholder="템플릿에 대한 설명을 입력하세요"
        />
      </div>
      {/* Color selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">색상</label>
        <div className="flex space-x-2">
          {PRESET_COLORS.map(color => (
            <button
              key={color}
              type="button"
              onClick={() => setFormData({ ...formData, color })}
              className={`w-8 h-8 rounded-full border-2 cursor-pointer ${formData.color === color ? 'border-gray-900' : 'border-gray-300'}`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>
      {/* Duration */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">시간 설정</label>
        <select
          value={formData.duration}
          onChange={e => setFormData({ ...formData, duration: parseInt(e.target.value) })}
          className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
        >
          {DURATION_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>
      {/* URLs */}
      <div>
        <div className="flex items-center justify-between mb-2 relative">
          <label className="block text-sm font-medium text-gray-700">URL</label>
          {/* Saved link creation toggle */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setAddLinkOpen(prev => !prev)}
              className="flex items-center text-blue-600 hover:text-blue-700 text-sm"
              title="URL 템플릿 저장"
            >
              <i className="ri-add-circle-line w-4 h-4 flex items-center justify-center mr-1"></i>
              저장
            </button>
            {isAddLinkOpen && (
              <div className="absolute right-0 mt-1 w-72 bg-white border border-gray-200 rounded-lg shadow-xl z-20 p-4">
                {/* Header for the saved link entry panel */}
                <h4 className="text-sm font-semibold text-gray-900 mb-3">링크 템플릿 저장</h4>
                <div className="space-y-3">
                  <input
                    type="text"
                    value={newLinkName}
                    onChange={e => setNewLinkName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    placeholder="링크 이름"
                    autoFocus
                  />
                  <input
                    type="url"
                    value={newLinkUrl}
                    onChange={e => setNewLinkUrl(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    placeholder="https://example.com"
                  />
                  <div className="flex justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => {
                        setAddLinkOpen(false);
                        setNewLinkName('');
                        setNewLinkUrl('https://');
                      }}
                      className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      취소
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const trimmedName = newLinkName.trim();
                        const trimmedUrl = newLinkUrl.trim();
                        if (trimmedName !== '' && trimmedUrl !== '') {
                          try {
                            const current: { name: string; url: string }[] = JSON.parse(
                              localStorage.getItem('calendar-saved-links') || '[]'
                            );
                            if (editingLinkIndex !== null && editingLinkIndex >= 0 && editingLinkIndex < current.length) {
                              // Replace existing entry when editing
                              current[editingLinkIndex] = { name: trimmedName, url: trimmedUrl };
                            } else {
                              // Append new saved link otherwise
                              current.push({ name: trimmedName, url: trimmedUrl });
                            }
                            localStorage.setItem('calendar-saved-links', JSON.stringify(current));
                          } catch {
                            // ignore errors
                          }
                        }
                        // Reset editing state and close the panel
                        setEditingLinkIndex(null);
                        setAddLinkOpen(false);
                        setNewLinkName('');
                        setNewLinkUrl('https://');
                      }}
                      className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      저장
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="space-y-2">
          {formData.urls.map((url, index) => (
            <div key={index} className="relative">
              {/* URL input with integrated arrow */}
              <div className="flex items-center relative">
                <input
                  type="url"
                  value={url}
                  onChange={e => handleUrlChange(index, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm pr-8"
                  placeholder="https://example.com"
                />
                <button
                  type="button"
                  onClick={e => {
                    e.preventDefault();
                    setOpenUrlMenuIndex(openUrlMenuIndex === index ? null : index);
                  }}
                  className="absolute right-0 top-0 h-full px-2 flex items-center border-l border-gray-300 text-gray-500 hover:text-gray-700 focus:outline-none rounded-r-lg"
                  title="저장된 링크 선택"
                >
                  <i className="ri-arrow-down-s-line w-4 h-4 flex items-center justify-center"></i>
                </button>
                {formData.urls.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeUrl(index)}
                    className="absolute -right-8 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-red-500 cursor-pointer"
                  >
                    <i className="ri-close-line w-4 h-4 flex items-center justify-center"></i>
                  </button>
                )}
              </div>
              {/* Saved links dropdown */}
              <div
                className={`absolute left-0 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg z-20 ${
                  openUrlMenuIndex === index ? '' : 'hidden'
                } max-h-60 overflow-y-auto`}
                onMouseLeave={() => setOpenUrlMenuIndex(null)}
              >
                {(() => {
                  let saved: { name: string; url: string }[] = [];
                  if (typeof window !== 'undefined') {
                    try {
                      saved = JSON.parse(localStorage.getItem('calendar-saved-links') || '[]');
                    } catch {
                      saved = [];
                    }
                  }
                  if (saved.length === 0) {
                    return (
                      <div className="px-3 py-2 text-sm text-gray-500">저장된 링크가 없습니다</div>
                    );
                  }
                  return saved.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={e => {
                        e.preventDefault();
                        handleUrlChange(index, item.url);
                        setOpenUrlMenuIndex(null);
                      }}
                      onContextMenu={e => handleSavedLinkContextMenu(e, idx)}
                      className="flex justify-between items-center px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 whitespace-nowrap"
                    >
                      <span className="flex-1 truncate">{item.name}</span>
                    </div>
                  ));
                })()}
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={addUrl}
            className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 cursor-pointer"
          >
            <i className="ri-add-line w-4 h-4 flex items-center justify-center"></i>
            <span className="text-sm">URL 추가</span>
          </button>
        </div>
      </div>
      {/* Removed app attachment section as requested */}
      {/* File attachment */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">파일 첨부</label>
        <div
          className={`border-2 border-dashed rounded-lg p-4 transition-colors ${
            isDragOver
              ? 'border-blue-400 bg-blue-50'
              : attachments.length > 0
              ? 'border-green-400 bg-green-50'
              : 'border-gray-300'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            type="file"
            onChange={handleFileChange}
            className="hidden"
            ref={fileInputRef}
            multiple
            accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif"
          />
          {attachments.length > 0 ? (
            <div className="space-y-2">
              {attachments.map((att, index) => (
                <div key={index} className="flex items-center justify-between bg-white rounded-md border p-2">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 flex items-center justify-center bg-blue-100 rounded-lg">
                      <i className="ri-file-line w-4 h-4 flex items-center justify-center text-blue-600"></i>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{att.fileName}</p>
                      <p className="text-xs text-gray-500">
                        {att.file ? formatFileSize(att.file.size) : att.fileType}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeAttachment(index)}
                    className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500 cursor-pointer"
                  >
                    <i className="ri-close-line w-4 h-4 flex items-center justify-center"></i>
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="cursor-pointer flex items-center justify-center text-blue-600 hover:text-blue-700 mt-2"
              >
                <i className="ri-add-line w-4 h-4 flex items-center justify-center mr-1"></i>
                <span className="text-sm">파일 추가</span>
              </button>
            </div>
          ) : (
            <div
              className="cursor-pointer flex flex-col items-center justify-center"
              onClick={() => fileInputRef.current?.click()}
            >
              <i
                className={`ri-upload-cloud-line w-8 h-8 flex items-center justify-center mb-2 ${
                  isDragOver ? 'text-blue-500' : 'text-gray-400'
                }`}
              ></i>
              <span className={`text-sm ${isDragOver ? 'text-blue-600' : 'text-gray-600'}`}>
                {isDragOver ? '파일을 놓아주세요' : '파일을 선택하거나 드래그하세요'}
              </span>
              <span className="text-xs text-gray-400 mt-1">
                PDF, DOC, TXT, 이미지 파일 등 여러 파일을 첨부할 수 있습니다 (총 용량 20MB 이하)
              </span>
            </div>
          )}
        </div>
      </div>
      {/* Action buttons */}
      <div className="flex space-x-3 pt-4">
        <button type="button" onClick={onCancel} className="flex-1 px-4 py-2 border rounded-lg border-gray-300 text-gray-700 hover:bg-gray-50 text-sm">취소</button>
        <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
          {editingTemplate ? '수정' : '생성'}
        </button>
      </div>
      {/* Context menu for saved URL templates (appears on right-click) */}
      {savedLinkMenu && (
        <div
          className="fixed bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50"
          style={{ left: savedLinkMenu.x, top: savedLinkMenu.y }}
          onClick={e => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => editSavedLink(savedLinkMenu.index)}
            className="w-full px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-100 flex items-center whitespace-nowrap"
          >
            <i className="ri-edit-line w-3 h-3 flex items-center justify-center mr-1.5"></i>
            수정
          </button>
          <button
            type="button"
            onClick={() => deleteSavedLink(savedLinkMenu.index)}
            className="w-full px-3 py-1.5 text-left text-red-600 hover:bg-red-50 flex items-center whitespace-nowrap text-xs"
          >
            <i className="ri-delete-bin-line w-3 h-3 flex items-center justify-center mr-1.5"></i>
            삭제
          </button>
        </div>
      )}
    </form>
  );
}