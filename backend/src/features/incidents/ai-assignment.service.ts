import OpenAI from 'openai';
import { prisma } from '../../shared/db/client';
import { IncidentService } from './incident.service';

// ─────────────────────────────────────────────────────────────────────────────
// Client — OpenAI SDK pointed at Google Gemini's OpenAI-compatible endpoint
// ─────────────────────────────────────────────────────────────────────────────
const client = new OpenAI({
    apiKey: process.env.GEMINI_API_KEY || '',
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
});

const MODEL = 'gemini-3.8-flash';

const incidentService = new IncidentService();

// ─────────────────────────────────────────────────────────────────────────────
// Tool definitions — what the AI agent is allowed to call
// ─────────────────────────────────────────────────────────────────────────────
const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
    {
        type: 'function',
        function: {
            name: 'get_available_officers',
            description:
                'Fetches all officers (role L2 or L1) who are currently online and on duty. ' +
                'Returns a list with their id, name, role, region, isOnline, isOnDuty, and the count of active incidents they are currently handling. ' +
                'Use this FIRST before deciding who to assign.',
            parameters: {
                type: 'object',
                properties: {
                    regionId: {
                        type: 'string',
                        description:
                            'The region ID of the incident. Used to prefer officers in the same region. Pass null to get all officers.',
                    },
                },
                required: [],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'assign_officers_to_incident',
            description:
                'Assigns a list of officers (by their user IDs) to handle the incident. ' +
                'This will update the database and notify the assigned officers via socket. ' +
                'Call this AFTER you have decided which officers are the best fit.',
            parameters: {
                type: 'object',
                properties: {
                    incidentId: {
                        type: 'string',
                        description: 'The ID of the incident to assign officers to.',
                    },
                    officerIds: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Array of user IDs of the officers to assign.',
                    },
                    reasoning: {
                        type: 'string',
                        description:
                            'Brief explanation of why these specific officers were chosen. This will be logged in the audit trail.',
                    },
                },
                required: ['incidentId', 'officerIds', 'reasoning'],
            },
        },
    },
];

// ─────────────────────────────────────────────────────────────────────────────
// Tool implementations — actual database logic
// ─────────────────────────────────────────────────────────────────────────────
async function getAvailableOfficers(regionId?: string) {
    const officers = await prisma.user.findMany({
        where: {
            isOnline: true,
            isOnDuty: true,
            role: { name: { in: ['L1', 'L2'] } },
        },
        include: {
            role: true,
            region: { select: { id: true, name: true } },
            assignedIncidents: {
                where: { status: 'ACTIVE' },
                select: { id: true },
            },
        },
    });

    return officers.map((o) => ({
        id: o.id,
        fullName: o.fullName || o.username,
        username: o.username,
        role: o.role.name,
        regionId: o.regionId,
        regionName: o.region?.name || 'Unknown',
        isOnline: o.isOnline,
        isOnDuty: o.isOnDuty,
        activeIncidentCount: o.assignedIncidents.length,
        sameRegion: regionId ? o.regionId === regionId : false,
    }));
}

async function assignOfficersToIncident(
    incidentId: string,
    officerIds: string[],
    reasoning: string
) {
    // Use the existing service method — no duplication
    const result = await incidentService.assignOfficers(incidentId, officerIds);

    // Log the AI-specific reasoning in the audit trail
    await prisma.incidentAction.create({
        data: {
            incidentId,
            actionType: 'AI_ASSIGNMENT',
            details: `AI Agent Reasoning: ${reasoning}`,
        },
    });

    return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// The AI Agent — agentic loop with tool calling
// ─────────────────────────────────────────────────────────────────────────────
export interface AIAssignmentResult {
    success: boolean;
    assignedOfficerIds: string[];
    reasoning: string;
    error?: string;
}

export async function runAIAssignmentAgent(incidentId: string): Promise<AIAssignmentResult> {
    const incident = await incidentService.getIncidentById(incidentId);
    if (!incident) throw new Error(`Incident ${incidentId} not found`);

    const systemPrompt = `You are an intelligent officer dispatch AI for a Tourist Safety Monitoring System.
Your job is to automatically assign the most suitable available officers to handle a reported incident.

DECISION RULES (follow in priority order):
1. Always call get_available_officers first to see who is available.
2. Prefer officers in the SAME region as the incident (sameRegion: true).
3. Prefer officers with FEWER active incidents (lower activeIncidentCount = less busy).
4. Severity-based officer count:
   - CRITICAL: assign 2–3 officers
   - WARNING or HIGH: assign 1–2 officers  
   - INFO or LOW: assign 1 officer
5. If no officers are available, call assign_officers_to_incident with an empty array and explain why.
6. Always call assign_officers_to_incident at the end — even if no one is available.
7. Provide clear reasoning for your decision.

You MUST complete the assignment by calling assign_officers_to_incident. Do not stop without calling it.`;

    const userMessage = `A new incident has been reported. Please assign appropriate officers.

INCIDENT DETAILS:
- ID: ${incident.id}
- Type: ${incident.type}
- Severity: ${incident.severity}
- Status: ${incident.status}
- Region: ${(incident as any).region?.name || 'Unknown'} (ID: ${incident.regionId || 'N/A'})
- Description: ${incident.description || 'No description provided'}
- Reported At: ${incident.createdAt}

Please fetch available officers and assign the best candidates to handle this incident.`;

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
    ];

    let assignedOfficerIds: string[] = [];
    let reasoning = '';
    let iterations = 0;
    const MAX_ITERATIONS = 5; // Safety cap to prevent infinite loops

    console.log(`🤖 AI Agent starting for incident ${incidentId}...`);

    // ── Agentic loop ──
    while (iterations < MAX_ITERATIONS) {
        iterations++;

        const response = await client.chat.completions.create({
            model: MODEL,
            messages,
            tools,
            tool_choice: 'auto',
        });

        const choice = response.choices[0];
        messages.push(choice.message); // Add agent's reply to history

        console.log(`🤖 Agent turn ${iterations} — finish_reason: ${choice.finish_reason}`);

        // Agent is done thinking and has no more tool calls
        if (choice.finish_reason === 'stop') {
            console.log(`✅ Agent finished. Assigned officers: [${assignedOfficerIds.join(', ')}]`);
            break;
        }

        // Agent wants to call tools
        if (choice.finish_reason === 'tool_calls' && choice.message.tool_calls) {
            for (const toolCall of choice.message.tool_calls) {
                // Only handle function-type tool calls
                if (toolCall.type !== 'function') continue;

                const args = JSON.parse(toolCall.function.arguments);
                let toolResult: any;

                console.log(`🔧 Agent calling tool: ${toolCall.function.name}`, args);

                if (toolCall.function.name === 'get_available_officers') {
                    toolResult = await getAvailableOfficers(args.regionId);
                    console.log(`   → Found ${toolResult.length} available officers`);
                } else if (toolCall.function.name === 'assign_officers_to_incident') {
                    toolResult = await assignOfficersToIncident(
                        args.incidentId,
                        args.officerIds,
                        args.reasoning
                    );
                    // Capture results for the return value
                    assignedOfficerIds = args.officerIds;
                    reasoning = args.reasoning;
                    console.log(`   → Assigned ${args.officerIds.length} officers`);
                } else {
                    toolResult = { error: 'Unknown tool called' };
                }

                // Feed tool result back to agent
                messages.push({
                    role: 'tool',
                    tool_call_id: toolCall.id,
                    content: JSON.stringify(toolResult),
                });
            }
        }
    }

    return {
        success: true,
        assignedOfficerIds,
        reasoning,
    };
}
