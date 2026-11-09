import type { AuthInfo, JSONRPCRequest } from '@modelcontextprotocol/core-internal';

/** OAuth scopes to request before handling an MCP request. */
export interface ScopeChallenge {
    /** The exact, complete scope set to include in the challenge. Each scope must satisfy the OAuth `scope-token` grammar. */
    scopes: readonly [string, ...string[]];
    /** Optional human-readable detail satisfying the RFC 6750 `error-description` grammar. */
    errorDescription?: string;
}

/** Determines whether an MCP request needs an OAuth scope challenge. */
export type ScopeChallengeHandler = (context: {
    request: JSONRPCRequest;
    authInfo?: AuthInfo;
}) => ScopeChallenge | undefined | Promise<ScopeChallenge | undefined>;

/** @internal */
export function supportsScopeChallengeResolver(
    transport: unknown
): transport is { setScopeChallengeResolver(resolver: ScopeChallengeHandler): void } {
    return (
        typeof transport === 'object' &&
        transport !== null &&
        'setScopeChallengeResolver' in transport &&
        typeof (transport as { setScopeChallengeResolver: unknown }).setScopeChallengeResolver === 'function'
    );
}
