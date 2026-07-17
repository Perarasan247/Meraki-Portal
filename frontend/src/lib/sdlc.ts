import type { CurriculumPhase } from './types'

/**
 * The standard SDLC stages a Project curriculum starts with.
 *
 * These are a starting point, not a rule — once created, the phases are edited
 * in the builder like any other curriculum's.
 */
const SDLC_STAGES: { title: string; description: string }[] = [
  { title: 'Requirement Analysis', description: 'Gather and document what the project must do.' },
  { title: 'Design', description: 'Architecture, data model and UI/UX design.' },
  { title: 'Development', description: 'Build the solution.' },
  { title: 'Testing', description: 'Verify against the requirements; fix defects.' },
  { title: 'Deployment', description: 'Release to the live environment.' },
  { title: 'Maintenance', description: 'Support, monitor and improve after release.' },
]

/** Fresh SDLC phases with new ids — call per curriculum, never share the array. */
export function sdlcPhases(): CurriculumPhase[] {
  return SDLC_STAGES.map((stage, i) => ({
    id: crypto.randomUUID(),
    title: stage.title,
    description: stage.description,
    order: i + 1,
    estimated_duration: null,
  }))
}
