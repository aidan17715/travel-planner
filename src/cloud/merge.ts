type Json = unknown

const isRecord = (v: Json): v is Record<string, Json> => typeof v === 'object' && v !== null && !Array.isArray(v)

// Arrays of objects that each carry a string id (itinerary, flights, expenses...) merge item by item
const isIdArray = (v: Json): v is Record<string, Json>[] =>
  Array.isArray(v) && v.every((x) => isRecord(x) && typeof x.id === 'string')

// Keys holding undefined are treated as missing so local-only fields never look like changes
export function deepEqual(a: Json, b: Json): boolean {
  if (a === b) return true
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((x, i) => deepEqual(x, b[i]))
  if (isRecord(a) && isRecord(b)) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)])
    for (const k of keys) if (!deepEqual(a[k], b[k])) return false
    return true
  }
  return false
}

// Three-way merge. `base` is the last version both sides agreed on; `local` and `remote` are the
// two edited versions. Changes made on only one side are kept; when both sides changed the same
// plain value, the local edit wins.
export function merge3(base: Json, local: Json, remote: Json): Json {
  if (deepEqual(local, remote)) return local
  if (deepEqual(base, local)) return remote
  if (deepEqual(base, remote)) return local

  if (isRecord(local) && isRecord(remote)) {
    const b = isRecord(base) ? base : {}
    const out: Record<string, Json> = {}
    for (const k of new Set([...Object.keys(local), ...Object.keys(remote)])) {
      const inLocal = local[k] !== undefined
      const inRemote = remote[k] !== undefined
      if (inLocal && inRemote) out[k] = merge3(b[k], local[k], remote[k])
      // Deleted on one side: drop it unless the other side edited it meanwhile
      else if (inLocal) {
        if (!deepEqual(b[k], local[k])) out[k] = local[k]
      } else if (inRemote) {
        if (!deepEqual(b[k], remote[k])) out[k] = remote[k]
      }
    }
    return out
  }

  if (isIdArray(local) && isIdArray(remote)) {
    const baseItems = new Map((isIdArray(base) ? base : []).map((x) => [x.id as string, x]))
    const localItems = new Map(local.map((x) => [x.id as string, x]))
    const out: Json[] = []
    for (const r of remote) {
      const id = r.id as string
      const l = localItems.get(id)
      if (l) out.push(merge3(baseItems.get(id), l, r))
      // Deleted locally: stays deleted unless the remote side edited it meanwhile
      else if (!baseItems.has(id) || !deepEqual(baseItems.get(id), r)) out.push(r)
    }
    const remoteIds = new Set(remote.map((x) => x.id))
    for (const l of local) {
      if (remoteIds.has(l.id)) continue
      // Not on the remote: either newly added here, or deleted remotely (drop unless edited here)
      const b = baseItems.get(l.id as string)
      if (!b || !deepEqual(b, l)) out.push(l)
    }
    return out
  }

  return local
}
