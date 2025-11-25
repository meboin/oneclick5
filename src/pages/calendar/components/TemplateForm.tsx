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

// Maximum total attachment size (20MB)
const MAX_TOTAL_ATTACHMENT_SIZE = 20 * 1024 * 1024;

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
    // Each app entry has a name and optional url. Initialise with one blank object.
    apps: [{ name: '', url: '' }]
  });
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Populate form when editing existing template
  useEffect(() => {
    if (editingTemplate) {
      setFormData({
        name: editingTemplate.name,
        description: editingTemplate.description || '',
        color: editingTemplate.color,
        duration: editingTemplate.duration,
        urls: editingTemplate.urls && editingTemplate.urls.length > 0 ? editingTemplate.urls : [''],
        apps: editingTemplate.apps && editingTemplate.apps.length > 0
          ? editingTemplate.apps.map(app => ({ name: app.name, url: app.url || '' }))
          : [{ name: '', url: '' }]
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
        urls: [''],
        apps: [{ name: '', url: '' }]
      });
      setAttachments([]);
    }
  }, [editingTemplate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    const validUrls = formData.urls.filter(url => url.trim() !== '');
    const validApps = formData.apps
      .filter(app => app.name.trim() !== '')
      .map(app => ({ name: app.name.trim(), url: app.url?.trim() || undefined }));
    const serializableAttachments = attachments.map(att => ({
      fileData: att.fileData,
      fileName: att.fileName,
      fileType: att.fileType
    }));
    onSubmit({
      ...formData,
      urls: validUrls,
      apps: validApps,
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

  // App handlers
  const handleAppNameChange = (index: number, value: string) => {
    const newApps = [...formData.apps];
    newApps[index] = { ...newApps[index], name: value };
    setFormData({ ...formData, apps: newApps });
  };
  const handleAppUrlChange = (index: number, value: string) => {
    const newApps = [...formData.apps];
    newApps[index] = { ...newApps[index], url: value };
    setFormData({ ...formData, apps: newApps });
  };
  const addApp = () => {
    setFormData({ ...formData, apps: [...formData.apps, { name: '', url: '' }] });
  };
  const removeApp = (index: number) => {
    if (formData.apps.length > 1) {
      const newApps = formData.apps.filter((_, i) => i !== index);
      setFormData({ ...formData, apps: newApps });
    }
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
        <label className="block text-sm font-medium text-gray-700 mb-2">URL</label>
        <div className="space-y-2">
          {formData.urls.map((url, index) => (
            <div key={index} className="flex items-center space-x-2">
              <input
                type="url"
                value={url}
                onChange={e => handleUrlChange(index, e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                placeholder="https://example.com"
              />
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
       {/* Apps */}
       <div>
         <label className="block text-sm font-medium text-gray-700 mb-2">앱</label>
         <div className="space-y-2">
           {formData.apps.map((app, index) => (
             <div key={index} className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-2">
               <input
                 type="text"
                 value={app.name}
                 onChange={e => handleAppNameChange(index, e.target.value)}
                 className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                 placeholder="앱 이름 (예: Notion)"
               />
               <input
                 type="text"
                 value={app.url || ''}
                 onChange={e => handleAppUrlChange(index, e.target.value)}
                 className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                 placeholder="앱 링크 (예: notion://)"
               />
               {formData.apps.length > 1 && (
                 <button
                   type="button"
                   onClick={() => removeApp(index)}
                   className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500 cursor-pointer"
                 >
                   <i className="ri-close-line w-4 h-4 flex items-center justify-center"></i>
                 </button>
               )}
             </div>
           ))}
           <button
             type="button"
             onClick={addApp}
             className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 cursor-pointer"
           >
             <i className="ri-add-line w-4 h-4 flex items-center justify-center"></i>
             <span className="text-sm">앱 추가</span>
           </button>
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