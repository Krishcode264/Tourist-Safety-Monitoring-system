import { prisma } from '../../shared/db/client';
import { getDescendantRegionIds, getAncestorRegionIds } from '../../shared/utils/region';

export class DashboardService {

  // Section 2A: High-Level Metrics
  async getOverviewStats(userId: string) {
    let user;
    try {
      user = await prisma.user.findUniqueOrThrow({
        where: { id: userId },
        include: { region: true }
      });
    } catch (error) {
      user = await prisma.user.findFirstOrThrow({
        where: { role: { name: 'L4' } },
        include: { region: true }
      });
    }

    if (!user.regionId) {
      throw new Error("User region not found");
    }

    const regionIds = await getDescendantRegionIds(user.regionId);

    // ── Single query to get all incidents with their first admin message ──────
    const allIncidents = await prisma.incident.findMany({
      where: { regionId: { in: regionIds } },
      include: {
        messages: {
          where: { senderRole: 'admin' },
          orderBy: { timestamp: 'asc' },
          take: 1,        // only the FIRST admin message per incident
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    // ── Active incidents (OPEN or RESPONDING only) ────────────────────────────
    const activeIncidentCount = allIncidents.filter(
      (i) => i.status === 'OPEN' || i.status === 'RESPONDING'
    ).length;

    const totalIncidents = allIncidents.length;

    // ── Response Rate ─────────────────────────────────────────────────────────
    // An incident is "responded to" if:
    //   - an admin sent at least one message, OR
    //   - it has been resolved/dispatched (RESPONDING / RESOLVED)
    const respondedCount = allIncidents.filter(
      (i) => i.messages.length > 0 || i.status === 'RESOLVED' || i.status === 'RESPONDING'
    ).length;

    const responseRateValue =
      totalIncidents > 0 ? Math.round((respondedCount / totalIncidents) * 100) : 100;

    const responseRateLabel =
      responseRateValue === 100 ? 'Optimal' :
      responseRateValue >= 80  ? 'Good'    :
      responseRateValue >= 60  ? 'Fair'    : 'Needs Attention';

    // ── Avg Response Time ─────────────────────────────────────────────────────
    // Only include incidents that actually have an admin reply
    const responseTimes = allIncidents
      .filter((i) => i.messages.length > 0)
      .map((i) => {
        const firstAdminMsg = i.messages[0].timestamp.getTime();
        const incidentCreated = i.createdAt.getTime();
        return (firstAdminMsg - incidentCreated) / 60_000; // minutes
      })
      .filter((t) => t >= 0); // guard against bad data (clock skew etc.)

    const avgResponseMins =
      responseTimes.length > 0
        ? Math.round(
            responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
          )
        : null;

    // Human-readable: "4m" / "1h 12m" / "--"
    const avgResponseLabel =
      avgResponseMins === null  ? null :
      avgResponseMins < 60      ? `${avgResponseMins}m` :
      `${Math.floor(avgResponseMins / 60)}h ${avgResponseMins % 60}m`;

    // ── Officers online & tourists monitored ──────────────────────────────────
    const [officerCount, touristCount, liveTrips] = await Promise.all([
      prisma.user.count({
        where: { regionId: { in: regionIds }, isOnline: true },
      }),
      prisma.tourist.count({
        where: { trips: { some: { isActive: true } } },
      }),
      prisma.trip.findMany({
        where: {
          isActive: true,
          tourist: {
            incidents: { some: { regionId: { in: regionIds } } },
          },
        },
        include: { tourist: true },
      }),
    ]);

    return {
      regionName: user.region?.name || 'Global',
      regionId: user.region?.id,
      regionGeometry: user.region?.geometry,

      activeIncidents: {
        count: activeIncidentCount,
        total: totalIncidents,
        delta: 0,
        trend: 'neutral',
      },

      officersOnline: {
        count: officerCount,
        delta: 0,
        details: { onDuty: officerCount, offDuty: 0 },
      },

      touristsMonitored: {
        count: touristCount,
        delta: 0,
      },

      // ✅ Real response rate
      responseRate: {
        value: responseRateValue,
        label: responseRateLabel,
        respondedCount,
        total: totalIncidents,
      },

      // ✅ Real avg response time
      avgResponseTime: {
        minutes: avgResponseMins,
        label: avgResponseLabel,
        sampleSize: responseTimes.length,
      },

      liveTourists: liveTrips.map((trip: any) => ({
        id: trip.tourist.id,
        name: trip.tourist.fullName,
        lat: trip.currentLat,
        lng: trip.currentLng,
        lastUpdate: trip.lastUpdate,
      })),
    };
  }

  // Section 2B: Recent Incidents Feed
  async getRecentIncidents(userId: string, limit: number = 5) {
    let user;
    try {
      user = await prisma.user.findUniqueOrThrow({
        where: { id: userId },
        include: { region: true }
      });
    } catch (error) {
      user = await prisma.user.findFirstOrThrow({
        where: { role: { name: 'L4' } },
        include: { region: true }
      });
    }

    if (!user.regionId) return [];

    const regionIds = await getDescendantRegionIds(user.regionId);

    const incidents = await prisma.incident.findMany({
      where: { regionId: { in: regionIds } },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { region: true, tourist: true }
    });

    return incidents.map((inc: any) => ({
      id: inc.id,
      type: inc.type,
      severity: inc.severity,
      status: inc.status,
      locationMsg: inc.region?.name || 'Unknown',
      coordinates: { lat: inc.latitude || 0, lng: inc.longitude || 0 },
      timeSinceReported: 'Now',
      assignedOfficers: 0
    }));
  }

  // Section 2C: Zone Status
  async getZoneStatus(userId: string) {
    let user;
    try {
      user = await prisma.user.findUniqueOrThrow({
        where: { id: userId },
        include: { region: true }
      });
    } catch (error) {
      user = await prisma.user.findFirstOrThrow({
        where: { role: { name: 'L4' } },
        include: { region: true }
      });
    }

    if (!user.regionId) return [];

    const children = await prisma.region.findMany({
      where: { parentId: user.regionId },
      include: {
        incidents: {
          where: { status: 'OPEN' },
          select: { severity: true }
        }
      }
    });

    const summary = { allClear: 0, underWatch: 0, activeAlert: 0, critical: 0 };

    children.forEach((child: any) => {
      const openIncidents = child.incidents;
      if (openIncidents.length === 0) {
        summary.allClear++;
      } else {
        const hasCritical = openIncidents.some((inc: any) => inc.severity === 'CRITICAL');
        const hasWarning  = openIncidents.some((inc: any) => inc.severity === 'WARNING' || inc.severity === 'ALERT');
        if (hasCritical)     summary.critical++;
        else if (hasWarning) summary.activeAlert++;
        else                 summary.underWatch++;
      }
    });

    return [
      { label: "All Clear",    value: summary.allClear,    status: 'stable'   },
      { label: "Under Watch",  value: summary.underWatch,  status: 'warning'  },
      { label: "Active Alert", value: summary.activeAlert, status: 'danger'   },
      { label: "Critical",     value: summary.critical,    status: 'critical' },
    ];
  }
}
