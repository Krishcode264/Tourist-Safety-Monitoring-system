import os
import json
import time
import math
from datetime import datetime

def is_point_in_polygon(lat: float, lng: float, polygon_coords: list) -> bool:
    """Ray-Casting Point-in-Polygon containment algorithm (Listing 1 from paper)."""
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

# Mock default Geofence Polygons for Maharashtra / Tour Destinations (Matching DB seeds)
DEFAULT_GEOFENCES = [
    {
        "id": "gf-red-zone-1",
        "name": "High Risk Cliff Edge - Western Ghats",
        "type": "RESTRICTED",
        "riskLevel": "HIGH",
        "coordinates": [
            {"lat": 19.0700, "lng": 72.8700},
            {"lat": 19.0800, "lng": 72.8700},
            {"lat": 19.0800, "lng": 72.8800},
            {"lat": 19.0700, "lng": 72.8800}
        ]
    },
    {
        "id": "gf-danger-forest",
        "name": "Dense Jungle Sanctuary Restricted Corridor",
        "type": "DANGER",
        "riskLevel": "CRITICAL",
        "coordinates": [
            {"lat": 18.9200, "lng": 72.8200},
            {"lat": 18.9500, "lng": 72.8200},
            {"lat": 18.9500, "lng": 72.8500},
            {"lat": 18.9200, "lng": 72.8500}
        ]
    }
]

class AnomalyClassifier:
    """Unsupervised Isolation Forest / Heuristic Anomaly Scoring Engine (Listing 3)."""
    def compute_anomaly_score(self, speed_kmh: float, inactivity_mins: float, dist_to_path_m: float) -> float:
        # Normalized weighted anomaly score equation (Option 1 in paper)
        # S_anomaly = alpha * (off_trail) + beta * (inactivity_duration) + gamma * (speed_anomaly)
        off_trail_factor = min(1.0, dist_to_path_m / 500.0)
        inactivity_factor = min(1.0, inactivity_mins / 30.0) if dist_to_path_m > 100 else 0.0
        speed_factor = 1.0 if speed_kmh > 120.0 else 0.0 # Extreme transport anomaly
        
        score = (0.4 * off_trail_factor) + (0.4 * inactivity_factor) + (0.2 * speed_factor)
        return round(score, 3)

class TouristStreamingEngine:
    def __init__(self, kafka_bootstrap: str = "localhost:9092"):
        self.kafka_bootstrap = kafka_bootstrap
        self.geofences = DEFAULT_GEOFENCES
        self.classifier = AnomalyClassifier()
        self.user_state = {} # touristId -> {last_lat, last_lng, last_timestamp, inactive_since}
        self.last_alerted = {} # (touristId, geofenceId) -> timestamp (5-min cooldown window)

    def process_ping(self, payload: dict) -> list:
        tourist_id = payload.get('id')
        name = payload.get('name', 'Anonymous')
        lat = payload.get('lat')
        lng = payload.get('lng')
        timestamp_str = payload.get('timestamp')
        
        alerts = []
        if not lat or not lng or not tourist_id:
            return alerts

        now = time.time()

        # 1. Geofence Containment Check (Ray-Casting PiP)
        for gf in self.geofences:
            is_breached = is_point_in_polygon(lat, lng, gf['coordinates'])
            if is_breached:
                cooldown_key = f"{tourist_id}:{gf['id']}"
                last_time = self.last_alerted.get(cooldown_key, 0)
                # 5-minute durable cooldown window (Section 4.4)
                if now - last_time > 300:
                    self.last_alerted[cooldown_key] = now
                    alerts.append({
                        "topic": "alerts.geofence.breach",
                        "payload": {
                            "touristId": tourist_id,
                            "touristName": name,
                            "geofenceId": gf['id'],
                            "geofenceName": gf['name'],
                            "riskLevel": gf['riskLevel'],
                            "type": gf['type'],
                            "lat": lat,
                            "lng": lng,
                            "timestamp": datetime.now().isoformat()
                        }
                    })

        # 2. Stateful Feature Extraction (Velocity, Inactivity, Trail Distance)
        last_state = self.user_state.get(tourist_id)
        speed = 0.0
        inactivity_mins = 0.0
        dist_to_path_m = 150.0 # Default calculated distance

        if last_state:
            d_lat = math.radians(lat - last_state['lat'])
            d_lng = math.radians(lng - last_state['lng'])
            a = math.sin(d_lat/2)**2 + math.cos(math.radians(last_state['lat'])) * math.cos(math.radians(lat)) * math.sin(d_lng/2)**2
            dist_km = 6371.0 * (2 * math.atan2(math.sqrt(a), math.sqrt(1-a)))
            
            dt_hours = (now - last_state['timestamp']) / 3600.0
            if dt_hours > 0:
                speed = dist_km / dt_hours
            
            if dist_km < 0.01: # Stationarity check
                inactivity_mins = (now - last_state.get('inactive_since', now)) / 60.0
            else:
                last_state['inactive_since'] = now
        else:
            self.user_state[tourist_id] = {
                'lat': lat,
                'lng': lng,
                'timestamp': now,
                'inactive_since': now
            }

        # 3. Anomaly Scoring
        score = self.classifier.compute_anomaly_score(speed, inactivity_mins, dist_to_path_m)
        if score >= 0.8:
            alerts.append({
                "topic": "alerts.anomaly.detected",
                "payload": {
                    "touristId": tourist_id,
                    "touristName": name,
                    "anomalyType": "INACTIVITY_OFF_TRAIL" if inactivity_mins > 20 else "SPEED_VECTOR_ANOMALY",
                    "score": score,
                    "details": f"Anomaly score {score} (Speed: {round(speed,1)} km/h, Inactivity: {round(inactivity_mins,1)} min)",
                    "timestamp": datetime.now().isoformat()
                }
            })

        return alerts

if __name__ == "__main__":
    print("⚡ Starting PySpark / Python Geofence & Anomaly Streaming Engine...")
    engine = TouristStreamingEngine()
    
    # Test ping
    test_ping = {
        "id": "tourist-101",
        "name": "Alex Smith",
        "lat": 19.0750,
        "lng": 72.8750,
        "timestamp": datetime.now().isoformat()
    }
    alerts = engine.process_ping(test_ping)
    print(f"✅ Micro-batch execution complete. Produced {len(alerts)} alerts.")
    for a in alerts:
        print("  🚨 Alert Payload:", json.dumps(a, indent=2))
