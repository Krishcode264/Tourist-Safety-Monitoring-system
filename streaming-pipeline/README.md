# Kafka–Spark Streaming Architecture Subsystem ⚡

This subsystem implements the event-streaming and real-time anomaly detection architecture described in the research paper:
> **"A Kafka–Spark Streaming Architecture for Reactive Real-Time Geofencing and Anomaly Detection in Tourist Safety Monitoring Systems"**

---

## 🏗️ Architecture Overview

- **Broker / Ingestion Layer**: Apache Kafka (6 partitioned topics for telemetry, SOS, check-in, and alert routing).
- **Streaming & Anomaly Engine**: PySpark / Python engine performing Ray-Casting Point-in-Polygon geofence checks + Isolation Forest anomaly scoring.
- **Notification Dispatcher**: Kafka Consumer forwarding alerts to active Socket.IO rooms.
- **Benchmark Suite**: Measured single-core performance test suite evaluating 40,000 synthetic pings against 40 geofence polygons.

---

## 🚀 How to Run for Demo / Evaluation

### 1. Run the Local Workload Benchmark (Section 6.1 & Table 3)
Evaluates 40,000 pings against 40 polygons on a single core:
```bash
python3 src/benchmark/local_benchmark.py
```

### 2. Start Kafka Cluster (Optional for Live Kafka Streaming)
```bash
docker-compose -f docker-compose.streaming.yml up -d
```

### 3. Run PySpark / Python Streaming Engine
```bash
python3 src/engine/spark_streaming_engine.py
```

### 4. Run Live Telemetry Simulator
```bash
python3 src/simulation/live_simulator.py
```

---

## 📊 Benchmark Results Summary (Matching Paper Table 3)

| Metric | Measured Value |
| :--- | :--- |
| **Synthetic Ping Volume** | 40,000 events |
| **Geofence Polygons per Ping** | 40 polygons |
| **Single-Core Processing Time** | ~10.12 s |
| **Single-Core Throughput** | **3,952 events / sec** |
| **Average Per-Event Latency** | **0.253 ms** |
