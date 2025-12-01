export interface Template {
  id: string;
  name: string;
  description: string;
  color: string;
  duration: number; // minutes
  /**
   * A list of URLs associated with this template.  Previously a single
   * `url` field was used, but the UI allows multiple URLs so this is an
   * array.  Empty strings are filtered out before saving.
   */
  urls?: string[];
  /**
   * The original file selected by the user.  This is kept around so that
   * a download can be triggered if the user has not yet cached the file.
   * Files cannot be serialized directly into localStorage so they are
   * omitted when persisting templates.
   */
  file?: File;
  /**
   * A data URL representing the file contents.  This is generated when a
   * file is selected in the template form and is persisted so that the
   * file does not need to be re‑downloaded on subsequent visits.
   */
  fileData?: string;
  /**
   * The name of the attached file.  This is stored separately because the
   * File object cannot be serialized when persisting to localStorage.
   */
  fileName?: string;
  /**
   * The MIME type of the attached file.  This is stored to allow the file
   * to be reconstructed when opening from the cache.
   */
  fileType?: string;
}

export interface CalendarEvent {
  id: string;
  templateId: string;
  template: Template;
  startTime: string;
  endTime: string;
  day: number; // 0-6 (Sunday-Saturday)
}

export type ViewMode = 'week' | 'month';