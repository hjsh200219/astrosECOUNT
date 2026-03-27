# Database Schema -- astrosECOUNT

> This project does not use a local database. All data is stored in ECOUNT ERP
> and accessed via REST API. This document describes the ERP entity structure
> as understood through API responses.

## Data Source

- **Primary**: ECOUNT ERP (cloud-hosted, accessed via Open API V2/V3 and Internal Web API V5)
- **Local storage**: File-based caching only (`utils/persistence.ts`); not authoritative

## ERP Entity Map

### Master Data
| Entity | API Endpoint | Key Fields |
|--------|-------------|------------|
| Product (품목) | InventoryProduct | PROD_CD, PROD_DES, UNIT, SPEC |
| Customer/Supplier (거래처) | SalesCust / PurchaseCust | CUST_CD, CUST_DES, BUSINESS_NO |
| Warehouse (창고) | InventoryWH | WH_CD, WH_DES |
| Employee (사원) | HREmp | EMP_CD, EMP_DES |
| Department (부서) | HRDept | DEPT_CD, DEPT_DES |
| Account (계정) | ACCAccount | ACCT_CD, ACCT_DES |
| Project (프로젝트) | ACCProject | PROJECT_CD, PROJECT_DES |

### Transactions
| Entity | API Endpoint | Key Fields |
|--------|-------------|------------|
| Sale Slip (매출전표) | SalesSalesSlip | SLIP_NO, SLIP_DATE, CUST_CD, TOTAL_AMT |
| Sales Order (수주) | SalesSalesOrder | ORDER_NO, ORDER_DATE, CUST_CD |
| Quotation (견적서) | SalesQuotation | QT_NO, QT_DATE, CUST_CD |
| Purchase Slip (매입전표) | PurchasePurchaseSlip | SLIP_NO, SLIP_DATE, CUST_CD |
| Purchase Order (발주) | PurchasePurchaseOrder | ORDER_NO, ORDER_DATE, CUST_CD |

### Inventory
| Entity | API Endpoint | Key Fields |
|--------|-------------|------------|
| Stock Status (재고현황) | InventoryStatusByProduct | PROD_CD, WH_CD, QTY, AMT |
| Inventory In (입고) | InventoryIn | SLIP_NO, PROD_CD, QTY |
| Inventory Out (출고) | InventoryOut | SLIP_NO, PROD_CD, QTY |
| Inventory Transfer (이동) | InventoryTransfer | FROM_WH, TO_WH, PROD_CD, QTY |

### Accounting
| Entity | API Endpoint | Key Fields |
|--------|-------------|------------|
| Journal Entry (회계전표) | ACCSlip | SLIP_NO, SLIP_DATE, DEBIT_AMT, CREDIT_AMT |
| General Ledger (총계정원장) | ACCLedger | ACCT_CD, PERIOD, BALANCE |
| Accounts Receivable (매출채권) | ACCReceivable | CUST_CD, BALANCE |
| Accounts Payable (매입채무) | ACCPayable | CUST_CD, BALANCE |

### Production
| Entity | API Endpoint | Key Fields |
|--------|-------------|------------|
| Work Order (생산지시) | ProductionOrder | ORDER_NO, PROD_CD, QTY |
| Production Result (생산실적) | ProductionResult | RESULT_NO, PROD_CD, QTY |
| BOM (자재명세) | ProductionBOM | PARENT_CD, CHILD_CD, QTY |

## Entity Relationships

```
Product ---< Sale Slip Detail
Product ---< Purchase Slip Detail
Product ---< Inventory Status (by warehouse)
Product ---< BOM (parent/child)

Customer ---< Sale Slip
Supplier ---< Purchase Slip

Warehouse ---< Inventory Status
Warehouse ---< Inventory In/Out

Account ---< Journal Entry Detail
Project ---< Journal Entry Detail
```

## Code Systems

| Code | Format | Example | Description |
|------|--------|---------|-------------|
| PROD_CD | Alphanumeric | `A001` | Product code |
| CUST_CD | Alphanumeric | `B001` | Customer/supplier code |
| WH_CD | Alphanumeric | `WH01` | Warehouse code |
| ACCT_CD | Numeric | `11100` | Account code (chart of accounts) |
| PROJECT_CD | Alphanumeric | `P001` | Project code |

## Data Verification Status

See [docs/README.md](../README.md) for data verification labels:
- `[V]` VERIFIED -- confirmed against live data
- `[I]` INFERRED -- schema inferred from API structure
- `[L]` V3_LEGACY -- web UI confirmed (no API capture)
- `[U]` UNKNOWN -- unverified
