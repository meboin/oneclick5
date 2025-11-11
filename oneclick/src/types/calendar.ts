export interface Attachment {
  /**
   * A data URL representing the file contents.  This is generated when a
   * file is selected in the template form and persisted so that the
   * file does not need to be re‑downloaded on subsequent visits.
   */
  fileData?: string;
  /** The name of the attached file. */
  fileName: string;
  /** The MIME type of the attached file. */
  fileType: string;
  /**
   * The original File object selected by the user.  This is kept around in
   * memory during a session so that downloads can be triggered without
   * having to reconstruct the file.  This property is not persisted to
   * localStorage.
   */
  file?: File;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  color: string;
  duration: number; // minutes
  /**
   * A list of URLs associated with this template.  Empty strings are filtered
   * out before saving.  These can be external resources or meeting links.
   */
  urls?: string[];
  /**
   * An array of file attachments.  Each attachment stores the file data URL
   * and metadata (name and type).  When persisting to localStorage, the
   * File object is stripped off.
   */
  attachments?: Attachment[];
}

export interface CalendarEvent {
  id: string;
  templateId: string;
  template: Template;
  startTime: string;
  endTime: string;
  /**
   * The day of week for this event, using a Monday‑based index where 0
   * represents Monday and 6 represents Sunday.  This indexing is used
   * throughout the calendar and widget components, so be sure that when
   * persisting events the day field follows this convention.
   */
  day: number;
}

export type ViewMode = 'week' | 'month';