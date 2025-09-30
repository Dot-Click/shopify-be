import { database } from "@/configs/connection.config";
import { customers } from "@/schema/schema";
import { logActivity } from "@/service/logactivity.service";
import { logger } from "@/utils/logger.util";
import { format, subDays } from "date-fns";
import { count, sql } from "drizzle-orm";
import { Request, Response } from "express";
import status from "http-status";
import puppeteer from "puppeteer";

function generateReportHTML(reportData: any) {
  const chartLabels = JSON.stringify(
    reportData.lineGraphData.map((d: any) => format(new Date(d.date), "MMM dd"))
  );
  const chartValues = JSON.stringify(
    reportData.lineGraphData.map((d: any) => d.newCustomers)
  );

  return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Customer Database Growth Report</title>
            <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #333; margin: 40px; }
                .header { border-bottom: 2px solid #eee; padding-bottom: 10px; margin-bottom: 30px; }
                h1 { font-size: 28px; margin: 0; }
                p { font-size: 12px; color: #777; margin: 4px 0 0; }
                .kpi-container { display: flex; justify-content: space-between; gap: 20px; text-align: center; }
                .kpi-tile { flex: 1; background-color: #f8f9fa; padding: 20px; border-radius: 8px; border: 1px solid #e9ecef; }
                .kpi-value { font-size: 36px; font-weight: 600; color: #212529; }
                .kpi-label { font-size: 14px; color: #6c757d; margin-top: 5px; }
                .chart-container { margin-top: 40px; }
                h2 { font-size: 20px; font-weight: 600; margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 10px; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Customer Database Growth Report</h1>
                <p>Generated on: ${format(new Date(), "yyyy-MM-dd")}</p>
            </div>

            <div class="kpi-container">
                <div class="kpi-tile">
                    <div class="kpi-value">${reportData.totalCustomers.toLocaleString()}</div>
                    <div class="kpi-label">Total Customers</div>
                </div>
                <div class="kpi-tile">
                    <div class="kpi-value">${reportData.addedLast30Days.toLocaleString()}</div>
                    <div class="kpi-label">New in 30 Days</div>
                </div>
                <div class="kpi-tile">
                    <div class="kpi-value">${reportData.addedLast90Days.toLocaleString()}</div>
                    <div class="kpi-label">New in 90 Days</div>
                </div>
            </div>

            <div class="chart-container">
                <h2>New Customer Trend (Last 90 Days)</h2>
                <canvas id="growthChart"></canvas>
            </div>

            <script>
                const ctx = document.getElementById('growthChart').getContext('2d');
                new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: ${chartLabels},
                        datasets: [{
                            label: 'New Customers',
                            data: ${chartValues},
                            borderColor: 'rgb(54, 162, 235)',
                            backgroundColor: 'rgba(54, 162, 235, 0.1)',
                            fill: true,
                            tension: 0.2,
                            pointRadius: 2,
                            pointBackgroundColor: 'rgb(54, 162, 235)'
                        }]
                    },
                    options: {
                        scales: { y: { beginAtZero: true, grid: { color: '#f0f0f0' } }, x: { grid: { display: false } } },
                        animation: { duration: 0 },
                        plugins: { legend: { display: false } }
                    }
                });
            </script>
        </body>
        </html>
    `;
}

export const customerReport = async (req: Request, res: Response) => {
  try {
    const today = new Date();
    const date30DaysAgo = subDays(today, 30);
    const date90DaysAgo = subDays(today, 90);


    const user = req.user?.id

    if (!user) {
      res.status(status.BAD_REQUEST).json({ message: "Not a valid user!" })
      logger.error("Not a valid user!")
      return
    }


    const [kpiResults] = await database
      .select({
        totalCustomers: count(),
        addedLast30Days:
          sql`SUM(CASE WHEN ${customers.createdAt} >= ${date30DaysAgo} THEN 1 ELSE 0 END)`.mapWith(
            Number
          ),
        addedLast90Days:
          sql`SUM(CASE WHEN ${customers.createdAt} >= ${date90DaysAgo} THEN 1 ELSE 0 END)`.mapWith(
            Number
          ),
      })
      .from(customers);

    const lineGraphData = await database
      .select({
        date: sql`DATE_TRUNC('day', ${customers.createdAt})`
          .mapWith(String)
          .as("date"),
        newCustomers: count().as("new_customers"),
      })
      .from(customers)
      .where(sql`${customers.createdAt} >= ${date90DaysAgo}`)
      .groupBy(sql`date`)
      .orderBy(sql`date`);

    console.log("Successfully calculated metrics for Customer Growth Report.");

    const htmlContent = generateReportHTML({ ...kpiResults, lineGraphData });

    const browser = await puppeteer.launch({
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1120, height: 900 });
    await page.setContent(htmlContent, { waitUntil: "networkidle0" });

    await new Promise((resolve) => setTimeout(resolve, 500));

    const pdfBuffer = await page.pdf({ format: "A4", printBackground: true });
    await browser.close();

    const fileName = `Customer_Growth_Report_${format(
      new Date(),
      "yyyyMMdd"
    )}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.send(pdfBuffer);

    await logActivity({
      action: "GENERATE_REPORT",
      for: "store",
      storeId: user,
      meta: { timestamp: new Date().toISOString() },
    });

  } catch (error: any) {
    console.error(
      "ERROR: Failed to generate Customer Growth PDF report:",
      error
    );
    res.status(status.INTERNAL_SERVER_ERROR).send({
      message: "Could not generate the report.",
      error: error.message,
    });
  }
};
