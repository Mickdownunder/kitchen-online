import { z } from 'zod'

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Datum muss YYYY-MM-DD sein')
const isoTime = z.string().regex(/^\d{2}:\d{2}$/, 'Zeit muss HH:MM sein')

const BaseIntentSchema = z.object({
  version: z.literal('v1'),
  action: z.enum(['create_task', 'create_appointment', 'add_project_note']),
  summary: z.string().min(1).max(300),
  confidence: z.number().min(0).max(1),
  confidenceLevel: z.enum(['high', 'medium', 'low']),
}).strict()

const CreateTaskIntentSchema = BaseIntentSchema.extend({
  action: z.literal('create_task'),
  task: z.object({
    title: z.string().min(1).max(200),
    description: z.string().max(2000).optional(),
    priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
    dueAt: z.string().datetime().optional(),
    projectHint: z.string().max(160).optional(),
    customerHint: z.string().max(160).optional(),
  }).strict(),
}).strict()

const CreateAppointmentIntentSchema = BaseIntentSchema.extend({
  action: z.literal('create_appointment'),
  appointment: z.object({
    customerName: z.string().min(1).max(200),
    date: isoDate,
    time: isoTime.optional(),
    type: z.enum([
      'Consultation',
      'FirstMeeting',
      'Measurement',
      'Installation',
      'Service',
      'ReMeasurement',
      'Delivery',
      'Other',
    ]),
    notes: z.string().max(2000).optional(),
    phone: z.string().max(60).optional(),
    projectHint: z.string().max(160).optional(),
  }).strict(),
}).strict()

const AddProjectNoteIntentSchema = BaseIntentSchema.extend({
  action: z.literal('add_project_note'),
  projectNote: z.object({
    projectHint: z.string().min(1).max(160),
    note: z.string().min(1).max(2000),
  }).strict(),
}).strict()

export const VoiceIntentSchema = z.union([
  CreateTaskIntentSchema,
  CreateAppointmentIntentSchema,
  AddProjectNoteIntentSchema,
])

export type VoiceIntent = z.infer<typeof VoiceIntentSchema>
