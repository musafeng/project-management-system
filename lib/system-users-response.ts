type SystemUserLike = {
  id: string
  name: string
  dingUserId: string
  role: string
}

type SystemUsersPayload =
  | SystemUserLike[]
  | {
      users?: SystemUserLike[] | null
    }
  | null
  | undefined

export function normalizeSystemUsersPayload(payload: SystemUsersPayload) {
  if (Array.isArray(payload)) {
    return payload
  }

  if (payload && Array.isArray(payload.users)) {
    return payload.users
  }

  return []
}
