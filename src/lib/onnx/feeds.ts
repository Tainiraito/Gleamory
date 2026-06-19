type SessionInputMetadata = {
  inputNames?: readonly string[]
}

export function createFeeds<T>(session: SessionInputMetadata, inputTensor: T): Record<string, T> {
  const inputName = session.inputNames?.[0] ?? 'x'
  return { [inputName]: inputTensor }
}
