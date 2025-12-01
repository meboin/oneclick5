import { useState, useEffect } from 'react';
import { Template, CalendarEvent, ViewMode } from '../types/calendar';

/**
 * Keys used for localStorage persistence. Separating these into constants
 * makes it easier to update the storage strategy in the future and avoids
 * accidental typos when reading/writing values.
 */
const TEMPLATES_KEY = 'calendar-templates';
const EVENTS_KEY = 'calendar-events';
const VIEW_MODE_KEY = 'calendar-view-mode';
const SELECTED_TEMPLATE_KEY = 'calendar-selected-template';

/**
 * Remove non‑serialisable fields from templates when saving to
 * localStorage. The File object cannot be stringified so it is stripped
 * before persisting. All other properties (including fileData, fileName
 * and fileType) are preserved.
 */
function sanitizeTemplates(templates: Template[]): Omit<Template, 'file'>[] {
  return templates.map(({ file, ...rest }) => rest);
}

/**
 * Remove non‑serialisable fields from events when saving to localStorage.
 * Each event references a template, which may contain a File. This helper
 * removes the File before persisting.
 */
function sanitizeEvents(events: CalendarEvent[]): CalendarEvent[] {
  return events.map(event => {
    const { file, ...restTemplate } = event.template;
    return {
      ...event,
      template: restTemplate as Template
    };
  });
}

/**
 * Custom hook that manages calendar state: templates, events, view mode and
 * selected template. It persists state to localStorage so the user can
 * leave and return to the site without losing their data. When
 * initialising, it attempts to load any previously saved state from
 * localStorage. Any time the state changes, it is written back to
 * localStorage (excluding non‑serialisable fields).
 */
export function useCalendar() {
  // Load templates from localStorage on initial render
  const [templates, setTemplates] = useState<Template[]>(() => {
    if (typeof window === 'undefined') return [];
    const saved = localStorage.getItem(TEMPLATES_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [];
      }
    }
    return [];
  });

  // Load events from localStorage on initial render
  const [events, setEvents] = useState<CalendarEvent[]>(() => {
    if (typeof window === 'undefined') return [];
    const saved = localStorage.getItem(EVENTS_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [];
      }
    }
    return [];
  });

  // Load view mode from localStorage or default to 'week'
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window === 'undefined') return 'week';
    const saved = localStorage.getItem(VIEW_MODE_KEY);
    return saved === 'month' || saved === 'week' ? (saved as ViewMode) : 'week';
  });

  // Selected template is restored after templates load
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);

  // Restore selected template from localStorage when templates change
  useEffect(() => {
    const savedId = localStorage.getItem(SELECTED_TEMPLATE_KEY);
    if (savedId) {
      try {
        const id = JSON.parse(savedId);
        const found = templates.find(t => t.id === id);
        if (found) {
          setSelectedTemplate(found);
        }
      } catch {
        // ignore if parsing fails
      }
    }
  }, [templates]);

  // Persist templates to localStorage whenever they change
  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(sanitizeTemplates(templates)));
  }, [templates]);

  // Persist events to localStorage whenever they change
  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(EVENTS_KEY, JSON.stringify(sanitizeEvents(events)));
  }, [events]);

  // Persist view mode to localStorage whenever it changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(VIEW_MODE_KEY, viewMode);
  }, [viewMode]);

  // Persist selected template ID to localStorage whenever it changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (selectedTemplate) {
      localStorage.setItem(SELECTED_TEMPLATE_KEY, JSON.stringify(selectedTemplate.id));
    } else {
      localStorage.removeItem(SELECTED_TEMPLATE_KEY);
    }
  }, [selectedTemplate]);

  /**
   * Add a new template. Generates a unique ID and updates state.
   */
  const addTemplate = (templateData: Omit<Template, 'id'>) => {
    const newTemplate: Template = {
      ...templateData,
      id: Date.now().toString()
    };
    setTemplates(prev => [...prev, newTemplate]);
  };

  /**
   * Update an existing template. Replaces the template in the list and
   * updates all events referencing it. If the selected template is the
   * one being updated, the selection is updated as well. Also recalculates
   * end times for events when the duration changes.
   */
  const updateTemplate = (templateId: string, templateData: Omit<Template, 'id'>) => {
    setTemplates(prev => prev.map(t => (t.id === templateId ? { ...templateData, id: templateId } : t)));

    // Update selected template if necessary
    if (selectedTemplate?.id === templateId) {
      setSelectedTemplate({ ...templateData, id: templateId });
    }

    // Update events referencing this template
    setEvents(prevEvents =>
      prevEvents.map(event => {
        if (event.template.id !== templateId) return event;
        // Recalculate endTime based on new duration
        const [startHour, startMinute] = event.startTime.split(':').map(Number);
        const startTotalMinutes = startHour * 60 + startMinute;
        const endTotalMinutes = startTotalMinutes + templateData.duration;
        const endHour = Math.floor(endTotalMinutes / 60);
        const endMinute = endTotalMinutes % 60;
        const newEndTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
        return {
          ...event,
          endTime: newEndTime,
          template: { ...templateData, id: templateId }
        };
      })
    );
  };

  /**
   * Delete a template and all events referencing it. Clears the selected
   * template if it matches the deleted one.
   */
  const deleteTemplate = (templateId: string) => {
    setTemplates(prev => prev.filter(t => t.id !== templateId));
    setEvents(prev => prev.filter(event => event.template.id !== templateId));
    if (selectedTemplate?.id === templateId) {
      setSelectedTemplate(null);
    }
  };

  /**
   * Add a new event. Generates a unique ID.
   */
  const addEvent = (eventData: Omit<CalendarEvent, 'id'>) => {
    const newEvent: CalendarEvent = {
      ...eventData,
      id: Date.now().toString()
    };
    setEvents(prev => [...prev, newEvent]);
  };

  /**
   * Delete an event by ID.
   */
  const deleteEvent = (eventId: string) => {
    setEvents(prev => prev.filter(e => e.id !== eventId));
  };

  /**
   * Update an event by ID with partial updates. Use this to move events
   * between days or adjust times. Does not recalculate endTime based on
   * template duration; that should be handled when updating templates.
   */
  const updateEvent = (eventId: string, updates: Partial<CalendarEvent>) => {
    setEvents(prev => prev.map(e => (e.id === eventId ? { ...e, ...updates } : e)));
  };

  /**
   * Select a template for creating new events. The selected template is
   * persisted to localStorage. When templates change, the selection is
   * restored if possible.
   */
  /**
   * Select or toggle a template for creating new events. If the same
   * template is already selected, deselect it. This allows the user
   * to click on a template again to cancel event placement.
   */
  const selectTemplate = (template: Template) => {
    setSelectedTemplate(prev => (prev?.id === template.id ? null : template));
  };

  /**
   * Clear the selected template.
   */
  const clearSelection = () => {
    setSelectedTemplate(null);
  };

  return {
    templates,
    events,
    viewMode,
    selectedTemplate,
    setViewMode,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    addEvent,
    deleteEvent,
    updateEvent,
    selectTemplate,
    clearSelection
  };
}