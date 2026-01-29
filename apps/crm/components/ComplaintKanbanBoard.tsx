'use client'

import React, { useState } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  useSensor,
  useSensors,
  PointerSensor,
  TouchSensor,
  closestCorners,
  useDroppable,
} from '@dnd-kit/core'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  AlertCircle,
  Mail,
  FileText,
  Package,
  Calendar,
  CheckCircle2,
  GripVertical,
} from 'lucide-react'
import { Complaint, CustomerProject } from '@/types'

interface ComplaintKanbanBoardProps {
  complaints: Complaint[]
  projects: CustomerProject[]
  onComplaintClick: (complaint: Complaint) => void
  onStatusChange: (complaintId: string, newStatus: Complaint['status']) => Promise<void>
}

type StatusColumn = {
  id: Complaint['status']
  label: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  bgColor: string
}

const statusColumns: StatusColumn[] = [
  {
    id: 'draft',
    label: 'Erfasst',
    icon: AlertCircle,
    color: 'text-slate-600',
    bgColor: 'bg-slate-50',
  },
  {
    id: 'reported',
    label: 'Gemeldet',
    icon: Mail,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  {
    id: 'ab_confirmed',
    label: 'AB bestätigt',
    icon: FileText,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
  },
  {
    id: 'delivered',
    label: 'Geliefert',
    icon: Package,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
  },
  {
    id: 'installed',
    label: 'Nachmontiert',
    icon: Calendar,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
  },
  {
    id: 'resolved',
    label: 'Erledigt',
    icon: CheckCircle2,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
  },
]

interface ComplaintCardProps {
  complaint: Complaint
  project: CustomerProject | null
  onClick: () => void
}

function ComplaintCard({ complaint, project, onClick }: ComplaintCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: complaint.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const priorityColors = {
    urgent: 'bg-red-100 text-red-700 border-red-300',
    high: 'bg-orange-100 text-orange-700 border-orange-300',
    medium: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    low: 'bg-slate-100 text-slate-700 border-slate-300',
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:shadow-lg"
      onClick={onClick}
    >
      <div className="mb-2 flex items-start justify-between">
        <div className="flex-1">
          <p className="mb-1 line-clamp-2 text-sm font-medium text-slate-900">
            {complaint.description}
          </p>
          {project && (
            <p className="text-xs text-slate-500">
              {project.customerName} • #{project.orderNumber}
            </p>
          )}
        </div>
        <div
          {...attributes}
          {...listeners}
          className="ml-2 cursor-grab opacity-0 transition-opacity active:cursor-grabbing group-hover:opacity-100"
        >
          <GripVertical className="h-4 w-4 text-slate-400" />
        </div>
      </div>

      {complaint.priority && (
        <div className="mb-2">
          <span
            className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${
              priorityColors[complaint.priority]
            }`}
          >
            {complaint.priority === 'urgent'
              ? 'Dringend'
              : complaint.priority === 'high'
                ? 'Hoch'
                : complaint.priority === 'medium'
                  ? 'Mittel'
                  : 'Niedrig'}
          </span>
        </div>
      )}

      {complaint.supplierName && (
        <div className="mb-2 flex items-center gap-1 text-xs text-slate-500">
          <Package className="h-3 w-3" />
          {complaint.supplierName}
        </div>
      )}

      {complaint.affectedItemIds && complaint.affectedItemIds.length > 0 && (
        <div className="text-xs text-slate-500">
          {complaint.affectedItemIds.length} Artikel betroffen
        </div>
      )}

      <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
        <span>
          {new Date(complaint.createdAt).toLocaleDateString('de-DE', {
            day: '2-digit',
            month: '2-digit',
          })}
        </span>
        {complaint.affectedItemIds && complaint.affectedItemIds.length > 0 && (
          <span className="rounded-full bg-slate-100 px-2 py-0.5">
            {complaint.affectedItemIds.length}
          </span>
        )}
      </div>
    </div>
  )
}

interface StatusColumnProps {
  column: StatusColumn
  complaints: Complaint[]
  projects: CustomerProject[]
  onComplaintClick: (complaint: Complaint) => void
}

function StatusColumnComponent({
  column,
  complaints,
  projects,
  onComplaintClick,
}: StatusColumnProps) {
  const { setNodeRef } = useDroppable({ id: column.id })
  const Icon = column.icon

  const columnComplaints = complaints.filter(c => c.status === column.id)

  return (
    <div
      ref={setNodeRef}
      className="flex min-w-[280px] flex-col rounded-2xl border border-slate-200 bg-white"
    >
      {/* Column Header */}
      <div className={`rounded-t-2xl ${column.bgColor} p-4`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className={`h-5 w-5 ${column.color}`} />
            <h3 className={`font-bold ${column.color}`}>{column.label}</h3>
          </div>
          <span
            className={`rounded-full ${column.bgColor} px-2 py-1 text-xs font-bold ${column.color}`}
          >
            {columnComplaints.length}
          </span>
        </div>
      </div>

      {/* Complaints List */}
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {columnComplaints.length > 0 ? (
          columnComplaints.map(complaint => {
            const project = projects.find(p => p.id === complaint.projectId) || null
            return (
              <ComplaintCard
                key={complaint.id}
                complaint={complaint}
                project={project}
                onClick={() => onComplaintClick(complaint)}
              />
            )
          })
        ) : (
          <div className="py-8 text-center text-sm text-slate-400">Keine Reklamationen</div>
        )}
      </div>
    </div>
  )
}

const ComplaintKanbanBoard: React.FC<ComplaintKanbanBoardProps> = ({
  complaints,
  projects,
  onComplaintClick,
  onStatusChange,
}) => {
  const [_activeId, _setActiveId] = useState<string | null>(null) // Reserved for drag state
  const [draggedComplaint, setDraggedComplaint] = useState<Complaint | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    })
  )

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    _setActiveId(active.id as string)
    const complaint = complaints.find(c => c.id === active.id)
    if (complaint) {
      setDraggedComplaint(complaint)
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    _setActiveId(null)
    setDraggedComplaint(null)

    if (!over) return

    const complaintId = active.id as string
    const newStatus = over.id as Complaint['status']

    // Nur Status ändern wenn es sich wirklich geändert hat
    const complaint = complaints.find(c => c.id === complaintId)
    if (complaint && complaint.status !== newStatus) {
      await onStatusChange(complaintId, newStatus)
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {statusColumns.map(column => (
          <StatusColumnComponent
            key={column.id}
            column={column}
            complaints={complaints}
            projects={projects}
            onComplaintClick={onComplaintClick}
          />
        ))}
      </div>

      <DragOverlay>
        {draggedComplaint ? (
          <div className="rounded-xl border-2 border-red-500 bg-white p-4 shadow-2xl">
            <p className="text-sm font-medium text-slate-900">{draggedComplaint.description}</p>
            {projects.find(p => p.id === draggedComplaint.projectId) && (
              <p className="mt-1 text-xs text-slate-500">
                {projects.find(p => p.id === draggedComplaint.projectId)?.customerName}
              </p>
            )}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

export default ComplaintKanbanBoard
