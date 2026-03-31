import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = process.env.REACT_APP_GEMINI_API_KEY;
const genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;

export const generateResponse = async (message) => {
  if (!genAI) {
    return "AI service is unavailable. Configure REACT_APP_GEMINI_API_KEY.";
  }

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash"
    });

    const result = await model.generateContent(message);

    const response = await result.response;

    return response.text();

  } catch (error) {
    console.error("Gemini Error:", error);
    return "AI service temporarily unavailable.";
  }
};