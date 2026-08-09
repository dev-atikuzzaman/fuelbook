// src/components/DraggableEntryList.js
import React from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// ── Single sortable row ──────────────────────────────────────────────────────
function SortableItem({ id, children, isDragMode }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.45 : 1,
    position: isDragging ? 'relative' : 'static',
    zIndex: isDragging ? 50 : 'auto',
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      {/* Drag handle — শুধু drag mode এ দেখায় */}
      {isDragMode && (
        <button
          {...attributes}
          {...listeners}
          className="
            absolute left-0 top-1/2 -translate-y-1/2
            w-7 h-full flex items-center justify-center
            cursor-grab active:cursor-grabbing
            text-yellow-500 hover:text-yellow-300
            transition-colors z-10
          "
          title="ধরে টানুন"
          type="button"
        >
          {/* 6-dot grip icon */}
          <svg width="14" height="20" viewBox="0 0 14 20" fill="currentColor">
            <circle cx="4"  cy="4"  r="1.8"/>
            <circle cx="10" cy="4"  r="1.8"/>
            <circle cx="4"  cy="10" r="1.8"/>
            <circle cx="10" cy="10" r="1.8"/>
            <circle cx="4"  cy="16" r="1.8"/>
            <circle cx="10" cy="16" r="1.8"/>
          </svg>
        </button>
      )}

      {/* Entry content — drag mode এ বাম দিকে সরে যায় */}
      <div className={isDragMode ? 'pl-8' : ''}>{children}</div>
    </div>
  );
}

// ── Main export ──────────────────────────────────────────────────────────────
/**
 * Props:
 *   entries      – array of entry objects (প্রতিটায় id থাকতে হবে)
 *   onReorder    – (reorderedArray) => void
 *   renderEntry  – (entry) => ReactNode
 *   isDragMode   – boolean
 */
export default function DraggableEntryList({
  entries,
  onReorder,
  renderEntry,
  isDragMode,
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 }, // 6px নড়লে drag শুরু
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd({ active, over }) {
    if (!over || active.id === over.id) return;
    const oldIdx = entries.findIndex((e) => e.id === active.id);
    const newIdx = entries.findIndex((e) => e.id === over.id);
    onReorder(arrayMove(entries, oldIdx, newIdx));
  }

  // Drag mode off — সাধারণ লিস্ট
  if (!isDragMode) {
    return (
      <div className="space-y-2">
        {entries.map((entry) => (
          <div key={entry.id}>{renderEntry(entry)}</div>
        ))}
      </div>
    );
  }

  // Drag mode on — sortable লিস্ট
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={entries.map((e) => e.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-2">
          {entries.map((entry) => (
            <SortableItem key={entry.id} id={entry.id} isDragMode={isDragMode}>
              {renderEntry(entry)}
            </SortableItem>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
