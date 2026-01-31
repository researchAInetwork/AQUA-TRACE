import { GoogleGenAI, Type, Modality } from "@google/genai";
import { AnalysisReport, GroundingSource, RiskLevel, ConfidenceLevel } from "../types";

// Helper to convert File to Base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
};

export const decodeBase64 = (base64: string) => {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

export const decodeAudioData = async (
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> => {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
};

async function getGeoLocation(): Promise<{ latitude: number; longitude: number } | null> {
  if (!navigator.geolocation) return null;
  try {
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
    });
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };
  } catch {
    return null;
  }
}

export async function analyzeWaterImage(file: File, context: string): Promise<{ report: AnalysisReport; sources: GroundingSource[] }> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const base64Data = await fileToBase64(file);
  const mimeType = file.type;
  const location = await getGeoLocation();

  const prompt = `
    Act as a senior environmental forensic scientist. Perform a high-resolution analysis of this surface water data.
    ${context ? `Site Metadata: ${context}` : ''}
    
    Examine visual evidence for:
    1. Chemical signatures (oil sheens, iridescent films, inorganic discoloration).
    2. Organic markers (algal blooms, eutrophication foam, suspended solids).
    3. Structural indicators (outfalls, suspicious runoff channels, waste debris).
    
    Provide an informative and descriptive analysis using the structured format below.
    Specifically include a 'Biology Impact Matrix' and a 'Risk Factor Justification'.

    CRITICAL: You must return the analysis as a valid JSON object matching this structure:
    {
      "observedIndicators": ["string"],
      "likelyPollutionCategory": "string",
      "environmentalImpactExplanation": "string",
      "humanHealthImplications": "string",
      "environmentalRiskLevel": "Low" | "Medium" | "High",
      "riskJustification": "string",
      "recommendedImmediateActions": ["string"],
      "confidenceLevel": "Low" | "Moderate" | "High",
      "assessmentLimitations": ["string"]
    }
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: {
      parts: [
        { inlineData: { data: base64Data, mimeType } },
        { text: prompt }
      ]
    },
    config: {
      tools: [
        { googleSearch: {} },
        { googleMaps: {} }
      ],
      ...(location && {
        toolConfig: {
          retrievalConfig: {
            latLng: {
              latitude: location.latitude,
              longitude: location.longitude
            }
          }
        }
      })
    }
  });

  const text = response.text || '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Scientific synthesis failed. Please provide clearer visual data.");
  const report: AnalysisReport = JSON.parse(jsonMatch[0]);
  
  const sources: GroundingSource[] = [];
  const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  for (const chunk of groundingChunks) {
    if (chunk.web) sources.push({ title: chunk.web.title, uri: chunk.web.uri });
    else if (chunk.maps) sources.push({ title: chunk.maps.title, uri: chunk.maps.uri });
  }

  return { report, sources };
}

export async function generateAudioReport(report: AnalysisReport): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `
    Professional Audio Briefing:
    Summarize the environmental findings for a field officer.
    Findings: ${report.likelyPollutionCategory}.
    Risk Index: ${report.environmentalRiskLevel}.
    Key Justification: ${report.riskJustification}.
    Critical Actions: ${report.recommendedImmediateActions.join(', ')}.
    Note: Maintain a formal and informative tone.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) throw new Error("Audio synthesis failed.");
  return base64Audio;
}