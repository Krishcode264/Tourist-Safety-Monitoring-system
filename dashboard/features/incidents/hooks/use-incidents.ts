import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { incidentService } from "../services/incident.service";

export const useIncidents = () => {
    return useQuery({
        queryKey: ['incidents-list'],
        queryFn: incidentService.getIncidents,
    });
};

export const useIncidentDetail = (id: string) => {
    return useQuery({
        queryKey: ['incident-detail', id],
        queryFn: () => incidentService.getIncidentById(id),
        enabled: !!id,
    });
};

export const useUpdateIncidentStatus = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, status }: { id: string; status: string }) =>
            incidentService.updateStatus(id, status),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['incidents-list'] });
        },
    });
};

export const useUpdateIncident = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, ...updates }: { id: string } & any) =>
            incidentService.updateIncident(id, updates),
        onSuccess: (data: any) => {
            queryClient.invalidateQueries({ queryKey: ['incidents-list'] });
            queryClient.invalidateQueries({ queryKey: ['incident-detail', data.id] });
        },
    });
};

export const useAssignOfficers = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, officerIds }: { id: string; officerIds: string[] }) =>
            incidentService.assignOfficers(id, officerIds),
        onSuccess: (data: any) => {
            queryClient.invalidateQueries({ queryKey: ['incidents-list'] });
            queryClient.invalidateQueries({ queryKey: ['incident-detail', data.id] });
        },
    });
};

export const useAIAssignOfficers = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => incidentService.aiAssignOfficers(id),
        onSuccess: (_data: any, incidentId: string) => {
            queryClient.invalidateQueries({ queryKey: ['incidents-list'] });
            queryClient.invalidateQueries({ queryKey: ['incident-detail', incidentId] });
        },
    });
};

export const useIncidentMessages = (id: string) => {
    return useQuery({
        queryKey: ['incident-messages', id],
        queryFn: () => incidentService.getIncidentMessages(id),
        enabled: !!id,
        refetchInterval: false,
    });
};
