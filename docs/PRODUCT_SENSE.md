# Product Sense -- astrosECOUNT

> Product principles, user personas, and domain context for the ECOUNT ERP MCP Server.

## Product Vision

Enable LLMs to serve as a natural-language interface to ECOUNT ERP, allowing non-technical
users to query, create, and manage ERP data through conversational AI without learning
the ECOUNT web interface or API.

## User Personas

### 1. Business Owner (Primary)
- **Context**: Runs Astros (수입육 유통회사), uses ECOUNT ERP daily
- **Needs**: Quick data lookups, report generation, slip creation via Claude
- **Pain points**: Manual ERP navigation, repetitive data entry, complex query building
- **Success metric**: Time saved per ERP interaction

### 2. Operations Staff
- **Context**: Handles purchasing, inventory, logistics
- **Needs**: Purchase order creation, inventory checks, shipment tracking
- **Pain points**: Multiple ERP screens for single workflow
- **Success metric**: Workflow steps reduced

### 3. Accounting Staff
- **Context**: Manages journals, AR/AP, tax invoices
- **Needs**: Journal entry creation, ledger queries, receivable/payable tracking
- **Pain points**: End-of-month reconciliation burden
- **Success metric**: Reconciliation time reduction

## Domain Context

### Business Domain: Imported Meat Distribution
- **Supply chain**: Import -> Customs -> Cold storage -> Distribution -> Sales
- **Key entities**: Products (29 items), Customers/Suppliers, Warehouses, Projects
- **Data scale**: ~1,358 tons inventory, 622 sales, 261 purchases, 1,609 accounting entries
- **Code systems**: Product codes, customer codes, warehouse codes, project codes

### ERP Coverage (~80%)
- **Fully covered**: Sales, Purchase, Inventory, Accounting, Master Data
- **Partially covered**: Production (via Open API)
- **Not covered**: Some V3 Legacy features (supplier lists, production intake - SSR pages)

## Product Principles

1. **Zero-config for end users**: LLM handles all API complexity; user speaks naturally
2. **Fail gracefully, never silently**: Every error becomes a readable MCP response
3. **ERP is source of truth**: Local caching is convenience only; never contradict ERP data
4. **Session management is invisible**: Auto-login, auto-retry, circuit breaking -- all hidden from user
5. **Korean-first**: All user-facing messages, error text, and documentation in Korean
6. **Additive-only mutations**: Create/update operations go through ECOUNT API validation

## Success Metrics

| Metric | Target |
|--------|--------|
| API coverage | >= 80% of daily ERP operations |
| Session reliability | Zero manual re-authentication needed |
| Error clarity | User can understand and act on every error message |
| Tool response time | < 5 seconds for standard queries |
| Test coverage | Unit tests for all tool modules |

## Competitive Advantage

- **Dual API strategy**: Open API (official) + Internal Web API (reverse-engineered) for maximum coverage
- **Domain-specific tools**: Not generic ERP adapter; tailored for imported meat distribution workflows
- **B/L parsing, shipment tracking, logistics KPIs**: Industry-specific tools beyond standard ERP
