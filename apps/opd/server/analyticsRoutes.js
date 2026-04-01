import { Router } from "express";
import * as analyticsService from "./analyticsService.js";
import { generatePdf } from "./pdfGenerator.js";

export const analyticsRouter = Router();

/**
 * GET /api/analytics/dashboard-data?date=YYYY-MM-DD&hospitalId=UUID
 * Returns processed analytics data + insights for all 7 infographics.
 */
analyticsRouter.get("/dashboard-data", async (req, res) => {
  try {
    const { date, hospitalId } = req.query;
    const data = await analyticsService.getAnalyticsData(date || null, hospitalId || null);
    res.json(data);
  } catch (err) {
    console.error("Analytics dashboard-data error:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/analytics/generate-pdf?date=YYYY-MM-DD&hospitalId=UUID
 * Generates a multi-page PDF analytics report and streams it back.
 */
analyticsRouter.get("/generate-pdf", async (req, res) => {
  try {
    const { date, hospitalId } = req.query;
    const data = await analyticsService.getAnalyticsData(date || null, hospitalId || null);
    const pdfBuffer = await generatePdf(data);

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="opd-analytics-${data.date}.pdf"`,
      "Content-Length": pdfBuffer.length,
    });
    res.send(pdfBuffer);
  } catch (err) {
    console.error("Analytics generate-pdf error:", err);
    res.status(500).json({ error: err.message });
  }
});
