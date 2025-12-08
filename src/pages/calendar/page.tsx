diff --git a/src/pages/calendar/page.tsx b/src/pages/calendar/page.tsx
index 2a545996120db9e1c989ae289f954e751897f581..db9971aff030bb772cf50643671346124e22cad4 100644
--- a/src/pages/calendar/page.tsx
+++ b/src/pages/calendar/page.tsx
@@ -1,26 +1,26 @@
-import { useState, useEffect, useRef } from 'react';
+import { useState, useEffect } from 'react';
 import { useCalendar } from '../../hooks/useCalendar';
 import { Template } from '../../types/calendar';
 import CalendarHeader from './components/CalendarHeader';
 import TemplateStorage from './components/TemplateStorage';
 import WeekView from './components/WeekView';
 import MonthView from './components/MonthView';
 import TemplateForm from './components/TemplateForm';
 import CalendarWidget from './components/CalendarWidget';
 import Modal from '../../components/base/Modal';
 
 /**
  * 메인 캘린더 페이지입니다. 헤더, 주간/월간 뷰, 템플릿 보관함,
  * 템플릿 생성/수정 모달 및 캘린더 위젯을 포함합니다. 또한 일정
  * 알림(1시간 전)을 제공하고 공유 기능을 구현합니다. 여러 개의
  * 시간표를 만들 수 있으며, 새 시간표를 생성하는 버튼도 제공합니다.
  */
 export default function CalendarPage() {
   const {
     calendars,
     selectedCalendar,
     selectedCalendarId,
     templates,
     events,
     viewMode,
     setViewMode,
@@ -58,72 +58,80 @@ export default function CalendarPage() {
   const handleCreateTemplate = () => {
     setEditingTemplate(null);
     setIsTemplateModalOpen(true);
   };
   const handleEditTemplate = (template: Template) => {
     setEditingTemplate(template);
     setIsTemplateModalOpen(true);
   };
   const handleTemplateSubmit = (templateData: any) => {
     if (editingTemplate) {
       updateTemplate(editingTemplate.id, templateData);
     } else {
       addTemplate(templateData);
     }
     setIsTemplateModalOpen(false);
     setEditingTemplate(null);
   };
   const handleModalClose = () => {
     setIsTemplateModalOpen(false);
     setEditingTemplate(null);
   };
 
   // Notification state
   const [alerts, setAlerts] = useState<{ id: string; message: string }[]>([]);
   const [isAlertsOpen, setIsAlertsOpen] = useState(false);
-  const alertedEventsRef = useRef<Set<string>>(new Set());
-  // Notification effect: check every minute for events an hour away
+  // Notification effect: check every minute for events within the next hour
   useEffect(() => {
-    const interval = setInterval(() => {
+    const updateAlerts = () => {
       const now = new Date();
       const nowDay = (now.getDay() + 6) % 7;
-      events.forEach(ev => {
-        if (ev.day === nowDay) {
+
+      const upcomingAlerts = events
+        .filter(ev => ev.day === nowDay)
+        .map(ev => {
           const [startHour, startMinute] = ev.startTime.split(':').map(Number);
           const eventStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), startHour, startMinute);
           const diffMinutes = (eventStart.getTime() - now.getTime()) / 60000;
-          if (diffMinutes > 59 && diffMinutes <= 60) {
-            const alertId = `${ev.id}-${eventStart.toISOString()}`;
-            if (!alertedEventsRef.current.has(alertId)) {
-              alertedEventsRef.current.add(alertId);
-              const msg = `${ev.template.name} 수업 1시간 전`;
-              setAlerts(prev => [...prev, { id: alertId, message: msg }]);
-            }
+
+          if (diffMinutes > 0 && diffMinutes <= 60) {
+            const remainingMinutes = Math.ceil(diffMinutes);
+            return {
+              id: `${ev.id}-${eventStart.toISOString()}`,
+              message: `${ev.template.name} 수업 시작까지 ${remainingMinutes}분 남았어요.`,
+            };
           }
-        }
-      });
-    }, 60000);
+
+          return null;
+        })
+        .filter((alert): alert is { id: string; message: string } => alert !== null);
+
+      setAlerts(upcomingAlerts);
+    };
+
+    updateAlerts();
+    const interval = setInterval(updateAlerts, 60000);
     return () => clearInterval(interval);
   }, [events]);
 
   const handleNotifications = () => {
     setIsAlertsOpen(prev => !prev);
   };
   const handleShare = async () => {
     const today = new Date();
     const day = (today.getDay() + 6) % 7;
     const todayEvents = events.filter(ev => ev.day === day);
     const shareText = todayEvents.length > 0
       ? todayEvents.map(ev => `${ev.template.name} ${ev.startTime}-${ev.endTime}`).join('\n')
       : '오늘 일정이 없습니다.';
     if (navigator.share) {
       try {
         await navigator.share({ title: '오늘 일정', text: shareText });
         return;
       } catch (err) {
         // fall through
       }
     }
     if (navigator.clipboard && navigator.clipboard.writeText) {
       try {
         await navigator.clipboard.writeText(shareText);
         alert('오늘 일정이 클립보드에 복사되었습니다.');
@@ -228,48 +236,47 @@ export default function CalendarPage() {
         events={events}
         onCreateTemplate={handleCreateTemplate}
       />
       {selectedTemplate && (
         <div className="fixed bottom-3 right-3 bg-blue-600 text-white px-3 py-2 rounded-lg shadow-lg">
           <div className="flex items-center space-x-2">
             <div className="w-2 h-2 rounded-full" style={{ backgroundColor: selectedTemplate.color }}></div>
             <span className="text-xs font-medium">{selectedTemplate.name} 선택됨</span>
             <button
               onClick={clearSelection}
               className="w-4 h-4 flex items-center justify-center text-white hover:text-gray-200 cursor-pointer"
             >
               <i className="ri-close-line w-3 h-3 flex items-center justify-center"></i>
             </button>
           </div>
         </div>
       )}
       {isAlertsOpen && (
         <div className="fixed top-16 right-4 w-80 bg-white shadow-lg rounded-lg border border-gray-200 max-h-80 overflow-y-auto z-50">
           <div className="p-4 border-b border-gray-100 flex items-center justify-between">
             <h3 className="font-semibold text-gray-900 text-sm">알림</h3>
             <button
               onClick={() => {
                 setAlerts([]);
                 setIsAlertsOpen(false);
-                alertedEventsRef.current.clear();
               }}
               className="text-gray-500 hover:text-gray-700"
             >
               <i className="ri-close-line"></i>
             </button>
           </div>
           <div className="p-4 space-y-2">
             {alerts.length === 0 ? (
               <p className="text-sm text-gray-500">알림이 없습니다.</p>
             ) : (
               alerts.map(alert => (
                 <div key={alert.id} className="text-sm text-gray-800">
                   {alert.message}
                 </div>
               ))
             )}
           </div>
         </div>
       )}
     </div>
   );
 }
\ No newline at end of file
