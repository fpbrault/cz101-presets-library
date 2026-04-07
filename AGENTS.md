# Agent Instructions

## Tooling & Environment

- **Package Manager**: Always use `bun`. Do not use `npm` or `yarn`.

## Memory Management

- **Memory Tools**: Use `memory_set`, `memory_replace`, and `memory_list` to:
  - Remember information when explicitly asked.
  - Recall information when asked.
  - Proactively store useful project context or user preferences to maintain continuity.
## Multi-agent attribution

This session may involve multiple agents. To determine which agent produced
each response, call the `agent_attribution` tool. It returns a numbered list
of every message in the session. User messages show only the role; assistant
messages include the agent name and the provider and model that produced the
response.

## Reference

- Memory Plugin: https://github.com/joshuadavidthomas/opencode-agent-memory
