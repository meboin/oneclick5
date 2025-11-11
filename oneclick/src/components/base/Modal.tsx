import { ReactNode, useEffect } from 'react';

interface ModalProps {
  /**
   * Whether the modal is visible. When false, nothing is rendered.
   */
  isOpen: boolean;
  /**
   * Callback to close the modal when the user clicks the backdrop or close button.
   */
  onClose: () => void;
  /**
   * Title displayed in the modal header.
   */
  title: string;
  /**
   * Contents to render inside the modal body.
   */
  children: ReactNode;
}

/**
 * Simple modal component. Renders children in a centered dialog with a
 * semi‑transparent backdrop. When open, scrolling on the document is
 * disabled. Clicking the backdrop or the close button triggers the
 * provided onClose handler. This component is intentionally lightweight
 * and free of any additional dependencies to keep usage simple.
 */
export default function Modal({ isOpen, onClose, title, children }: ModalProps) {
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose}></div>
      {/* Dialog */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 cursor-pointer"
          >
            <i className="ri-close-line text-xl"></i>
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}