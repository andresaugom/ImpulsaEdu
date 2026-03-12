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
| [architecture/microservices-proposal.md](architecture/microservices-proposal.md) | Service topology, tech stack, GKE deployment model |
| [architecture/database-schema.md](architecture/database-schema.md) | PostgreSQL schema (DDL), entity relationships, indexes |
| [architecture/api-contracts.md](architecture/api-contracts.md) | REST endpoint contracts for each service |
| [initial-plan.md](initial-plan.md) | Functional/non-functional requirements, user stories, test plan |
| [diagrams/information-flow.puml](diagrams/information-flow.puml) | System information flow (PlantUML) |
| [diagrams/use-case.puml](diagrams/use-case.puml) | Use case diagram (PlantUML) |
