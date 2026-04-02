import { describe, it, expect } from "vitest";
import {
  buildWarehouseScene,
  buildLogisticsNetworkScene,
} from "../../src/utils/three-d-renderer.js";

describe("buildWarehouseScene", () => {
  it("should return HTML with Three.js module import", () => {
    const html = buildWarehouseScene([
      { name: "A구역", x: 0, z: 0, width: 3, depth: 3, occupancy: 0.8 },
    ]);
    expect(html).toContain('id="three-container"');
    expect(html).toContain('type="module"');
    expect(html).toContain("THREE.BoxGeometry");
    expect(html).toContain("OrbitControls");
  });

  it("should handle multiple zones", () => {
    const html = buildWarehouseScene([
      { name: "A", x: 0, z: 0, width: 2, depth: 2, occupancy: 0.5 },
      { name: "B", x: 5, z: 0, width: 2, depth: 2, occupancy: 0.9 },
    ]);
    expect(html).toContain('"A"');
    expect(html).toContain('"B"');
  });

  it("should include grid helper", () => {
    const html = buildWarehouseScene([]);
    expect(html).toContain("GridHelper");
  });
});

describe("buildLogisticsNetworkScene", () => {
  it("should return HTML with nodes and edges", () => {
    const html = buildLogisticsNetworkScene(
      [
        { id: "port", label: "부산항", x: 0, y: 0, z: 0 },
        { id: "wh", label: "창고", x: 10, y: 0, z: 5 },
      ],
      [{ from: "port", to: "wh", weight: 100 }],
    );
    expect(html).toContain("SphereGeometry");
    expect(html).toContain("부산항");
    expect(html).toContain("port");
    expect(html).toContain("wh");
  });

  it("should include OrbitControls for interaction", () => {
    const html = buildLogisticsNetworkScene([], []);
    expect(html).toContain("OrbitControls");
    expect(html).toContain("enableDamping");
  });
});
