import { EventEmitter } from 'events';

class InboxEventEmitter extends EventEmitter {}

if (!global.__inboxEventEmitter) {
  global.__inboxEventEmitter = new InboxEventEmitter();
  global.__inboxEventEmitter.setMaxListeners(200);
}

export const inboxEvents = global.__inboxEventEmitter;
