import { describe, it, expect } from "vitest";
import { buildMapScript } from "../../src/utils/map-renderer.js";

describe("buildMapScript", () => {
  it("should return HTML with Leaflet initialization", () => {
    const html = buildMapScript({});
    expect(html).toContain('id="map"');
    expect(html).toContain("L.map");
    expect(html).toContain("openstreetmap.org");
  });

  it("should set custom center and zoom", () => {
    const html = buildMapScript({
      center: { lat: 35.6762, lng: 139.6503 },
      zoom: 10,
    });
    expect(html).toContain("35.6762");
    expect(html).toContain("139.6503");
    expect(html).toContain(",10");
  });

  it("should render markers with labels", () => {
    const html = buildMapScript({
      markers: [{ lat: 37.5, lng: 127.0, label: "서울", popup: "본사" }],
    });
    expect(html).toContain("서울");
    expect(html).toContain("본사");
    expect(html).toContain("circleMarker");
  });

  it("should render routes as polylines", () => {
    const html = buildMapScript({
      routes: [
        {
          points: [
            { lat: 35.0, lng: 129.0 },
            { lat: 37.5, lng: 127.0 },
          ],
          color: "#ff0000",
        },
      ],
    });
    expect(html).toContain("polyline");
    expect(html).toContain("#ff0000");
  });

  it("should include fallback for missing Leaflet", () => {
    const html = buildMapScript({});
    expect(html).toContain("Leaflet CDN 로드 실패");
  });
});
