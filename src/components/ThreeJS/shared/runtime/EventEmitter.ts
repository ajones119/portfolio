export type EventCallback = (...args: unknown[]) => unknown;

interface ResolvedName {
  value: string;
  namespace: string;
}

type NamespaceCallbacks = Record<string, EventCallback[]>;
type Callbacks = Record<string, NamespaceCallbacks>;

export default class EventEmitter {
  private callbacks: Callbacks = { base: {} };

  on(names: string, callback: EventCallback): this {
    if (!names.trim()) {
      throw new Error("Event names cannot be empty.");
    }

    for (const resolvedName of this.resolveNames(names)) {
      const { namespace, value } = this.resolveName(resolvedName);
      this.callbacks[namespace] ??= {};
      this.callbacks[namespace][value] ??= [];
      this.callbacks[namespace][value].push(callback);
    }

    return this;
  }

  off(names: string): this {
    if (!names.trim()) {
      throw new Error("Event names cannot be empty.");
    }

    for (const resolvedName of this.resolveNames(names)) {
      const { namespace, value } = this.resolveName(resolvedName);

      if (namespace !== "base" && value === "") {
        delete this.callbacks[namespace];
        continue;
      }

      const namespaces = namespace === "base"
        ? Object.keys(this.callbacks)
        : [namespace];

      for (const currentNamespace of namespaces) {
        const namespaceCallbacks = this.callbacks[currentNamespace];
        if (!namespaceCallbacks?.[value]) continue;

        delete namespaceCallbacks[value];
        if (Object.keys(namespaceCallbacks).length === 0) {
          delete this.callbacks[currentNamespace];
        }
      }
    }

    this.callbacks.base ??= {};
    return this;
  }

  emit(name: string, args: unknown[] = []): unknown {
    if (!name.trim()) {
      throw new Error("Event name cannot be empty.");
    }

    const resolvedNames = this.resolveNames(name);
    if (resolvedNames.length !== 1) {
      throw new Error("Only one event can be emitted at a time.");
    }

    const { namespace, value } = this.resolveName(resolvedNames[0]);
    if (!value) {
      throw new Error("An emitted event must include an event name.");
    }

    const namespaces = namespace === "base"
      ? Object.keys(this.callbacks)
      : [namespace];
    let finalResult: unknown;

    for (const currentNamespace of namespaces) {
      for (const callback of this.callbacks[currentNamespace]?.[value] ?? []) {
        const result = callback(...args);
        finalResult ??= result;
      }
    }

    return finalResult ?? null;
  }

  /** @deprecated Use emit() for new code. */
  trigger(name: string, args: unknown[] = []): unknown {
    return this.emit(name, args);
  }

  destroy(): void {
    this.callbacks = { base: {} };
  }

  private resolveNames(names: string): string[] {
    return names
      .replace(/[^a-zA-Z0-9 ,/.]/g, "")
      .replace(/[,/]+/g, " ")
      .split(/\s+/)
      .filter(Boolean);
  }

  private resolveName(name: string): ResolvedName {
    const [value, namespace = "base"] = name.split(".");
    return { value, namespace: namespace || "base" };
  }
}
