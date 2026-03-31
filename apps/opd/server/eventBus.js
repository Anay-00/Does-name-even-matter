import { EventEmitter } from "events";

const bus = new EventEmitter();
bus.setMaxListeners(200);

export function emitOpdEvent(hospitalId, event) {
  bus.emit(`opd:${hospitalId}`, event);
}

export function subscribeHospital(hospitalId, callback) {
  bus.on(`opd:${hospitalId}`, callback);
  return () => bus.off(`opd:${hospitalId}`, callback);
}
