# ImpulsaEdu – Documentation

## Directory Structure

```
docs/
├── architecture/           # System architecture proposals and decisions
│   ├── microservices-proposal.md
│   ├── database-schema.md
│   └── api-contracts.md
├── diagrams/               # PlantUML source files and rendered images
│   ├── information-flow.puml
│   ├── use-case.puml
│   ├── use-case.png
│   └── implementation-diagram.png
└── initial-plan.md         # Original project plan and requirements document
```

## Quick Reference

| Document | Purpose |
|---|---|
| [agent-api-reference.md](agent-api-reference.md) | **AI agent reference** — authoritative API contracts with exact response shapes, TypeScript types, and frontend implementation status |
| [architecture/microservices-proposal.md](architecture/microservices-proposal.md) | Service topology, tech stack, AKS deployment model |
| [architecture/database-schema.md](architecture/database-schema.md) | PostgreSQL schema (DDL), entity relationships, indexes |
| [architecture/api-contracts.md](architecture/api-contracts.md) | REST endpoint contracts for each service (high-level overview) |
| [initial-plan.md](initial-plan.md) | Functional/non-functional requirements, user stories, test plan |
| [diagrams/information-flow.puml](diagrams/information-flow.puml) | System information flow (PlantUML) |
| [diagrams/use-case.puml](diagrams/use-case.puml) | Use case diagram (PlantUML) |

## MCP Server

An MCP server providing tool-callable access to the API documentation is
available at [`mcp/impulsaedu-api/`](../mcp/impulsaedu-api/README.md).
Configured for GitHub Copilot coding agents via [`.github/copilot/mcp.json`](../.github/copilot/mcp.json).
