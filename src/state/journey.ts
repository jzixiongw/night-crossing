/* Durable milestones belong to a request, rather than to the objects left in
   the room. Moving or handing over a plant must never undo completed work. */
export interface Journey {
  to: string;
  taken: boolean;
  course: boolean;
  grown: boolean;
  built: boolean;
  delivered: boolean;
  prepared: boolean;
}

export const flowering = (p: any, time: number) => !!p && p.g >= 1 && time >= (p.bloomAt || 0);

export function beginJourney(save: any, to: string, time: number): Journey {
  if (save.journey?.to === to && !save.journey.delivered) return save.journey;
  return save.journey = {
    to, taken: true, course: false,
    grown: !!save.rig || save.pots.some(p => flowering(p, time)),
    built: !!(save.rig?.glass && save.rig?.lit), delivered: false,
    prepared: !save.calls.length
  };
}

export function syncJourney(save: any, time: number): boolean {
  const before = JSON.stringify(save.journey);
  if (!save.journey) {
    const id = save.call?.to || save.slips[0];
    if (id) beginJourney(save, id, time);
  }
  const j = save.journey as Journey | undefined;
  if (!j || j.delivered) return before !== JSON.stringify(save.journey);
  const call = save.call?.to === j.to ? save.call : null;
  j.taken ||= save.slips.includes(j.to) || !!call;
  j.course ||= !!call;
  j.grown ||= !!save.rig || save.pots.some(p => flowering(p, time));
  j.built ||= !!(save.rig?.glass && save.rig?.lit);
  if (call?.gave) { j.grown = j.built = j.delivered = true; }
  return before !== JSON.stringify(save.journey);
}

export function journeyDone(save: any, step: string): boolean {
  const j = save.journey;
  if (!j) return false;
  return !!j[({ take: 'taken', course: 'course', grow: 'grown', build: 'built', give: 'delivered' })[step]];
}
