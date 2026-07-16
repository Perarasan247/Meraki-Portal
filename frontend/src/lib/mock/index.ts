import { handleStudentMock, NOT_HANDLED } from './studentMock'
import { handleAdminMock } from './adminMock'

export { NOT_HANDLED }

/** Try each mock handler in turn; returns NOT_HANDLED if none owns the route. */
export function handleMock(method: string, path: string, body: unknown): unknown {
  const s = handleStudentMock(method, path, body)
  if (s !== NOT_HANDLED) return s
  return handleAdminMock(method, path, body)
}
