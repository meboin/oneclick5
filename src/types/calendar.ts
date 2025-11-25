// Updated calendar types with apps field.

export interface Attachment {
  /** A data URL representing the file contents for persistence. */
  fileData?: string;
  /** The name of the attached file. */
  fileName: string;
  /** The MIME type of the attached file. */
  fileType: string;
  /** The original File object selected by the user. Not persisted to storage. */
  file?: File;
}

export interface AppLink {
  /**
   * Human‑readable name of the application (e.g. "Notion", "VS Code").
   */
  name: string;
  /**
   * Optional URL or URI scheme to launch or link to the application (e.g. "notion://",
   * "vscode://", or a web URL). This field is optional to support apps without
   * a known protocol.
   */
  url?: string;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  color: string;
  duration: number; // minutes
  /** A list of URLs associated with this template. */
  urls?: string[];
  /** A list of applications associated with this template. Each entry holds a
   *  name and an optional URL/URI scheme. */
  apps?: AppLink[];
  /** An array of file attachments; persists base64 data and metadata. */
  attachments?: Attachment[];
}

export interface CalendarEvent {
  id: string;
  templateId: string;
  /** A local copy of the template data used for this event. */
  template: Template;
  startTime: string;
  endTime: string;
  /** Day of week index (0 = Monday, 6 = Sunday). */
  day: number;
}

export type ViewMode = 'week' | 'month';

/**
 * A calendar consists of its own templates and events. Multiple calendars
 * allow users to maintain separate schedules (e.g. Calendar1, Calendar2, etc.).
 */
export interface CalendarData {
  id: string;
  name: string;
  templates: Template[];
  events: CalendarEvent[];
}