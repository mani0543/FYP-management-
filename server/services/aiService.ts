import { GoogleGenAI, Type } from '@google/genai';
import { db } from '../config/db.js';
import { AIAnalysisResult } from '../models/types.js';

let aiClient: GoogleGenAI | null = null;

function getAIClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

export async function analyzeProposalSimilarity(proposal: {
  title: string;
  description: string;
  problemStatement: string;
  objectives: string;
  methodology: string;
  technologies: string;
}): Promise<AIAnalysisResult> {
  const previousProjects = await db.PreviousProjects.find();

  const formattedArchives = previousProjects.map((p, idx) => ({
    id: idx + 1,
    title: p.title,
    batch: p.batchName,
    description: p.description,
    problem: p.problemStatement,
    methodology: p.methodology,
    technologies: Array.isArray(p.technologies) ? p.technologies.join(', ') : p.technologies,
  }));

  const ai = getAIClient();

  if (ai) {
    try {
      const prompt = `
You are the Academic FYP Evaluation and Plagiarism/Originality Engine for a Computer Science Department.
Evaluate the following student proposal for similarity and novelty against the archive of previously completed university FYP projects.

STUDENT PROPOSAL:
- Title: ${proposal.title}
- Description: ${proposal.description}
- Problem Statement: ${proposal.problemStatement}
- Objectives: ${proposal.objectives}
- Methodology: ${proposal.methodology}
- Technologies: ${proposal.technologies}

ARCHIVE OF PREVIOUSLY COMPLETED PROJECTS:
${JSON.stringify(formattedArchives, null, 2)}

TASK:
1. Compare title, core concept, problem, objectives, features, methodology, and tech stack.
2. Determine similarity percentage (0-100%).
3. Classify risk level: LOW (<40%), MEDIUM (40-69%), HIGH (>=70%).
4. List titles of similar archive projects if any.
5. Highlight matching areas.
6. Provide an academic reasoning explanation.
7. Provide 2-4 concrete, actionable improvement suggestions for students to differentiate and increase innovation.
8. Set isLikelyDuplicate to true only if similarityScore >= 75%.
`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              similarityScore: {
                type: Type.NUMBER,
                description: 'Calculated similarity percentage between 0 and 100',
              },
              riskLevel: {
                type: Type.STRING,
                description: 'LOW, MEDIUM, or HIGH',
              },
              similarProjects: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Titles of past projects with noticeable overlap',
              },
              matchingAreas: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Specific overlapping areas, e.g., problem domain, methodology, feature set',
              },
              reasoning: {
                type: Type.STRING,
                description: 'Detailed academic evaluation reasoning',
              },
              improvementSuggestions: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Suggestions to make the project novel and distinct',
              },
              isLikelyDuplicate: {
                type: Type.BOOLEAN,
                description: 'True if project lacks sufficient academic novelty compared to past work',
              },
            },
            required: [
              'similarityScore',
              'riskLevel',
              'similarProjects',
              'matchingAreas',
              'reasoning',
              'improvementSuggestions',
              'isLikelyDuplicate',
            ],
          },
        },
      });

      const responseText = response.text?.trim();
      if (responseText) {
        const parsed: AIAnalysisResult = JSON.parse(responseText);
        // Normalize riskLevel
        if (!['LOW', 'MEDIUM', 'HIGH'].includes(parsed.riskLevel)) {
          parsed.riskLevel = parsed.similarityScore >= 70 ? 'HIGH' : parsed.similarityScore >= 40 ? 'MEDIUM' : 'LOW';
        }
        return parsed;
      }
    } catch (err: any) {
      console.warn('Gemini API call failed or timed out, using contextual academic similarity fallback:', err.message);
    }
  }

  // Fallback heuristic comparison against archived projects
  return computeFallbackSimilarity(proposal, previousProjects);
}

function computeFallbackSimilarity(
  proposal: {
    title: string;
    description: string;
    problemStatement: string;
    objectives: string;
    methodology: string;
    technologies: string;
  },
  previousProjects: any[]
): AIAnalysisResult {
  const normalize = (t: string) =>
    (t || '')
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 3);

  const proposalWords = new Set([
    ...normalize(proposal.title),
    ...normalize(proposal.description),
    ...normalize(proposal.problemStatement),
    ...normalize(proposal.methodology),
  ]);

  let maxScore = 15;
  let mostSimilar: any = null;
  const matches: string[] = [];

  for (const prev of previousProjects) {
    const prevWords = new Set([
      ...normalize(prev.title),
      ...normalize(prev.description),
      ...normalize(prev.problemStatement),
      ...normalize(prev.methodology),
    ]);

    let common = 0;
    for (const w of proposalWords) {
      if (prevWords.has(w)) common++;
    }

    const ratio = Math.round((common / Math.max(proposalWords.size, 1)) * 100);
    if (ratio > maxScore) {
      maxScore = Math.min(ratio, 88);
      mostSimilar = prev;
    }
  }

  if (mostSimilar && maxScore >= 40) {
    matches.push(mostSimilar.title);
  }

  const matchingAreas: string[] = [];
  if (mostSimilar) {
    matchingAreas.push('Core domain problem formulation');
    if (maxScore > 50) matchingAreas.push('Methodological approach and architectural pipeline');
  }

  const riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' =
    maxScore >= 70 ? 'HIGH' : maxScore >= 40 ? 'MEDIUM' : 'LOW';

  const improvementSuggestions: string[] = [];
  if (riskLevel === 'HIGH') {
    improvementSuggestions.push('Incorporate specialized real-time telemetry or hybrid edge deployment to distinguish from past work.');
    improvementSuggestions.push('Formulate a unique objective addressing performance under noisy constraints or offline mode.');
    improvementSuggestions.push('Introduce novel comparative benchmarking against standard baseline datasets.');
  } else if (riskLevel === 'MEDIUM') {
    improvementSuggestions.push('Add an advanced validation methodology such as A/B user experiments or stress testing.');
    improvementSuggestions.push('Differentiate the user workflow by integrating autonomous agent dispatch or alerting.');
  } else {
    improvementSuggestions.push('Strong novelty profile. Ensure concrete metrics are defined for the final semester 8 evaluation.');
    improvementSuggestions.push('Document anticipated API boundaries early in the semester 7 proposal document.');
  }

  return {
    similarityScore: maxScore,
    riskLevel,
    similarProjects: matches,
    matchingAreas,
    reasoning: mostSimilar
      ? `Proposal exhibits ${maxScore}% topical overlap with previous FYP "${mostSimilar.title}" (${mostSimilar.batchName}). Differentiating the core algorithms or target user application will enhance academic standing.`
      : 'Original proposal with low overlap against archived departmental projects. Novelty criteria are well met.',
    improvementSuggestions,
    isLikelyDuplicate: maxScore >= 75,
  };
}
