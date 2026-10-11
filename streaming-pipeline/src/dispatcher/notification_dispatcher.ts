import { Kafka } from 'kafkajs';
import { io } from 'socket.io-client';

const KAFKA_BROKERS = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
const BACKEND_SOCKET_URL = process.env.BACKEND_SOCKET_URL || 'http://localhost:8000';

const kafka = new Kafka({
    clientId: 'notification-dispatcher',
    brokers: KAFKA_BROKERS,
});

const consumer = kafka.consumer({ groupId: 'notification-dispatcher-group' });

export async function runDispatcher() {
    console.log('🔄 Connecting Notification Dispatcher to Kafka...');
    await consumer.connect();
    console.log('✅ Dispatcher connected to Kafka');

    // Connect to existing Socket.IO backend to emit notifications
    const socket = io(BACKEND_SOCKET_URL, {
        auth: { role: 'dispatcher-service' }
    });

    socket.on('connect', () => {
        console.log(`🔌 Dispatcher connected to Backend Socket at ${BACKEND_SOCKET_URL}`);
    });

    await consumer.subscribe({
        topics: ['alerts.geofence.breach', 'alerts.anomaly.detected'],
        fromBeginning: false
    });

    console.log('📡 Listening for Kafka alerts on topics: [alerts.geofence.breach, alerts.anomaly.detected]');

    // Listing 4 from Research Paper: Consume Kafka alerts and emit to Socket.IO
    await consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
            if (!message.value) return;
            try {
                const alert = JSON.parse(message.value.toString());
                console.log(`🔔 [Kafka Alert Received] Topic: ${topic} | Tourist: ${alert.touristId || alert.id}`);

                if (topic === 'alerts.geofence.breach') {
                    // Emit directly to tourist room and admin rooms over Socket.IO
                    socket.emit('alert:user_geofence_breach', alert);
                    socket.emit('alert:geofence_breach', alert);
                } else if (topic === 'alerts.anomaly.detected') {
                    socket.emit('alert:user_anomaly', alert);
                    socket.emit('alert:geofence_breach', alert);
                }
            } catch (err) {
                console.error('❌ Error processing Kafka alert message:', err);
            }
        }
    });
}

if (require.main === module) {
    runDispatcher().catch(console.error);
}
