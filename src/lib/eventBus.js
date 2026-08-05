import { EventEmitter } from 'events';

class SyncChatEventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(50);
  }

  /**
   * Publish Platform Event
   */
  emitEvent(eventName, payload) {
    this.emit(eventName, {
      ...payload,
      emittedAt: new Date(),
    });
  }
}

export const EVENTS = {
  MESSAGE_RECEIVED: 'MESSAGE_RECEIVED',
  MESSAGE_SENT: 'MESSAGE_SENT',
  MESSAGE_DELIVERED: 'MESSAGE_DELIVERED',
  MESSAGE_READ: 'MESSAGE_READ',
  CONTACT_CREATED: 'CONTACT_CREATED',
  CONVERSATION_CREATED: 'CONVERSATION_CREATED',
  AGENT_ASSIGNED: 'AGENT_ASSIGNED',
  CAMPAIGN_STARTED: 'CAMPAIGN_STARTED',
  CAMPAIGN_COMPLETED: 'CAMPAIGN_COMPLETED',
  FLOW_EXECUTED: 'FLOW_EXECUTED',
};

export const eventBus = new SyncChatEventBus();
