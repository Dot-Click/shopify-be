import puppeteer from "puppeteer";
import { format } from "date-fns";
import { database } from "@/configs/connection.config";
import { users, customers, orders, session } from "@/schema/schema";
import { eq, sql, desc, max } from "drizzle-orm";
import { Request, Response } from "express";
import status from "http-status";
import { logActivity } from "@/service/logactivity.service";
import { logger } from "@/utils/logger.util";

function generateReportHTML(stores: any) {
  const tableRows = stores
    .map(
      (store: any, index: number) => `
        <tr>
            <td>${index + 1}</td>
            <td>${store.storeName}</td>
            <td>${store.ordersFlagged}</td>
            <td>${store.ordersReviewed}</td>
            <td>${store.lastLoginDate
          ? format(new Date(store.lastLoginDate), "yyyy-MM-dd HH:mm")
          : "N/A"
        }</td>
        </tr>
    `
    )
    .join("");

  return `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: 'Helvetica', sans-serif; font-size: 10px; color: #333; }
            h1 { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
            p { font-size: 11px; color: #777; margin-top: 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #e0e0e0; padding: 8px; text-align: left; }
            th { background-color: #2c3e50; color: white; font-weight: bold; }
            tr:nth-child(even) { background-color: #f8f9fa; }
            td:nth-child(1), td:nth-child(3), td:nth-child(4) { text-align: center; }
          </style>
        </head>
        <body>
          <h1>Store Activity & Utilisation Report</h1>
          <p>Generated on: ${format(new Date(), "yyyy-MM-dd")}</p>
          <table>
            <thead>
              <tr>
                <th style="width: 8%;">Rank</th>
                <th style="width: 42%;">Store Name</th>
                <th style="width: 15%;">Orders Flagged</th>
                <th style="width: 15%;">Orders Reviewed</th>
                <th style="width: 20%;">Last Login</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </body>
        </html>
    `;
}

export const storeReportActivity = async (req: Request, res: Response) => {
  try {

    const user = req.user?.id

    if(!user){
      res.status(status.BAD_REQUEST).json({message:"Not a valid user!"})
      logger.error("Not a valid user!")
      return
    }

    const lastLoginSubquery = database
      .select({
        userId: session.userId,
        lastLoginDate: max(session.createdAt).as("last_login_date"),
      })
      .from(session)
      .groupBy(session.userId)
      .as("last_logins");

    const storeActivityData = await database
      .select({
        storeId: users.id,
        storeName: users.name,

        ordersFlagged:
          sql`COUNT(DISTINCT CASE WHEN ${orders.flagged} = true THEN ${orders.id} END)`
            .mapWith(Number)
            .as("orders_flagged"),

        ordersReviewed: sql`0`.mapWith(Number).as("orders_reviewed"),

        lastLoginDate: lastLoginSubquery.lastLoginDate,
      })
      .from(users)

      .leftJoin(customers, eq(users.id, customers.storeId))
      .leftJoin(orders, eq(customers.id, orders.customerId))
      .leftJoin(lastLoginSubquery, eq(users.id, lastLoginSubquery.userId))
      .groupBy(users.id, users.name, lastLoginSubquery.lastLoginDate)
      .orderBy(desc(sql`orders_flagged`));

    console.log(
      `Successfully calculated data for ${storeActivityData.length} stores.`
    );

    const htmlContent = generateReportHTML(storeActivityData);

    const browser = await puppeteer.launch({
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
    });
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({
      format: "A4",
      landscape: true,
      printBackground: true,
    });
    await browser.close();

    const fileName = `Store_Activity_Report_${format(
      new Date(),
      "yyyy-MM-dd"
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
      "ERROR: Failed to generate Store Activity PDF report:",
      error
    );
    res.status(status.INTERNAL_SERVER_ERROR).send({
      message: "Could not generate the report.",
      error: error.message,
    });
  }
};
