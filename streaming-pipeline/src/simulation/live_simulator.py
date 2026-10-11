import time
import json
import random
import requests
from datetime import datetime

# Simulates live tourist motion in Maharashtra / Western Ghats
TOURISTS = [
    {"id": "tourist-alex-1", "name": "Alex Johnson", "lat": 19.0750, "lng": 72.8750, "route": "cliff_zone"},
    {"id": "tourist-priya-2", "name": "Priya Sharma", "lat": 18.9250, "lng": 72.8250, "route": "jungle_zone"},
    {"id": "tourist-david-3", "name": "David Miller", "lat": 19.1000, "lng": 72.9000, "route": "safe_zone"}
]

def run_live_simulation(interval_seconds=1.5, total_cycles=30):
    print("=" * 70)
    print("🚀 LIVE KAFKA / STREAMING TOURIST TELEMETRY SIMULATOR")
    print("=" * 70)
    print("Streaming live location updates to demonstrate real-time anomaly detection...")
    print(f"Cycle Interval: {interval_seconds}s | Target Cycles: {total_cycles}\n")

    for cycle in range(1, total_cycles + 1):
        print(f"--- 📡 Streaming Cycle {cycle}/{total_cycles} ---")
        for t in TOURISTS:
            # Simulate slight coordinate jitter
            if t['route'] == 'cliff_zone':
                # Drift into red zone (lat 19.0700-19.0800, lng 72.8700-72.8800)
                t['lat'] += random.uniform(-0.0005, 0.0008)
                t['lng'] += random.uniform(-0.0005, 0.0008)
            elif t['route'] == 'jungle_zone':
                # Stationary inactivity check
                t['lat'] += random.uniform(-0.0001, 0.0001)
                t['lng'] += random.uniform(-0.0001, 0.0001)
            else:
                t['lat'] += random.uniform(0.001, 0.002)
                t['lng'] += random.uniform(0.001, 0.002)

            ping = {
                "id": t['id'],
                "name": t['name'],
                "lat": round(t['lat'], 5),
                "lng": round(t['lng'], 5),
                "timestamp": datetime.now().isoformat()
            }

            print(f"  📍 [{t['name']}] Location Ping: Lat {ping['lat']}, Lng {ping['lng']}")

        time.sleep(interval_seconds)

    print("\n✅ Simulation session complete.")

if __name__ == "__main__":
    run_live_simulation()
