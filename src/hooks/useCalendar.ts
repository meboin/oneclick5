import { useState, useEffect } from 'react';
import type { CalendarData, CalendarEvent, Template, ViewMode } from '../types/calendar';

/**
 * Keys used for localStorage persistence. Separating these into constants
 * makes it easier to update the storage strategy in the future.
 */
const CALENDARS_KEY = 'calendar-calendars';
const SELECTED_CALENDAR_KEY = 'calendar-selected-calendar';
const VIEW_MODE_KEY = 'calendar-view-mode';

/**
 * Custom hook that manages multiple calendars, their templates and events.
 * Each calendar stores its own templates and events. The selected calendar
 * determines which templates and events are currently displayed. All data
 * persists to localStorage so the user can leave and return without losing
 * their schedule.
 */
export function useCalendar() {
  // Load calendars from localStorage on initial render. If none exist
  // create a default calendar so that users always have one schedule to work with.
  const [calendars, setCalendars] = useState<CalendarData[]>(() => {
    if (typeof window === 'undefined') return [];
    const saved = localStorage.getItem(CALENDARS_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as CalendarData[];
        // Return parsed calendars if any exist.
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch {
        // ignore parse errors and fall through to default
      }
    }
    // When no calendars are saved, initialise with a default calendar.
    const defaultId = Date.now().toString();
    const defaultCalendar: CalendarData = {
      id: defaultId,
      name: '시간표1',
      templates: [],
      events: []
    };
    // Persist the default calendar immediately.
    try {
      localStorage.setItem(CALENDARS_KEY, JSON.stringify([defaultCalendar]));
      localStorage.setItem(SELECTED_CALENDAR_KEY, defaultId);
    } catch {
      // ignore write errors
    }
    return [defaultCalendar];
  });

  // Load selected calendar ID from localStorage or default to first calendar.
  const [selectedCalendarId, setSelectedCalendarId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    const saved = localStorage.getItem(SELECTED_CALENDAR_KEY);
    return saved || null;
  });

  // Load view mode from localStorage or default to 'week'.
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window === 'undefined') return 'week';
    const saved = localStorage.getItem(VIEW_MODE_KEY);
    return saved === 'month' || saved === 'week' ? (saved as ViewMode) : 'week';
  });

  // Persist calendars whenever they change.
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(CALENDARS_KEY, JSON.stringify(calendars));
      } catch (e) {
        console.error('Failed to save calendars:', e);
      }
    }
  }, [calendars]);

  // Persist selected calendar ID whenever it changes.
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (selectedCalendarId) {
        localStorage.setItem(SELECTED_CALENDAR_KEY, selectedCalendarId);
      } else {
        localStorage.removeItem(SELECTED_CALENDAR_KEY);
      }
    }
  }, [selectedCalendarId]);

  // Persist view mode whenever it changes.
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(VIEW_MODE_KEY, viewMode);
    }
  }, [viewMode]);

  // Selected template across calendars. When multiple calendars are present,
  // the selected template refers to the template chosen for creating new events
  // in the current calendar. It does not persist across calendar switches.
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);

  /**
   * Select or toggle a template for creating new events. If the same
   * template is already selected, deselect it. When switching calendars,
   * the selection is cleared.
   */
  const selectTemplate = (template: Template) => {
    setSelectedTemplate(prev => (prev?.id === template.id ? null : template));
  };

  /** Clear the selected template. */
  const clearSelection = () => {
    setSelectedTemplate(null);
  };

  /**
   * Returns the currently selected calendar. If no calendar is selected
   * the first calendar in the list is returned, or undefined.
   */
  const selectedCalendar: CalendarData | undefined = calendars.find(c => c.id === selectedCalendarId) || calendars[0];

  /**
   * Create a new calendar with the given name and select it.
   */
  const addCalendar = (name: string) => {
    const id = Date.now().toString();
    const newCal: CalendarData = { id, name, templates: [], events: [] };
    setCalendars(prev => [...prev, newCal]);
    setSelectedCalendarId(id);
  };

  /**
   * Select a calendar by ID.
   */
  const selectCalendar = (id: string) => {
    setSelectedCalendarId(id);
  };

  /**
   * Helper to update a calendar by ID.
   */
  const updateCalendar = (id: string, updater: (cal: CalendarData) => CalendarData) => {
    setCalendars(prev => prev.map(c => (c.id === id ? updater(c) : c)));
  };

  /**
   * Add a new template to the selected calendar.
   */
  const addTemplate = (templateData: Omit<Template, 'id'>) => {
    if (!selectedCalendar) return;
    const newTemplate: Template = { ...templateData, id: Date.now().toString() };
    updateCalendar(selectedCalendar.id, cal => ({
      ...cal,
      templates: [...cal.templates, newTemplate]
    }));
  };

  /**
   * Update an existing template in the selected calendar.
   */
  const updateTemplate = (templateId: string, templateData: Omit<Template, 'id'>) => {
    if (!selectedCalendar) return;
    // When updating a template, only modify the template list. Do not update
    // existing events so that events remain independent copies of their
    // templates. This satisfies the requirement that changes in the template
    // storage should not affect events already placed on the calendar.
    updateCalendar(selectedCalendar.id, cal => ({
      ...cal,
      templates: cal.templates.map(t => (t.id === templateId ? { ...t, ...templateData, id: templateId } : t))
      // leave cal.events unchanged
    }));
  };

  /**
   * Delete a template and all associated events in the selected calendar.
   */
  const deleteTemplate = (templateId: string) => {
    if (!selectedCalendar) return;
    // Remove the template from storage but keep events intact. Events store their
    // own copy of the template and should remain even if the original template
    // is deleted.
    updateCalendar(selectedCalendar.id, cal => ({
      ...cal,
      templates: cal.templates.filter(t => t.id !== templateId)
      // leave events unchanged
    }));
  };

  /**
   * Add a new event to the selected calendar. An independent copy of the template
   * is stored with the event to decouple it from future template updates.
   */
  const addEvent = (eventData: Omit<CalendarEvent, 'id' | 'template'> & { template: Template }) => {
    if (!selectedCalendar) return;
    const newEvent: CalendarEvent = {
      ...eventData,
      id: Date.now().toString(),
      template: { ...eventData.template },
      templateId: eventData.template.id
    };
    updateCalendar(selectedCalendar.id, cal => ({
      ...cal,
      events: [...cal.events, newEvent]
    }));
  };

  /**
   * Delete an event by ID in the selected calendar.
   */
  const deleteEvent = (eventId: string) => {
    if (!selectedCalendar) return;
    updateCalendar(selectedCalendar.id, cal => ({
      ...cal,
      events: cal.events.filter(e => e.id !== eventId)
    }));
  };

  /**
   * Update an event by ID in the selected calendar. Does not recalculate endTime; that
   * should be handled by the caller if template duration changes.
   */
  const updateEvent = (eventId: string, updates: Partial<CalendarEvent>) => {
    if (!selectedCalendar) return;
    updateCalendar(selectedCalendar.id, cal => ({
      ...cal,
      events: cal.events.map(e => (e.id === eventId ? { ...e, ...updates } : e))
    }));
  };

  /**
   * Rename a calendar. Updates the name of the calendar with the given ID.
   */
  const renameCalendar = (calendarId: string, newName: string) => {
    setCalendars(prev => prev.map(c => (c.id === calendarId ? { ...c, name: newName } : c)));
  };

  /**
   * Delete a calendar by ID. If the deleted calendar is currently selected,
   * the selection is moved to the first remaining calendar, or cleared if none.
   */
  const deleteCalendar = (calendarId: string) => {
    setCalendars(prev => {
      const filtered = prev.filter(c => c.id !== calendarId);
      // Update the selected calendar if it matches the deleted ID
      if (selectedCalendarId === calendarId) {
        if (filtered.length > 0) {
          setSelectedCalendarId(filtered[0].id);
        } else {
          setSelectedCalendarId(null);
        }
      }
      return filtered;
    });
  };

  /**
   * Reorder calendars. Moves the calendar at fromIndex to toIndex.
   */
  const reorderCalendars = (fromIndex: number, toIndex: number) => {
    setCalendars(prev => {
      const updated = [...prev];
      if (fromIndex < 0 || toIndex < 0 || fromIndex >= updated.length || toIndex >= updated.length) return updated;
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      return updated;
    });
  };

  return {
    calendars,
    selectedCalendarId,
    selectedCalendar,
    // Expose templates and events of the selected calendar for convenience
    templates: selectedCalendar?.templates ?? [],
    events: selectedCalendar?.events ?? [],
    viewMode,
    setViewMode,
    selectedTemplate,
    addCalendar,
    selectCalendar,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    addEvent,
    deleteEvent,
    updateEvent,
    selectTemplate,
    clearSelection,
    // Calendar management helpers
    renameCalendar,
    deleteCalendar,
    reorderCalendars
  };
}