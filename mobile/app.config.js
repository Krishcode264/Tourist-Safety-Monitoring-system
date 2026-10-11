export default ({ config }) => ({
  ...config,
  extra: {
    ...config.extra,
    backendUrl: process.env.EXPO_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || 'https://tourist-safety-monitoring-system.onrender.com',
  },
});

