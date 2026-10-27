const slug = (value: string) => value.slice(0, 80).replace(/[^a-z0-9]/gi, '_').toLowerCase();

/** `<topic>_<session>_<suffix>`, e.g. water_cycle_session_1_SayunaAI.pptx; shared by the export routes and the client. */
export function exportFilename({ topic, session, suffix }: { topic: string; session?: string; suffix: string }): string {
  const sessionName = session && session.trim().length > 0 ? session.trim() : 'session';
  return `${slug(topic || 'presentation')}_${slug(sessionName)}_${suffix}`;
}
