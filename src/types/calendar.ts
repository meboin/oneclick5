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

// Removed AppFile definition since application attachments have been removed.

/**
 * Legacy application link type. Retained for backwards compatibility. Newer
 * templates should use {@link AppFile} instead of {@link AppLink} when storing
 * application executables.
 */
export interface AppLink {
  name: string;
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
  // appFiles field removed: templates no longer support embedded application files.
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