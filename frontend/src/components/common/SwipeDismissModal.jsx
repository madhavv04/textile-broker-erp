/**
 * components/common/SwipeDismissModal.jsx
 * Modal wrapper with swipe-down-to-dismiss on touch devices.
 * Centers on desktop, works as bottom-sheet on mobile.
 */
import React, { useRef, useState } from 'react';

export default function SwipeDismissModal({ onClose, zIndex = 200, maxWidth = 450, children }) {
  const sheetRef = useRef(null);
  const [dragY, setDragY] = useState(0);
  const dragState = useRef({ startY: 0, dragging: false });

  const onTouchStart = (e) => {
    // Only start dismiss-drag if the sheet is scrolled to the top
    if (sheetRef.current && sheetRef.current.scrollTop > 0) return;
    dragState.current = { startY: e.touches[0].clientY, dragging: true };
  };

  const onTouchMove = (e) => {
    if (!dragState.current.dragging) return;
    const dy = e.touches[0].clientY - dragState.current.startY;
    if (dy > 0) setDragY(dy);
  };

  const onTouchEnd = () => {
    if (dragY > 100) onClose();
    setDragY(0);
    dragState.current.dragging = false;
  };

  return (
    <div
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex,
        backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={sheetRef}
        className="panel"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          width: `min(${maxWidth}px, calc(100vw - 32px))`,
          maxHeight: '90vh',
          overflowY: 'auto',
          position: 'relative',
          transform: `translateY(${dragY}px)`,
          transition: dragY === 0 ? 'transform 0.2s ease' : 'none',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-drag-handle" aria-hidden="true" />
        {children}
      </div>
    </div>
  );
}
