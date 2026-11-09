# Mechanical migration mapping

- Keep the package name `@contextvm/mcp-sdk` and supported subpaths.
- Replace schema-first handler registration with method strings.
- Replace `extra.*` with `ctx.mcpReq.*` where appropriate.
- Drop spec-method result-schema arguments from `request` and `callTool`.
- Use `registerTool` / `registerPrompt` / `registerResource` and Standard Schema objects.
- Rename protocol errors/types to upstream v2 names; distinguish local `SdkError` failures.
- Remove experimental task runtime usages. Do not remove CVM's unrelated CEP-41 streams.
- Test JSON-RPC messages; source compilation alone does not establish wire compatibility.
