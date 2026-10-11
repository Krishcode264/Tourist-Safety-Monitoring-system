import time
import random
import json
from datetime import datetime

def is_point_in_polygon(lat: float, lng: float, polygon_coords: list) -> bool:
    """Ray-Casting Point-in-Polygon containment test (Listing 1 in paper)."""
    inside = False
    n = len(polygon_coords)
    if n < 3:
        return False
    j = n - 1
    for i in range(n):
        xi, yi = polygon_coords[i]['lng'], polygon_coords[i]['lat']
        xj, yj = polygon_coords[j]['lng'], polygon_coords[j]['lat']
        intersect = ((yi > lat) != (yj > lat)) and (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi)
        if intersect:
            inside = not inside
        j = i
    return inside

def generate_synthetic_geofences(num_fences=40):
    """Generate N synthetic polygon geofences."""
    fences = []
    for i in range(num_fences):
        base_lat = 19.00 + (i * 0.01)
        base_lng = 72.80 + (i * 0.01)
        fences.append({
            "id": f"gf-bench-{i}",
            "name": f"Benchmark Zone {i}",
            "coordinates": [
                {"lat": base_lat, "lng": base_lng},
                {"lat": base_lat + 0.005, "lng": base_lng},
                {"lat": base_lat + 0.005, "lng": base_lng + 0.005},
                {"lat": base_lat, "lng": base_lng + 0.005}
            ]
        })
    return fences

def generate_synthetic_pings(num_pings=40000):
    """Generate N synthetic tourist location pings."""
    pings = []
    for i in range(num_pings):
        pings.append({
            "id": f"tourist-{i % 500}",
            "lat": 19.00 + (random.random() * 0.5),
            "lng": 72.80 + (random.random() * 0.5),
            "timestamp": time.time()
        })
    return pings

def run_local_benchmark(num_pings=40000, num_fences=40):
    print("=" * 70)
    print("📊 RUNNING LOCAL BENCHMARK OF DETECTON WORKLOAD (Section 6.1)")
    print("=" * 70)
    print(f"🔹 Synthetic ping volume: {num_pings:,} events")
    print(f"🔹 Geofence polygons per ping: {num_fences} polygons")
    print("🔄 Processing detection workload on single CPU core...")

    fences = generate_synthetic_geofences(num_fences)
    pings = generate_synthetic_pings(num_pings)

    breaches_found = 0
    start_time = time.perf_counter()

    for ping in pings:
        lat = ping['lat']
        lng = ping['lng']
        for gf in fences:
            if is_point_in_polygon(lat, lng, gf['coordinates']):
                breaches_found += 1

    end_time = time.perf_counter()
    total_time = end_time - start_time
    throughput = num_pings / total_time
    avg_latency_ms = (total_time / num_pings) * 1000.0

    print("\n" + "=" * 70)
    print("📈 MEASURED BENCHMARK RESULTS (Matching Paper Table 3)")
    print("=" * 70)
    print(f"  • Total Processing Time:     {total_time:.2f} seconds")
    print(f"  • Measured Single-Core Throughput: {throughput:,.2f} events / sec")
    print(f"  • Average Per-Event Latency:   {avg_latency_ms:.3f} ms")
    print(f"  • Total Polygon Breaches Found: {breaches_found:,}")
    print("=" * 70 + "\n")

    return {
        "num_pings": num_pings,
        "num_fences": num_fences,
        "total_time_s": round(total_time, 2),
        "throughput_events_per_sec": round(throughput, 2),
        "avg_latency_ms": round(avg_latency_ms, 3)
    }

if __name__ == "__main__":
    run_local_benchmark()
