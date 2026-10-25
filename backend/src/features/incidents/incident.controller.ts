import { Router, Request, Response } from 'express';
import { IncidentService } from './incident.service';
import { runAIAssignmentAgent } from './ai-assignment.service';

const router = Router();
const incidentService = new IncidentService();

// Helper to get userId from header or fallback
const getUserId = (req: Request) => {
    return (req.headers['x-user-id'] as string) || (req.query.userId as string) || '0282ddf2-e676-492d-a89c-89fd57ace2a9';
};

// GET /api/incidents
router.get('/', async (req: Request, res: Response) => {
    try {
        const userId = getUserId(req);
        const data = await incidentService.getAllIncidents(userId);
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch incidents' });
    }
});

// GET /api/incidents/tourist/:id
router.get('/tourist/:id', async (req: Request, res: Response) => {
    try {
        const data = await incidentService.getIncidentsByTourist(req.params.id as string);
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch tourist incidents' });
    }
});

// GET /api/incidents/:id
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const data = await incidentService.getIncidentById(req.params.id as string);
        if (!data) return res.status(404).json({ success: false, message: 'Incident not found' });
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch incident' });
    }
});

// GET /api/incidents/:id/messages
router.get('/:id/messages', async (req: Request, res: Response) => {
    try {
        const data = await incidentService.getIncidentMessages(req.params.id as string);
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch messages' });
    }
});

// POST /api/incidents
router.post('/', async (req: Request, res: Response) => {
    try {
        const data = await incidentService.createIncident(req.body);
        res.status(201).json({ success: true, data });
    } catch (error) {
        console.error('Failed to create incident:', error);
        res.status(500).json({ success: false, message: 'Failed to create incident' });
    }
});


// PATCH /api/incidents/:id
router.patch('/:id', async (req: Request, res: Response) => {
    try {
        const { status } = req.body;
        const data = await incidentService.updateIncidentStatus(req.params.id as string, status);
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to update incident status' });
    }
});

// PUT /api/incidents/:id (Update details)
router.put('/:id', async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const data = await incidentService.updateIncident(id, req.body);
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to update incident' });
    }
});

// POST /api/incidents/:id/assign
router.post('/:id/assign', async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const { officerIds } = req.body;
        const data = await incidentService.assignOfficers(id, officerIds);
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to assign officers' });
    }
});

// POST /api/incidents/:id/ai-assign  — AI-powered automatic officer assignment
router.post('/:id/ai-assign', async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;

        if (!process.env.GEMINI_API_KEY) {
            return res.status(503).json({
                success: false,
                message: 'AI assignment is not configured. GEMINI_API_KEY is missing.'
            });
        }

        console.log(`🤖 AI auto-assignment triggered for incident ${id}`);
        const result = await runAIAssignmentAgent(id);

        res.json({
            success: true,
            data: {
                assignedOfficerIds: result.assignedOfficerIds,
                reasoning: result.reasoning,
                message: result.assignedOfficerIds.length > 0
                    ? `AI assigned ${result.assignedOfficerIds.length} officer(s) successfully`
                    : 'AI found no available officers to assign'
            }
        });
    } catch (error: any) {
        console.error('AI assignment error:', error?.message || error);
        res.status(500).json({ success: false, message: 'AI assignment failed. Please assign manually.' });
    }
});

export default router;
