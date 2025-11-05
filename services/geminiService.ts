import { GoogleGenAI, Type } from "@google/genai";
import { DailyPlan, Task } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

interface PlanOptions {
    dayType: 'Productive' | 'Lazy' | 'Creative' | 'Reset';
    focusTasks: string;
    startTime?: string;
    endTime?: string;
    workPattern: string; // e.g., "50 min work, 10 min break"
    preferredMode: 'Timeflow' | 'Quota';
    unit: 'minutes' | 'pomodoros';
    learnedDurations?: string;
    environments: { id: string, name: string }[];
}

const planSchema = {
    type: Type.OBJECT,
    properties: {
        mode: { type: Type.STRING, enum: ['Timeflow', 'Quota'] },
        unit: { type: Type.STRING, enum: ['minutes', 'pomodoros'] },
        tasks: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    id: { type: Type.STRING },
                    text: { type: Type.STRING },
                    duration: { type: Type.INTEGER, description: "The total time in minutes OR number of pomodoros allocated for the task." },
                    plannedStartTime: { type: Type.STRING, description: "The start time in HH:MM format (e.g., '09:00'). Required for Timeflow mode." },
                    environmentId: { type: Type.STRING, description: "The ID of the environment this task belongs to." },
                },
                required: ["id", "text", "duration"],
            },
        },
    },
    required: ["mode", "tasks", "unit"],
};

const parseTaskSchema = {
    type: Type.OBJECT,
    properties: {
        taskText: { type: Type.STRING, description: "The cleaned text of the task, without the environment specifier." },
        environmentId: { type: Type.STRING, description: "The ID of the environment this task belongs to." },
    },
    required: ["taskText", "environmentId"],
};

interface ScheduleOptions {
    tasks: Pick<Task, 'id' | 'text' | 'duration'>[];
    startTime: string;
    workPattern: string;
}

const timeflowScheduleSchema = {
    type: Type.ARRAY,
    description: "An array of tasks with their newly assigned start times.",
    items: {
        type: Type.OBJECT,
        properties: {
            id: { type: Type.STRING, description: "The original ID of the task." },
            plannedStartTime: { type: Type.STRING, description: "The calculated start time in HH:MM format." },
        },
        required: ["id", "plannedStartTime"],
    },
};

export const generateTimeflowSchedule = async (options: ScheduleOptions): Promise<{id: string, plannedStartTime: string}[] | null> => {
    const { tasks, startTime, workPattern } = options;

    const taskList = tasks.map(t => `- Task: "${t.text}" (ID: ${t.id}, Duration: ${t.duration} minutes)`).join('\n');

    const prompt = `
        You are Skylar, an expert productivity assistant. Your goal is to create a Timeflow schedule for a user's existing list of tasks, starting from a specific time.

        User's request:
        - Schedule the following tasks:
        ${taskList}
        - The schedule must begin at or after: ${startTime}
        - The user's preferred work pattern is: ${workPattern}. Please insert breaks between tasks accordingly.
        
        Instructions:
        1.  Create a realistic schedule for all the tasks provided.
        2.  Assign a 'plannedStartTime' in HH:MM format for each task.
        3.  Respect the task durations and insert breaks based on the work pattern.
        4.  Return ONLY a JSON object containing a 'tasks' array. Each object in the array must contain the original 'id' of the task and its new 'plannedStartTime'.
    `;
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        tasks: timeflowScheduleSchema
                    },
                    required: ['tasks']
                },
            },
        });
        
        const jsonText = response.text;
        const result = JSON.parse(jsonText) as { tasks: {id: string, plannedStartTime: string}[] };
        return result.tasks;

    } catch (error) {
        console.error("Error generating timeflow schedule with Gemini:", error);
        return null;
    }
};

export const parseTaskAndAssignEnvironment = async (
    taskString: string,
    environments: { id: string, name: string }[]
): Promise<{ taskText: string; environmentId: string } | null> => {
    
    const environmentList = environments.map(e => `- ${e.name} (id: ${e.id})`).join('\n');

    const prompt = `
        You are an intelligent task parser. Your job is to analyze a task string and assign it to the correct environment.

        Here are the available environments:
        ${environmentList}

        Task string to analyze: "${taskString}"

        Instructions:
        1.  First, check if the task string contains an environment specified in parentheses, like "Task A (Environment Name)".
        2.  If it does, and the environment name matches one from the list, extract the clean task text ("Task A") and use the corresponding environment ID.
        3.  If no environment is specified, you MUST INFER the most logical environment for the task based on its content. For example, 'study for exam' likely belongs to 'Academics', and 'go for a run' belongs to 'Health'.
        4.  Return a JSON object with the 'taskText' (the task itself, cleaned of any environment specifier) and the 'environmentId' you've determined.
        5.  If you cannot determine an environment, assign it to the first one in the list as a default. The user can move it later.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: parseTaskSchema,
            },
        });
        
        const jsonText = response.text;
        return JSON.parse(jsonText) as { taskText: string; environmentId: string };

    } catch (error) {
        console.error("Error parsing task with Gemini:", error);
        // Fallback for safety: assign to first environment
        const taskText = taskString.replace(/\s*\([^)]+\)$/, '').trim();
        const fallbackId = environments[0]?.id;
        if (!fallbackId) return null;
        return { taskText, environmentId: fallbackId };
    }
};


export const generateDailyPlan = async (options: PlanOptions): Promise<DailyPlan | null> => {
    const { dayType, focusTasks, startTime, endTime, workPattern, preferredMode, unit, learnedDurations, environments } = options;
    
    const learningContext = learnedDurations
    ? `\nHere is what you've learned about the user's habits. Use this as a strong guide for durations:
    ${learnedDurations}`
    : '';

    const environmentList = environments.map(e => `- ${e.name} (id: ${e.id})`).join('\n');

    const durationInstruction = unit === 'pomodoros'
        ? "Assign a 'duration' for each task, representing the number of 25-minute Pomodoro sessions required. Be realistic."
        : "Assign a 'duration' for each task, representing the total estimated time in minutes.";

    const prompt = `
        You are Skylar, an expert productivity assistant. Your goal is to create a realistic and motivating daily plan for a user.

        Here are the user's available environments. You will assign every task to one of these:
        ${environmentList}

        User's request:
        - Day Type: ${dayType}
        - Main Focus: ${focusTasks}
        - Preferred Mode: ${preferredMode}
        - Preferred Unit: ${unit}
        - Preferred Work Pattern: ${workPattern}
        ${startTime ? `- Available Start Time: ${startTime}` : ''}
        ${endTime ? `- Available End Time: ${endTime}` : ''}
        ${learningContext}
        
        Instructions:
        1.  Analyze the user's focus tasks. The user may specify an environment for a task in parentheses, like "Task A (Academics)".
        2.  For each task you generate, you MUST assign it to one of the user's available environments by setting its 'environmentId' property to the correct ID.
        3.  If the user specifies a valid environment for a task in their focus list, use the corresponding ID from the list above.
        4.  If the user does NOT specify an environment for a task, you MUST INFER the most logical environment for the task from the available list based on the task's content.
        5.  Break down the main focus areas into smaller, actionable tasks.
        6.  ${durationInstruction}
        7.  Create a plan in the user's preferred mode ('${preferredMode}') and with the unit '${unit}'.
        8.  If Timeflow mode, generate a schedule with specific start times for each task and break. Distribute tasks logically. The duration must be in minutes.
        9.  If the user has provided learned habits, prioritize those durations.
        10. Incorporate the user's work/break pattern.
        11. Ensure all tasks in the response have a unique ID (e.g., "task-1").
        12. For Timeflow, you MUST provide a 'plannedStartTime' for each task.
        13. Return the plan as a JSON object matching the provided schema. Do not include tasks that are breaks. Every task object must have an 'environmentId'. The top-level 'unit' property in the JSON must be set to '${unit}'.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: planSchema,
            },
        });
        
        const jsonText = response.text;
        const generatedPlan = JSON.parse(jsonText) as Omit<DailyPlan, 'date'>;

        // Add default values and ensure data integrity
        const planTasks: Task[] = generatedPlan.tasks.map(task => ({
            ...task,
            completed: false,
            subtasks: [],
            actualDuration: 0,
            actualPomodoros: 0,
        }));

        const finalPlan: DailyPlan = {
            ...generatedPlan,
            date: new Date().toISOString().slice(0, 10),
            tasks: planTasks,
        };

        return finalPlan;

    } catch (error) {
        console.error("Error generating daily plan with Gemini:", error);
        return null;
    }
};