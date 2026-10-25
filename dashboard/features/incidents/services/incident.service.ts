import api from "@/lib/api";
import { Incident } from "../types";

export const incidentService = {
    getIncidents: async (): Promise<Incident[]> => {
        const res = await api.get('/incidents');
        return res.data.data;
    },
    getIncidentById: async (id: string): Promise<Incident> => {
        const res = await api.get(`/incidents/${id}`);
        return res.data.data;
    },
    updateStatus: async (id: string, status: string): Promise<Incident> => {
        const res = await api.patch(`/incidents/${id}`, { status });
        return res.data.data;
    },
    updateIncident: async (id: string, updates: any): Promise<Incident> => {
        const res = await api.put(`/incidents/${id}`, updates);
        return res.data.data;
    },
    assignOfficers: async (id: string, officerIds: string[]): Promise<Incident> => {
        const res = await api.post(`/incidents/${id}/assign`, { officerIds });
        return res.data.data;
    },
    aiAssignOfficers: async (id: string): Promise<{ assignedOfficerIds: string[]; reasoning: string; message: string }> => {
        const res = await api.post(`/incidents/${id}/ai-assign`);
        return res.data.data;
    },
    getIncidentMessages: async (id: string): Promise<any[]> => {
        const res = await api.get(`/incidents/${id}/messages`);
        return res.data.data;
    }
};
