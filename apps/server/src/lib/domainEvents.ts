import { EventEmitter } from 'node:events';
import type { TripState } from '@snowsync/shared';
import { logger } from './logger';

/** A trip changed state. Emitted only after the transaction that changed it has committed. */
export interface TripStateChanged {
  tripId: string;
  fromState: TripState;
  toState: TripState;
  /** The trip's version after the change. */
  version: number;
  actorType: 'USER' | 'SCHEDULER' | 'RULE';
}

/** Every in-process domain event, by name. Later sprints add ParticipationChanged, TripExitStarted… */
export interface DomainEvents {
  TripStateChanged: TripStateChanged;
}

const emitter = new EventEmitter();
emitter.setMaxListeners(50);

/**
 * In-process domain events (System Map §05): one module announces that something happened, other
 * modules react. This is not a message bus and nothing leaves the process; Sprint 5 subscribes the
 * realtime gateway here. A listener that throws is logged and never breaks the emitter.
 */
export const domainEvents = {
  emit<K extends keyof DomainEvents>(name: K, event: DomainEvents[K]): void {
    emitter.emit(name, event);
  },
  /** Subscribes; returns a function that unsubscribes. */
  on<K extends keyof DomainEvents>(
    name: K,
    listener: (event: DomainEvents[K]) => void,
  ): () => void {
    const safe = (event: DomainEvents[K]): void => {
      try {
        listener(event);
      } catch (error) {
        logger.error({ err: error, event: name }, 'Domain event listener failed');
      }
    };
    emitter.on(name, safe);
    return () => {
      emitter.off(name, safe);
    };
  },
};
