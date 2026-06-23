import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "5mb" }));

let aiClient: GoogleGenAI | null = null;
function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is not defined. Please add it in Settings > Secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Helper to call Gemini with robust exponential retries and fallback models to prevent 503 UNAVAILABLE errors
async function generateWithFallbackAndRetry(ai: any, params: any): Promise<any> {
  const models = ["gemini-3.5-flash", "gemini-3.1-flash-lite"];
  let lastError: any = null;

  for (const model of models) {
    const attemptParams = { ...params, model };
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[AI] Querying model=${model} (Attempt ${attempt}/${maxRetries})`);
        const response = await ai.models.generateContent(attemptParams);
        return response;
      } catch (err: any) {
        lastError = err;
        const errMsg = String(err?.message || err);
        console.warn(`[AI] Error on model=${model}, attempt=${attempt}:`, errMsg);

        // If it's a validation error, billing issue, or invalid API key, don't keep retrying this model
        if (
          errMsg.includes("400") || 
          errMsg.includes("403") || 
          errMsg.includes("API key") || 
          errMsg.includes("INVALID_ARGUMENT")
        ) {
          break;
        }

        // Wait with exponential backoff on transient errors (e.g. 503)
        if (attempt < maxRetries) {
          const delay = attempt * 1200;
          console.warn(`[AI] Transient load error detected. Retrying model in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }
    console.warn(`[AI] Model=${model} failed after retries. Trying next fallback model...`);
  }

  throw lastError || new Error("Failed to generate content after applying all fallback models and retries.");
}

// REST Endpoint to optimize and analyze resume mapping
app.post("/api/analyze", async (req, res) => {
  try {
    const { resumeText, jobDescription } = req.body;

    if (!resumeText || !resumeText.trim()) {
      return res.status(400).json({ error: "Resume text is required for analysis." });
    }
    if (!jobDescription || !jobDescription.trim()) {
      return res.status(400).json({ error: "Job description is required for analysis." });
    }

    const ai = getAiClient();

    const systemInstruction = `You are an expert, seasoned technical recruiter and hiring consultant.
Analyze the provided Resume Text against the Job Description. Your report must look like a high-end senior headhunter's evaluation document: objective, highly specific, constructive, and written in a purely human, professional voice without any emojis.

CORE DIRECTIVES:
1. DOMAIN MISMATCH PROTECTION:
   If the resume and job description belong to completely different roles or domains (e.g., Software Engineer vs Graphic Designer, or Bank Manager vs Software Engineer, or Chef vs Accountant, or SDE vs General Manager):
   - You MUST categorize 'alignment.status' as "Weak Alignment".
   - Under 'alignment.explanation', explicitly note the domain / role mismatch in detail, stating clearly how the resume domain does not match the target job's domain. Explain that there is a domain mismatch (e.g., 'Your resume highlights comprehensive software engineering expertise, whereas the job description requires a bank manager/graphic designer role. There are little to no structural overlaps').
   - In 'missingSkills', extract only the primary technical tools or core professional skills belonging to the job description that the candidate is missing (e.g., Photoshop, Illustrator, Portfolio Management, Credit Analysis, or Graphic Design). Do NOT output empty lists or state that no gaps exist when domains mismatch.

2. TECHNICAL SKILLS ONLY (NO JUNK TERMS):
   - Do NOT suggest generic words as missing skills (avoid: "candidate", "clean", "build", "services", "frameworks", "experiences", "bachelor", "degree", "years", "work", "responsibilities", "competencies").
   - Suggestions MUST come from a known list of technical, methodology, or professional tools/skills (e.g. Python, AWS, React, Agile, Figma, Photoshop, Excel, SQL, Salesforce, credit analysis, financial modeling, etc.).
   - No junk bigrams (e.g., no "python aws" or "bachelor s" or "scrum candidate" as a single skill tag). Identify 'Python' or 'AWS' or 'Scrum' as standalone skills.

3. GROUPED RECOMMENDATIONS:
   - Merge related terms from the job description into a single consolidated skill recommendation.
   - Example A: If "aws", "aws cloud", "aws services" are in the job description but missing, consolidate them into a single item:
     * skill: "AWS"
     * groupTerms: "aws, aws cloud, aws services"
     * actionableRecommendation: "Add AWS and cloud services experience"
   - Example B: If "agile", "agile methodologies", "scrum", "agile lifecycle" are missing or needed:
     * skill: "Agile Development"
     * groupTerms: "agile, agile methodologies, scrum"
     * actionableRecommendation: "Add Agile development experience"
   - Apply this grouping logic for Python, JavaScript, DevOps, Data, Figma, Photoshop, Office, UI/UX, financial planning, etc.

4. SEVERITY & PRIORITY:
   - High priority is strictly reserved for core, fundamental technical skills missing from the resume that are crucial in the job description. Medium priority is for secondary/supporting tools or methodologies.
   - Never output emojis anywhere in your response. Maintain a formal, human, clean, and direct voice.

5. FORMATTING & REPORT DETAIL:
   - Under 'detailedReport', give rich, detailed descriptions for what needs to be fixed. Don't write generic bullet points. Write highly specific, personalized commentary based on the mismatch or the structural layout gaps found. Give a clear verdict.`;

    const promptText = `
RESUME TEXT:
"""
${resumeText}
"""

JOB DESCRIPTION:
"""
${jobDescription}
"""

Provide a perfect optimization analysis matching the specified responseSchema. Ensure there are absolutely NO emojis anywhere in your text fields.
`;

    const response = await generateWithFallbackAndRetry(ai, {
      contents: promptText,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            alignment: {
              type: Type.OBJECT,
              properties: {
                status: { 
                  type: Type.STRING, 
                  description: "Choose one: 'Strong Alignment', 'Partial Alignment', or 'Weak Alignment'" 
                },
                explanation: { 
                  type: Type.STRING, 
                  description: "A detailed human-written explanation comparing the resume domain/roles to the job description domain/roles. Highlight any clear mismatch." 
                }
              },
              required: ["status", "explanation"]
            },
            missingSkills: {
              type: Type.ARRAY,
              description: "List of real technical skills or job requirements missing in the resume. Filter out generic terms, and group related items.",
              items: {
                type: Type.OBJECT,
                properties: {
                  skill: { 
                    type: Type.STRING, 
                    description: "The name of the real skill (e.g., Python, AWS, Figma, financial modeling)" 
                  },
                  groupTerms: { 
                    type: Type.STRING, 
                    description: "A comma-separated string of the technical synonyms/phrases merged together (e.g., 'aws, aws cloud, aws services')" 
                  },
                  priority: { 
                    type: Type.STRING, 
                    description: "Choose either 'High' or 'Medium'" 
                  },
                  actionableRecommendation: { 
                    type: Type.STRING, 
                    description: "Explicit, concrete instruction explaining how the resume should be updated to address this exact gap." 
                  }
                },
                required: ["skill", "groupTerms", "priority", "actionableRecommendation"]
              }
            },
            detailedReport: {
              type: Type.OBJECT,
              properties: {
                formattingAndStructure: { 
                  type: Type.STRING, 
                  description: "A highly detailed, professional analysis of resume formatting, layout, structure, or content hierarchy flaws, with exact recommended changes." 
                },
                experienceGaps: { 
                  type: Type.STRING, 
                  description: "A deep explanation of specific gaps in bullet-point descriptions, seniority, project scope, or responsibilities, explaining how to align them with the JD." 
                },
                overallVerdict: { 
                  type: Type.STRING, 
                  description: "A comprehensive senior recruiting verdict summing up the candidate's strategic steps forward to successfully qualify for or pivot towards this role." 
                }
              },
              required: ["formattingAndStructure", "experienceGaps", "overallVerdict"]
            }
          },
          required: ["alignment", "missingSkills", "detailedReport"]
        }
      }
    });

    const textOutput = response.text;
    if (!textOutput) {
      throw new Error("No response returned from the AI model.");
    }

    const parsedResult = JSON.parse(textOutput.trim());
    return res.json(parsedResult);

  } catch (error: any) {
    console.error("AI Analysis Error:", error);
    return res.status(500).json({ 
      error: error?.message || "An unexpected error occurred during the resume analysis. Ensure the Gemini API key is valid." 
    });
  }
});

// Setup Vite Dev Server / Serve Static Frontend Assets
async function initializeServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] Running at http://localhost:${PORT}`);
  });
}

initializeServer();
