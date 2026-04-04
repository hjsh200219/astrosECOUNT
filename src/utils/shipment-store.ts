import { nowIso } from "./date-helpers.js";
import { generateId } from "./id-generator.js";

export interface Shipment {
  id: string;
  blNumber: string;
  carrier: string;
  product: string;
  origin: string;
  destination: string;
  etd?: string;
  eta?: string;
  status: "booked" | "departed" | "in_transit" | "arrived" | "customs" | "cleared" | "delivered";
  containerNo?: string;
  weight?: number;
  createdAt: string;
  updatedAt: string;
}

export interface EtaChange {
  previousEta?: string;
  newEta: string;
  reason?: string;
  changedAt: string;
}

const SHIPMENTS: Map<string, Shipment> = new Map();
const ETA_HISTORY: Map<string, EtaChange[]> = new Map();

export function addShipment(data: Omit<Shipment, "id" | "createdAt" | "updatedAt">): Shipment {
  const now = nowIso();
  const shipment: Shipment = { ...data, id: generateId("SHP"), createdAt: now, updatedAt: now };
  SHIPMENTS.set(shipment.id, shipment);
  return shipment;
}

export function getShipment(id: string): Shipment | null {
  return SHIPMENTS.get(id) ?? null;
}

export function listShipments(filter?: { status?: string; carrier?: string }): Shipment[] {
  let results = Array.from(SHIPMENTS.values());
  if (filter?.status) results = results.filter((s) => s.status === filter.status);
  if (filter?.carrier) results = results.filter((s) => s.carrier === filter.carrier);
  return results;
}

export function updateShipmentStatus(id: string, status: string): Shipment | null {
  const shipment = SHIPMENTS.get(id);
  if (!shipment) return null;
  const updated: Shipment = { ...shipment, status: status as Shipment["status"], updatedAt: nowIso() };
  SHIPMENTS.set(id, updated);
  return updated;
}

export function getShipmentByBL(blNumber: string): Shipment | null {
  for (const shipment of SHIPMENTS.values()) {
    if (shipment.blNumber === blNumber) return shipment;
  }
  return null;
}

export function updateShipmentEta(id: string, eta: string, reason?: string): Shipment | null {
  const shipment = SHIPMENTS.get(id);
  if (!shipment) return null;
  const change: EtaChange = { previousEta: shipment.eta, newEta: eta, reason, changedAt: nowIso() };
  const history = ETA_HISTORY.get(id) ?? [];
  history.push(change);
  ETA_HISTORY.set(id, history);
  const updated: Shipment = { ...shipment, eta, updatedAt: nowIso() };
  SHIPMENTS.set(id, updated);
  return updated;
}

export function getEtaHistory(id: string): EtaChange[] {
  return ETA_HISTORY.get(id) ?? [];
}
