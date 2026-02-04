import { database } from "@/configs/connection.config";
import { customers, orders, users } from "@/schema/schema";
import { logActivity } from "@/service/logactivity.service";
import { logger } from "@/utils/logger.util";
import { format, subDays } from "date-fns";
import { count, sql, desc } from "drizzle-orm";
import { Request, Response } from "express";
import status from "http-status";
import puppeteer from "puppeteer";

function generateReportHTML(data: any) {
  const { risk, onboarding, effectiveness } = data;

  // Safely stringify data for embedding in the script tag
  const riskChartLabels = JSON.stringify(
    risk.monthlyFlaggedOrders.map((d: any) =>
      format(new Date(d.month), "MMM yyyy")
    )
  );
  const riskChartValues = JSON.stringify(
    risk.monthlyFlaggedOrders.map((d: any) => d.count)
  );
  const effectivenessChartLabels = JSON.stringify(
    effectiveness.monthlyPreventedLoss.map((d: any) =>
      format(new Date(d.month), "MMM yyyy")
    )
  );
  const effectivenessChartValues = JSON.stringify(
    effectiveness.monthlyPreventedLoss.map((d: any) => d.amount)
  );

  return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>eComProtect Combined Staff Report</title>
            <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #333; margin: 40px; }
                .page { page-break-before: always; }
                .header { text-align: center; border-bottom: 2px solid #eee; padding-bottom: 15px; margin-bottom: 30px; }
                h1 { font-size: 28px; margin: 0; }
                h2 { font-size: 22px; font-weight: 600; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-top: 40px; }
                p.subtitle { font-size: 12px; color: #777; margin-top: 5px; }
                .kpi-container { display: flex; justify-content: space-around; gap: 20px; text-align: center; margin-top: 20px; }
                .kpi-tile { flex: 1; background-color: #f8f9fa; padding: 20px; border-radius: 8px; border: 1px solid #e9ecef; }
                .kpi-value { font-size: 32px; font-weight: 600; }
                .kpi-label { font-size: 13px; color: #6c757d; margin-top: 5px; }
                .grid { display: flex; gap: 30px; margin-top: 20px; }
                .grid-item { flex: 1; }
                table { width: 100%; border-collapse: collapse; font-size: 11px; }
                th, td { border: 1px solid #e0e0e0; padding: 8px; text-align: left; }
                th { background-color: #343a40; color: white; }
                .note { font-size: 10px; color: #888; font-style: italic; margin-top: 15px; }
            </style>
        </head>
        <body>
            <!-- PAGE 1: Network-Wide Risk Trends -->
            <section>
                <div class="header">
                    <h1>Network-Wide Risk Trends</h1>
                    <p class="subtitle">Macro patterns of high-risk behaviour across the network.</p>
                </div>
                <div class="kpi-container" style="justify-content: center;">
                    <div class="kpi-tile">
                        <div class="kpi-value">${risk.totalFlaggedOrders.toLocaleString()}</div>
                        <div class="kpi-label">Total Flagged Orders (All Time)</div>
                    </div>
                </div>
                <div class="grid">
                    <div class="grid-item">
                        <h2>Top 10 High-Risk Email Domains</h2>
                        <table>
                            <thead><tr><th>Rank</th><th>Domain</th><th>Count</th></tr></thead>
                            <tbody>
                                ${risk.topDomains
      .map(
        (d: any, i: any) =>
          `<tr><td>${i + 1}</td><td>${d.domain
          }</td><td>${d.count}</td></tr>`
      )
      .join("")}
                            </tbody>
                        </table>
                    </div>
                    <div class="grid-item">
                        <h2>Flagged Orders Growth (Month-over-Month)</h2>
                        <canvas id="riskTrendChart"></canvas>
                        <p class="note">Note: This chart shows the trend of all newly flagged orders per month.</p>
                    </div>
                </div>
            </section>

            <!-- PAGE 2: Store Onboarding & Status -->
            <section class="page">
                <div class="header">
                    <h1>Store Onboarding & Status</h1>
                    <p class="subtitle">Tracking new store sign-ups and platform growth.</p>
                </div>
                <div class="kpi-container">
                    <div class="kpi-tile"><div class="kpi-value">${onboarding.newStoresLast30Days
    }</div><div class="kpi-label">New Stores (Last 30 Days)</div></div>
                    <div class="kpi-tile"><div class="kpi-value">N/A</div><div class="kpi-label">Stores Pending Activation</div></div>
                    <div class="kpi-tile"><div class="kpi-value">N/A</div><div class="kpi-label">Avg. Activation Time</div></div>
                </div>
                <h2>Total Stores by Plan</h2>
                <table>
                    <thead><tr><th>Plan</th><th>Number of Stores</th></tr></thead>
                    <tbody>
                        ${onboarding.storesByPlan
      .map(
        (p: any) =>
          `<tr><td>${p.plan || "Not Set"}</td><td>${p.count
          }</td></tr>`
      )
      .join("")}
                    </tbody>
                </table>
                <p class="note">Note: "Pending Activation" and "Avg. Activation Time" require schema updates (e.g., an 'activated_at' timestamp) to be calculated.</p>
            </section>

            <!-- PAGE 3: System Effectiveness & Risk Prevention -->
            <section class="page">
                <div class="header">
                    <h1>System Effectiveness & Risk Prevention</h1>
                    <p class="subtitle">Quantifying the value eComProtect provides across the network.</p>
                </div>
                <div class="kpi-container">
                    <div class="kpi-tile"><div class="kpi-value">£${effectiveness.preventedLoss.toLocaleString()}</div><div class="kpi-label">Est. Prevented Loss</div></div>
                    <div class="kpi-tile"><div class="kpi-value">${effectiveness.percentCancelled
    }%</div><div class="kpi-label">% Flagged Orders Cancelled</div></div>
                    <div class="kpi-tile"><div class="kpi-value">N/A</div><div class="kpi-label">% Confirmed Genuine Issues</div></div>
                </div>
                <h2>Monthly Prevented Loss Trend</h2>
                <canvas id="effectivenessChart"></canvas>
                <p class="note">Note: "Prevented Loss" is estimated as the total value of orders that were both flagged and subsequently cancelled. "% Confirmed Genuine Issues" requires a schema update to track dispute outcomes.</p>
            </section>

            <script>
                new Chart('riskTrendChart', {
                    type: 'bar',
                    data: { labels: ${riskChartLabels}, datasets: [{ label: 'Flagged Orders', data: ${riskChartValues}, backgroundColor: 'rgba(255, 99, 132, 0.2)', borderColor: 'rgb(255, 99, 132)' }] },
                    options: { animation: { duration: 0 } }
                });
                new Chart('effectivenessChart', {
                    type: 'line',
                    data: { labels: ${effectivenessChartLabels}, datasets: [{ label: 'Prevented Loss (£)', data: ${effectivenessChartValues}, tension: 0.1, fill: true, borderColor: 'rgb(75, 192, 192)' }] },
                    options: { animation: { duration: 0 } }
                });
            </script>
        </body>
        </html>
    `;
}

export const combinedReport = async (req: Request, res: Response) => {
  try {
    console.log("Request received for Combined Staff Report.");

    const user = req.user?.id

    if (!user) {
      res.status(status.BAD_REQUEST).json({ message: "Not a valid user!" })
      logger.error("Not a valid user!")
      return
    }

    const totalFlaggedOrders = await database
      .select({ value: count() })
      .from(orders)
      .where(sql`${orders.flagged} = true`);
    
      const topDomains = await database
      .select({
        domain:
          sql`SUBSTRING(${customers.email} FROM POSITION('@' IN ${customers.email}) + 1)`.as(
            "domain"
          ),
        count: count().as("count"),
      })
      .from(customers)
      .groupBy(sql`domain`)
      .orderBy(desc(sql`count`))
      .limit(10);
    
      const monthlyFlaggedOrders = await database
      .select({
        month: sql`DATE_TRUNC('month', ${orders.createdAt})`.as("month"),
        count: count().as("count"),
      })
      .from(orders)
      .where(sql`${orders.flagged} = true`)
      .groupBy(sql`month`)
      .orderBy(sql`month`);

    // --- 2. QUERIES FOR REPORT #4: ONBOARDING ---
    const newStoresLast30Days = await database
      .select({ value: count() })
      .from(users)
      .where(sql`${users.createdAt} >= ${subDays(new Date(), 30)}`);
  
      const storesByPlan = await database
      .select({ plan: users.plan, count: count().as("count") })
      .from(users)
      .groupBy(users.plan)
      .orderBy(desc(sql`count`));

    // --- 3. QUERIES FOR REPORT #5: EFFECTIVENESS ---
    const [effectivenessStats] = await database
      .select({
        totalFlagged:
          sql`COUNT(CASE WHEN ${orders.flagged} = true THEN 1 END)`.mapWith(
            Number
          ),
        cancelledAndFlagged:
          sql`COUNT(CASE WHEN ${orders.flagged} = true AND ${orders.fulfillmentStatus} = 'cancelled' THEN 1 END)`.mapWith(
            Number
          ),
        preventedLoss:
          sql`SUM(CASE WHEN ${orders.flagged} = true AND ${orders.fulfillmentStatus} = 'cancelled' THEN ${orders.totalAmount} ELSE 0 END)`.mapWith(
            Number
          ),
      })
      .from(orders);

      const monthlyPreventedLoss = await database
      .select({
        month: sql`DATE_TRUNC('month', ${orders.createdAt})`.as("month"),
        amount:
          sql`SUM(CASE WHEN ${orders.flagged} = true AND ${orders.fulfillmentStatus} = 'cancelled' THEN ${orders.totalAmount} ELSE 0 END)`
            .mapWith(Number)
            .as("amount"),
      })
      .from(orders)
      .groupBy(sql`month`)
      .orderBy(sql`month`);

    console.log("All data for combined report calculated successfully.");

    // --- 4. ASSEMBLE REPORT DATA OBJECT ---
    const reportData = {
      risk: {
        totalFlaggedOrders: totalFlaggedOrders[0].value,
        topDomains,
        monthlyFlaggedOrders,
      },
      onboarding: {
        newStoresLast30Days: newStoresLast30Days[0].value,
        storesByPlan,
      },
      effectiveness: {
        preventedLoss: effectivenessStats.preventedLoss || 0,
        percentCancelled:
          effectivenessStats.totalFlagged > 0
            ? (
              (effectivenessStats.cancelledAndFlagged /
                effectivenessStats.totalFlagged) *
              100
            ).toFixed(1)
            : 0,
        monthlyPreventedLoss,
      },
    };

    // --- 5. PDF GENERATION ---
    const htmlContent = generateReportHTML(reportData);
    const browser = await puppeteer.launch({ args: ["--no-sandbox"] });
    const page = await browser.newPage();
    await page.setViewport({ width: 1120, height: 1024 });
    await page.setContent(htmlContent, { waitUntil: "networkidle0" });
    await new Promise((resolve) => setTimeout(resolve, 500));
    const pdfBuffer = await page.pdf({ format: "A4", printBackground: true });
    await browser.close();

    // --- 6. SEND RESPONSE ---
    const fileName = `Combined_Staff_Report_${format(
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
      "ERROR: Failed to generate Combined Staff PDF report:",
      error
    );
    res
      .status(status.INTERNAL_SERVER_ERROR)
      .send({
        message: "Could not generate the report.",
        error: error.message,
      });
  }
};
