import { Kafka, Partitioners } from 'kafkajs';
import { io } from 'socket.io-client';

const KAFKA_BROKERS = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
const BACKEND_SOCKET_URL = process.env.BACKEND_SOCKET_URL || 'http://localhost:8000';

const kafka = new Kafka({
    clientId: 'tourist-safety-producer',
    brokers: KAFKA_BROKERS,
});

const producer = kafka.producer({
    createPartitioner: Partitioners.DefaultPartitioner
});

export interface TelemetryPayload {
    id: string;
    name?: string;
    lat: number;
    lng: number;
    timestamp: string | Date;
}

export interface SOSPayload {
    id: string;
    name: string;
    lat: number;
    lng: number;
    timestamp: string | Date;
}

export async function initProducer() {
    console.log('🔄 Connecting to Kafka Cluster...');
    await producer.connect();
    console.log('✅ Kafka Telemetry Producer Connected successfully');

    // Connect to backend Socket.IO to intercept live tourist events
    const socket = io(BACKEND_SOCKET_URL, {
        auth: { role: 'producer-service' }
    });

    socket.on('connect', () => {
        console.log(`📡 Telemetry Bridge listening to Backend Socket at ${BACKEND_SOCKET_URL}`);
    });

    // Listing 2 from Research Paper: Produce continuous location updates
    socket.on('tourist:location_update', async (payload: TelemetryPayload) => {
        try {
            await producer.send({
                topic: 'tourist.telemetry.location',
                messages: [{
                    key: payload.id, // Partition key by touristId for ordering
                    value: JSON.stringify({
                        id: payload.id,
                        name: payload.name || 'Anonymous Tourist',
                        lat: payload.lat,
                        lng: payload.lng,
                        timestamp: payload.timestamp || new Date().toISOString()
                    })
                }]
            });
            console.log(`📤 [Kafka] Produced telemetry for tourist: ${payload.id}`);
        } catch (err) {
            console.error('❌ Error producing telemetry to Kafka:', err);
        }
    });

    // Time-critical Panic/SOS Event Ingestion (Bypasses micro-batch for low latency)
    socket.on('tourist:panic', async (payload: SOSPayload) => {
        try {
            await producer.send({
                topic: 'tourist.sos.events',
                messages: [{
                    key: payload.id,
                    value: JSON.stringify({
                        id: payload.id,
                        name: payload.name,
                        lat: payload.lat,
                        lng: payload.lng,
                        timestamp: payload.timestamp || new Date().toISOString()
                    })
                }]
            });
            console.log(`🚨 [Kafka] Produced SOS event for tourist: ${payload.id}`);
        } catch (err) {
            console.error('❌ Error producing SOS event to Kafka:', err);
        }
    });
}

// Allow standalone CLI run
if (require.main === module) {
    initProducer().catch(console.error);
}
