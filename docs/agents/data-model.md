# Data model & relationship rules

## Shape

```js
state = {
  people: [{ id, firstNames, surname, familyName, birth, death, gender }],
  links:  [{ id, type, a, b, blood }],
}
```

- `id`: string. New ones come from `uid()` (time + random).
- `birth` / `death`: `YYYY-MM-DD` strings from `<input type="date">`, or `''`.
- `gender`: `'f' | 'm' | ''`.
- `familyName`: birth/maiden name. Shown via `familyNameLabel()` only when it differs from `surname`.
- `link.type === 'parent'`: `a` is a parent of `b`.
- `link.type === 'partner'`: symmetric, but stored once.
- `blood`: `true` = solid line, `false` = dotted line (partner, adoption, step). Partners default to `false`.
- At most one link between any pair of people (`findLink` checks both directions).

`people` order is insertion order. The layout uses it as a tiebreaker, so it affects the result.

## Validation (`addLink` in src/model/relations.js)

Returns an error string or `null`. A link is rejected when:

1. Either person is missing, or `a === b`.
2. The pair is already linked.
3. Parent link: the child is already an ancestor of the parent (cycle).
4. Parent link with `blood`: the child already has 2 blood parents.
5. Partner link: one person is an ancestor of the other.
6. Generations become unsatisfiable (`assignGenerations(...).ok === false`), e.g. partners forced onto different rows.

`toggleLinkBlood` re-checks rule 4 when switching a parent link to blood.

Deleting a person (`removePerson`) also deletes all their links.

## Persistence

- `localStorage[STORAGE_KEY]` (`family-tree-app.v1`). Saved on every `commit()`. Failures are silently ignored.
- On startup: `load()` → `sanitize()`. If nothing is saved, or the data is invalid, the tree starts empty.
- Export: pretty-printed JSON download `family-tree.json`. Import: `sanitize()` then `replaceState()`.
- `sanitize()` coerces fields to strings, drops people without a string id, drops links to unknown people, self-links and unknown types, and generates missing link ids.

If the schema changes incompatibly, bump the storage key version, or migrate inside `sanitize()`.
