import { z } from 'zod'

const StringOrNumberSchema = z.union([z.string(), z.number()])

const ResponseEntrySchema = z
  .object({
    value: StringOrNumberSchema.optional(),
  })
  .passthrough()

export const CalcomAttendeeSchema = z
  .object({
    name: z.string().optional(),
    email: z.string().optional(),
    timeZone: z.string().optional(),
  })
  .passthrough()

export const CalcomOrganizerSchema = z
  .object({
    name: z.string().optional(),
    email: z.string().optional(),
    timeZone: z.string().optional(),
  })
  .passthrough()

export const CalcomPayloadSchema = z
  .object({
    triggerEvent: z.string().optional(),
    uid: z.string().optional(),
    id: StringOrNumberSchema.optional(),
    bookingId: StringOrNumberSchema.optional(),
    eventId: StringOrNumberSchema.optional(),
    meetingId: StringOrNumberSchema.optional(),
    uuid: z.string().optional(),
    title: z.string().optional(),
    eventTitle: z.string().optional(),
    startTime: z.string().optional(),
    start: z.string().optional(),
    endTime: z.string().optional(),
    end: z.string().optional(),
    description: z.string().optional(),
    attendees: z.array(CalcomAttendeeSchema).optional(),
    attendee: CalcomAttendeeSchema.optional(),
    customer: CalcomAttendeeSchema.optional(),
    name: z.string().optional(),
    fullName: z.string().optional(),
    email: z.string().optional(),
    organizer: CalcomOrganizerSchema.optional(),
    hosts: z.array(CalcomOrganizerSchema).optional(),
    metadata: z
      .object({
        videoCallUrl: z.string().optional(),
      })
      .passthrough()
      .optional(),
    meetingUrl: z.string().optional(),
    conferenceUrl: z.string().optional(),
    responses: z.record(z.string(), ResponseEntrySchema).optional(),
    when: z
      .object({
        startTime: z.string().optional(),
        endTime: z.string().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough()

export const CalcomWebhookEnvelopeSchema = z
  .object({
    triggerEvent: z.string().optional(),
    payload: CalcomPayloadSchema.optional(),
  })
  .passthrough()

export type CalcomPayload = z.infer<typeof CalcomPayloadSchema>
export type CalcomWebhookEnvelope = z.infer<typeof CalcomWebhookEnvelopeSchema>
