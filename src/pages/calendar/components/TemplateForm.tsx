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

// Maximum total size for application attachments. Previously a hard limit
// was enforced to prevent large executables from overwhelming the browser.
// However, the application attachments section now accepts only lightweight
// shortcut files (.lnk) and does not enforce a strict size limit. Setting
// this constant to Infinity effectively removes the cap while still
// documenting its purpose.
const MAX_TOTAL_APP_SIZE = Infinity;

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
    // Note: application files are tracked separately in `appFiles` state.
  });
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  // Separate state for application files. These files represent actual
  // executables or packages that the user wishes to include with the
  // template. They follow the same Attachment structure used for general
  // attachments but are stored in a distinct list to differentiate UI
  // sections.
  const [appFiles, setAppFiles] = useState<Attachment[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  // Ref for the app file input. Using a separate ref avoids collisions
  // between attachment and app file inputs when triggering the file picker.
  const appFileInputRef = useRef<HTMLInputElement | null>(null);

  // State for adding a saved URL template. When true, an inline form
  // appears allowing the user to specify a name and a URL. Once saved,
  // the pair is persisted to localStorage under the key 'calendar-saved-links'.
  const [isAddLinkOpen, setAddLinkOpen] = useState(false);
  const [newLinkName, setNewLinkName] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('https://');

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
      // Load appFiles from editing template if present. The original template
      // may include `appFiles` persisted from a previous session. Map these
      // into the Attachment shape expected by the form state.
      const existingApps: Attachment[] = [];
      if ((editingTemplate as any).appFiles && (editingTemplate as any).appFiles.length > 0) {
        existingApps.push(
          ...((editingTemplate as any).appFiles as any[]).map((att: any) => ({
            fileData: att.fileData,
            fileName: att.fileName,
            fileType: att.fileType
          }))
        );
      }
      setAppFiles(existingApps);
    } else {
      setFormData({
        name: '',
        description: '',
        color: PRESET_COLORS[0],
        duration: 60,
        urls: ['']
      });
      setAttachments([]);
      setAppFiles([]);
    }
  }, [editingTemplate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    const validUrls = formData.urls.filter(url => url.trim() !== '');
    // Convert appFiles into serialisable attachments
    const serializableAppFiles = appFiles.map(att => ({
      fileData: att.fileData,
      fileName: att.fileName,
      fileType: att.fileType
    }));
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
      // Save appFiles list on the template
      appFiles: serializableAppFiles,
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

  // App file handlers
  // These functions manage the selection and removal of application files. Users
  // can upload multiple executables; each is stored in the `appFiles` state.
  const handleAppFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList) return;
    const files = Array.from(fileList);
    // Application files now accept .lnk shortcuts only and no size limit is enforced.
    const newAtts: Attachment[] = [];
    for (const file of files) {
      const att = await readFile(file);
      newAtts.push(att);
    }
    if (newAtts.length > 0) {
      setAppFiles(prev => [...prev, ...newAtts]);
    }
    e.target.value = '';
  };
  const removeAppFile = (index: number) => {
    setAppFiles(prev => prev.filter((_, i) => i !== index));
  };

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
                            const current = JSON.parse(localStorage.getItem('calendar-saved-links') || '[]');
                            current.push({ name: trimmedName, url: trimmedUrl });
                            localStorage.setItem('calendar-saved-links', JSON.stringify(current));
                          } catch {
                            // ignore errors
                          }
                        }
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
            <div key={index} className="flex items-center space-x-2 relative">
              <input
                type="url"
                value={url}
                onChange={e => handleUrlChange(index, e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                placeholder="https://example.com"
              />
              {/* Dropdown for saved links */}
              <div className="relative flex items-stretch">
                <button
                  type="button"
                  onClick={e => {
                    e.preventDefault();
                    const btn = e.currentTarget as HTMLElement;
                    const menu = btn.nextSibling as HTMLElement;
                    if (menu) {
                      menu.classList.toggle('hidden');
                    }
                  }}
                  className="px-2 flex items-center border-l border-gray-300 text-gray-500 hover:text-gray-700 focus:outline-none"
                  title="저장된 링크 선택"
                >
                  <i className="ri-arrow-down-s-line w-4 h-4 flex items-center justify-center"></i>
                </button>
                <div className="absolute right-0 mt-1 bg-white border border-gray-200 rounded shadow-lg z-10 hidden max-h-40 overflow-y-auto">
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
                          // Hide menu
                          const menu = (e.currentTarget as HTMLElement).parentElement as HTMLElement;
                          menu.classList.add('hidden');
                        }}
                        className="px-3 py-2 text-sm cursor-pointer hover:bg-gray-100"
                      >
                        {item.name}
                      </div>
                    ));
                  })()}
                </div>
              </div>
              {formData.urls.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeUrl(index)}
                  className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500 cursor-pointer"
                >
                  <i className="ri-close-line w-4 h-4 flex items-center justify-center"></i>
                </button>
              )}
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
       {/* App files */}
       <div>
         <label className="block text-sm font-medium text-gray-700 mb-2">앱</label>
         <div
           className={`border-2 border-dashed rounded-lg p-4 transition-colors ${
             appFiles.length > 0
               ? 'border-green-400 bg-green-50'
               : 'border-gray-300'
           }`}
           onDragOver={e => {
             e.preventDefault();
           }}
           onDrop={async e => {
             e.preventDefault();
             const droppedFiles = e.dataTransfer.files;
             if (droppedFiles.length > 0) {
               const files = Array.from(droppedFiles);
               const newAtts: Attachment[] = [];
               for (const file of files) {
                 const att = await readFile(file);
                 newAtts.push(att);
               }
               if (newAtts.length > 0) {
                 setAppFiles(prev => [...prev, ...newAtts]);
               }
             }
           }}
         >
           <input
             type="file"
             onChange={handleAppFileChange}
             className="hidden"
             multiple
             ref={appFileInputRef}
             // Accept only Windows shortcut files (.lnk). Executable attachments
             // are not allowed to avoid large file uploads and memory errors.
             accept=".lnk"
           />
           {appFiles.length > 0 ? (
             <div className="space-y-2">
               {appFiles.map((att, index) => (
                 <div key={index} className="flex items-center justify-between bg-white rounded-md border p-2">
                   <div className="flex items-center space-x-3">
                     <div className="w-8 h-8 flex items-center justify-center bg-blue-100 rounded-lg">
                       <i className="ri-rocket-line w-4 h-4 flex items-center justify-center text-blue-600"></i>
                     </div>
                     <div>
                       <p className="text-sm font-medium text-gray-900 break-all">{att.fileName}</p>
                       <p className="text-xs text-gray-500">{att.file ? formatFileSize(att.file.size) : att.fileType}</p>
                     </div>
                   </div>
                   <button
                     type="button"
                     onClick={() => removeAppFile(index)}
                     className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500 cursor-pointer"
                   >
                     <i className="ri-close-line w-4 h-4 flex items-center justify-center"></i>
                   </button>
                 </div>
               ))}
               <button
                 type="button"
                 onClick={() => appFileInputRef.current?.click()}
                 className="cursor-pointer flex items-center justify-center text-blue-600 hover:text-blue-700 mt-2"
               >
                 <i className="ri-add-line w-4 h-4 flex items-center justify-center mr-1"></i>
                 <span className="text-sm">앱 추가</span>
               </button>
             </div>
           ) : (
             <div
               className="cursor-pointer flex flex-col items-center justify-center"
               onClick={() => appFileInputRef.current?.click()}
             >
               <i className="ri-upload-cloud-line w-8 h-8 flex items-center justify-center mb-2 text-gray-400"></i>
               <span className="text-sm text-gray-600">앱을 선택하거나 드래그하세요</span>
               <span className="text-xs text-gray-400 mt-1">여러 앱을 첨부할 수 있습니다</span>
             </div>
           )}
         </div>
       </div>
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
    </form>
  );
}