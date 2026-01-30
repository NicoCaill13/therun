import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/db/prisma.service';
import { Prisma } from '@prisma/client';

/**
 * Event data returned from access checks.
 */
export interface EventWithOrganiser {
  id: string;
  organiserId: string;
}

/**
 * Helper functions for event access control.
 * Centralizes common event permission checks.
 */

/**
 * Finds an event by ID or throws NotFoundException.
 *
 * @param prisma - Prisma service or transaction client
 * @param eventId - Event ID to find
 * @param select - Optional select clause (defaults to id + organiserId)
 * @returns The found event
 * @throws NotFoundException if event doesn't exist
 */
export async function findEventOrThrow(
  prisma: PrismaService | Prisma.TransactionClient,
  eventId: string,
  select?: Prisma.EventSelect,
): Promise<EventWithOrganiser> {
  const event = await (prisma as PrismaService).event.findUnique({
    where: { id: eventId },
    select: select ?? { id: true, organiserId: true },
  });

  if (!event) {
    throw new NotFoundException('Event not found');
  }

  return event as EventWithOrganiser;
}

/**
 * Asserts that the caller is the organiser of the event.
 *
 * @param event - Event to check
 * @param callerId - ID of the user making the request
 * @param message - Custom error message (optional)
 * @throws ForbiddenException if caller is not the organiser
 */
export function assertIsOrganiser(event: EventWithOrganiser, callerId: string, message?: string): void {
  if (event.organiserId !== callerId) {
    throw new ForbiddenException(message ?? 'Only the organiser can perform this action');
  }
}

/**
 * Finds an event and asserts the caller is the organiser.
 * Combines findEventOrThrow and assertIsOrganiser in a single call.
 *
 * @param prisma - Prisma service or transaction client
 * @param eventId - Event ID to find
 * @param callerId - ID of the user making the request
 * @param select - Optional select clause
 * @param message - Custom error message for forbidden (optional)
 * @returns The found event
 * @throws NotFoundException if event doesn't exist
 * @throws ForbiddenException if caller is not the organiser
 */
export async function findEventAsOrganiserOrThrow(
  prisma: PrismaService | Prisma.TransactionClient,
  eventId: string,
  callerId: string,
  select?: Prisma.EventSelect,
  message?: string,
): Promise<EventWithOrganiser> {
  const event = await findEventOrThrow(prisma, eventId, select);
  assertIsOrganiser(event, callerId, message);
  return event;
}
