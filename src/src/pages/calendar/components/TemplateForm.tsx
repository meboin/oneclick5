import { useState, useEffect } from 'react';
import { Template } from '../../../types/calendar';
import Button from '../../../components/base/Button';

interface TemplateFormProps {
  onSubmit: (template: Omit<Template, 'id'>) => void;
  onCancel: () => void;
  editingTemplate?: Template | null;
}

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

/**
 * Form for creating and editing templates. Supports multiple URLs and a
 * single file attachment. Files are read into a data URL so they can
 * persist across sessions via localStorage. When editing, existing
 * attachments are displayed but cannot be rehydrated into File objects,
 * so only the file name/type/data are retained.
 */
export default function TemplateForm({ onSubmit, onCancel, editingTemplate }: TemplateFormProps) {
  // Basic template fields
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: PRESET_COLORS[0],
    duration: 60,
    urls: ['']
  });

  // File attachment state. `file` is the actual File selected in this
  // session; `fileData` is a data URL for persistence; fileName/type for
  // display when editing.
  const [file, setFile] = useState<File | null>(null);
  const [fileData, setFileData] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | undefined>(undefined);
  const [fileType, setFileType] = useState<string | undefined>(undefined);
  const [isDragOver, setIsDragOver] = useState(false);

  // Populate form fields when editing
  useEffect(() => {
    if (editingTemplate) {
      setFormData({
        name: editingTemplate.name,
        description: editingTemplate.description || '',
        color: editingTemplate.color,
        duration: editingTemplate.duration,
        urls: editingTemplate.urls && editingTemplate.urls.length > 0 ? editingTemplate.urls : ['']
      });
      // Reset file; we can't restore the actual File object
      setFile(null);
      setFileData(editingTemplate.fileData || null);
      setFileName(editingTemplate.fileName);
      setFileType(editingTemplate.fileType);
    } else {
      // Reset when not editing
      setFormData({
        name: '',
        description: '',
        color: PRESET_COLORS[0],
        duration: 60,
        urls: ['']
      });
      setFile(null);
      setFileData(null);
      setFileName(undefined);
      setFileType(undefined);
    }
  }, [editingTemplate]);

  /**
   * Handle form submission. Filters out empty URLs and passes back all
   * relevant fields, including any file attachment information. Note that
   * the File object itself cannot be serialised, so the caller should
   * sanitise the returned object before persisting to localStorage.
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    // Filter out empty URL strings
    const validUrls = formData.urls.filter(url => url.trim() !== '');

    onSubmit({
      ...formData,
      urls: validUrls,
      // Only include file if selected in this session
      file: file || undefined,
      fileData: fileData || undefined,
      fileName: fileName || undefined,
      fileType: fileType || undefined
    } as Omit<Template, 'id'>);
  };

  /**
   * Update a URL field at the given index
   */
  const handleUrlChange = (index: number, value: string) => {
    const newUrls = [...formData.urls];
    newUrls[index] = value;
    setFormData({ ...formData, urls: newUrls });
  };

  /**
   * Append a new empty URL field
   */
  const addUrl = () => {
    setFormData({ ...formData, urls: [...formData.urls, ''] });
  };

  /**
   * Remove a URL field by index, ensuring at least one remains
   */
  const removeUrl = (index: number) => {
    if (formData.urls.length > 1) {
      const newUrls = formData.urls.filter((_, i) => i !== index);
      setFormData({ ...formData, urls: newUrls });
    }
  };

  /**
   * Convert a File into a data URL for persistence. Once loaded,
   * update the fileData, fileName and fileType state.
   */
  const readFile = (selectedFile: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setFileData(result);
      setFileName(selectedFile.name);
      setFileType(selectedFile.type);
    };
    reader.readAsDataURL(selectedFile);
  };

  /**
   * Handle file input change. Reads the file into a data URL for
   * persistence and sets the local File for immediate use.
   */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      readFile(selectedFile);
    } else {
      setFile(null);
      setFileData(null);
      setFileName(undefined);
      setFileType(undefined);
    }
  };

  /**
   * Drag over event to highlight drop area
   */
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  /**
   * Reset highlight when leaving drop area
   */
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  /**
   * Handle dropping a file onto the drop zone
   */
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      const selected = droppedFiles[0];
      setFile(selected);
      readFile(selected);
    }
  };

  /**
   * Remove the currently selected file. Clears all related state and
   * resets the file input element.
   */
  const removeFile = () => {
    setFile(null);
    setFileData(null);
    setFileName(undefined);
    setFileType(undefined);
    const fileInput = document.getElementById('file-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  /**
   * Format bytes into a human‑readable string for file sizes
   */
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 템플릿 이름 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          템플릿 이름 *
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          placeholder="템플릿 이름을 입력하세요"
          required
        />
      </div>

      {/* 템플릿 설명 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          템플릿 설명
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          rows={3}
          placeholder="템플릿에 대한 설명을 입력하세요"
        />
      </div>

      {/* 색상 선택 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          색상
        </label>
        <div className="flex space-x-2">
          {PRESET_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => setFormData({ ...formData, color })}
              className={`w-8 h-8 rounded-full border-2 cursor-pointer ${
                formData.color === color ? 'border-gray-900' : 'border-gray-300'
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>

      {/* 시간 설정 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          시간 설정
        </label>
        <select
          value={formData.duration}
          onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
          className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
        >
          {DURATION_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* URL 입력 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          URL
        </label>
        <div className="space-y-2">
          {formData.urls.map((url, index) => (
            <div key={index} className="flex items-center space-x-2">
              <input
                type="url"
                value={url}
                onChange={(e) => handleUrlChange(index, e.target.value)}
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

      {/* 파일 첨부 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          파일 첨부
        </label>
        <div
          className={`border-2 border-dashed rounded-lg p-4 transition-colors ${
            isDragOver
              ? 'border-blue-400 bg-blue-50'
              : file || fileData
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
            id="file-upload"
            accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif"
          />
          {file || fileData ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 flex items-center justify-center bg-blue-100 rounded-lg">
                  <i className="ri-file-line w-5 h-5 flex items-center justify-center text-blue-600"></i>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{file ? file.name : fileName}</p>
                  <p className="text-xs text-gray-500">{file ? formatFileSize(file.size) : fileType}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={removeFile}
                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500 cursor-pointer"
              >
                <i className="ri-close-line w-4 h-4 flex items-center justify-center"></i>
              </button>
            </div>
          ) : (
            <label
              htmlFor="file-upload"
              className="cursor-pointer flex flex-col items-center justify-center"
            >
              <i className={`ri-upload-cloud-line w-8 h-8 flex items-center justify-center mb-2 ${
                isDragOver ? 'text-blue-500' : 'text-gray-400'
              }`}></i>
              <span className={`text-sm ${
                isDragOver ? 'text-blue-600' : 'text-gray-600'
              }`}>
                {isDragOver ? '파일을 놓아주세요' : '파일을 선택하거나 드래그하세요'}
              </span>
              <span className="text-xs text-gray-400 mt-1">
                PDF, DOC, TXT, 이미지 파일 지원
              </span>
            </label>
          )}
        </div>
        {/* When editing and existing file is present but no new file selected */}
        {editingTemplate && editingTemplate.fileData && !file && (
          <p className="text-xs text-gray-500 mt-2">
            기존 파일: {editingTemplate.fileName} (새 파일을 선택하면 교체됩니다)
          </p>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex space-x-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          취소
        </Button>
        <Button type="submit" className="flex-1">
          {editingTemplate ? '수정' : '생성'}
        </Button>
      </div>
    </form>
  );
}