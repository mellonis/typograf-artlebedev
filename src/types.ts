export type EntityType = 'named' | 'numeric' | 'none';

export type TypografOptions = {
  /** Entity encoding strategy. Default: 'none' (raw UTF-8). */
  entityType?: EntityType;
  /** Insert <br/> at single newlines. Default: false. */
  useBr?: boolean;
  /** Wrap blocks in <p>. Default: false. */
  useP?: boolean;
  /** Glue word length for NBSPs. Default: 3. */
  maxNobr?: number;
  /** Override service URL. Default: ArtLebedev's public endpoint. */
  endpoint?: string;
  /** AbortSignal for caller-initiated cancellation. */
  signal?: AbortSignal;
  /** Request timeout in milliseconds. Default: 1500. */
  timeoutMs?: number;
};

export type TypografErrorCode =
  | 'service_error'
  | 'network_error'
  | 'timeout'
  | 'aborted';

export type TypografResult =
  | { output: string }
  | { error: TypografErrorCode; detail?: string };
