import dotenv from "dotenv";
// import { env } from "./env.utils";

dotenv.config();

// interface BaseProps {
//   verificationCode: string;
//   userName: string;
//   email: string;
// }

export const adminApprovalNotificationTemplate = ({
  userName,
  userEmail,
  subscriptionPlan,
  approvalLink,
  companyName,
  shopifyUrl,
  companyRegistrationNumber,
  averageOrdersPerMonth,
}: {
  userName: string;
  userEmail: string;
  subscriptionPlan: string;
  approvalLink: string;
  companyName: string;
  shopifyUrl: string;
  companyRegistrationNumber: string;
  averageOrdersPerMonth: string;
}) => {
  const primaryColor = "#255BE9";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {
            margin: 0;
            padding: 0;
            background-color: #f4f4f4;
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
        }
        .container {
            width: 100%;
            max-width: 600px;
            margin: 20px auto;
            background-color: #ffffff;
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .header {
            background-color: ${primaryColor};
            color: #ffffff;
            padding: 20px;
            text-align: center;
        }
        .content {
            padding: 30px;
            color: #333333;
        }
        .content h2 {
            color: ${primaryColor};
        }
        .user-details {
            background-color: #f9f9f9;
            border-left: 4px solid ${primaryColor};
            padding: 15px;
            margin: 20px 0;
        }
        .user-details p {
            margin: 5px 0;
        }
        .button-container {
            text-align: center;
            margin-top: 30px;
        }
        .button {
            background-color: #255BE9;
            color: #ffffff;
            padding: 12px 25px;
            text-decoration: none;
            border-radius: 5px;
            font-weight: bold;
        }
        .footer {
            text-align: center;
            padding: 20px;
            font-size: 12px;
            color: #888888;
            background-color: #f4f4f4;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>New User Registration</h1>
        </div>
        <div class="content">
            <h2>Action Required: Approve New User</h2>
            <p>A new user has registered and is awaiting your approval.</p>
            
       <div class="user-details">
        <p><strong>Username:</strong> ${userName}</p>
        <p><strong>Email:</strong> ${userEmail}</p>
        <p><strong>Selected Subscription:</strong> ${subscriptionPlan}</p>
        <p><strong>Company Name:</strong> ${companyName || "Not Provided"}</p>
        <p><strong>Shopify URL:</strong> ${shopifyUrl || "Not Provided"}</p>
        <p><strong>Company Registration #:</strong> ${
          companyRegistrationNumber || "Not Provided"
        }</p>
        <p><strong>Avg Orders/Month:</strong> ${
          averageOrdersPerMonth || "Not Provided"
        }</p>
      </div>


            <p>Please review their details and approve their account by clicking the button below.</p>

            <div class="button-container">
                <a href="${approvalLink}" class="button">Go to Admin Dashboard</a>
            </div>
        </div>
        <div class="footer">
            <p>© ${new Date().getFullYear()} eComProducts. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
  `;
};

export const staffInvitationTemplate = ({
  staffName,
  staffEmail,
  role,
  invitationLink,
  companyName,
}: {
  staffName: string;
  staffEmail: string;
  role: string;
  invitationLink: string;
  companyName: string;
}) => {
  const primaryColor = "#255BE9";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f4f4f4;
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      color: #333333;
    }
    .container {
      width: 100%;
      max-width: 600px;
      margin: 20px auto;
      background-color: #ffffff;
      border-radius: 8px;
      box-shadow: 0 4px 8px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    .header {
      background-color: ${primaryColor};
      color: #ffffff;
      padding: 20px;
      text-align: center;
    }
    .content {
      padding: 30px;
      line-height: 1.6;
    }
    .content h2 {
      color: ${primaryColor};
    }
    .details {
      background-color: #f9f9f9;
      border-left: 4px solid ${primaryColor};
      padding: 15px;
      margin: 20px 0;
    }
    .details p {
      margin: 5px 0;
    }
    .button-container {
      text-align: center;
      margin-top: 30px;
    }
    .button {
      background-color: ${primaryColor};
      color: #ffffff !important;
      padding: 12px 25px;
      text-decoration: none;
      border-radius: 5px;
      font-weight: bold;
      display: inline-block;
    }
    .footer {
      text-align: center;
      padding: 20px;
      font-size: 12px;
      color: #888888;
      background-color: #f4f4f4;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to ${companyName}</h1>
    </div>
    <div class="content">
      <h2>Hello ${staffName},</h2>
      <p>We’re excited to let you know that your staff account has been created at <strong>${companyName}</strong>.</p>
      
      <div class="details">
        <p><strong>Email:</strong> ${staffEmail}</p>
        <p><strong>Role:</strong> ${role}</p>
      </div>

      <p>You can set your password and complete your profile by clicking the button below:</p>
     
      <div class="button-container">
        <a href="${invitationLink}" class="button">Accept Invitation</a>
      </div>

      <p style="margin-top: 20px; font-size: 14px; color: #555;">
        If you weren’t expecting this invitation, you can safely ignore this email.
      </p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;
};

export const resetPasswordTemplate = ({
  userName,
  resetLink,
}: {
  userName: string;
  resetLink: string;
}) => {
  const primaryColor = "#3B5545";
  const accentColor = "#4C9F7B";

  // const logoUrl = env.LOGO_IMAGE_URL;
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {
            margin: 0;
            padding: 0;
            background-color: #f4f4f4;
        }
        .container {
            width: 100%;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            color: #333333;
        }
        .header {
            text-align: center;
            padding-bottom: 20px;
        }
        .content {
            background-color: #ffffff;
            padding: 40px;
            border-radius: 8px;
            text-align: center;
            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        }
        .button {
            background-color: ${accentColor};
            color: #ffffff;
            padding: 15px 30px;
            text-decoration: none;
            border-radius: 5px;
            font-weight: bold;
            display: inline-block;
            margin-top: 20px;
        }
        .footer {
            text-align: center;
            padding-top: 20px;
            font-size: 12px;
            color: #888888;
        }
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4;">
    <div class="container" style="width: 100%; max-width: 600px; margin: 0 auto; padding: 20px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333333;">
        <div class="header" style="text-align: center; padding-bottom: 20px;">
            <img src="/images/Logos/logo.png" alt="Canel Restaurant Logo" style="max-width: 120px;" />
        </div>
        <div class="content" style="background-color: #ffffff; padding: 40px; border-radius: 8px; text-align: center; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
            <h1 style="color: ${primaryColor}; font-size: 24px;">Password Reset Request</h1>
            <p style="font-size: 16px; line-height: 1.6;">Hello ${userName},</p>
            <p style="font-size: 16px; line-height: 1.6;">We received a request to reset your password. If this wasn't you, you can safely ignore this email.</p>
            <p style="font-size: 16px; line-height: 1.6;">Click the button below to set a new password:</p>
            <a href="${resetLink}" class="button" style="background-color: ${accentColor}; color: #ffffff; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; margin-top: 20px;">Reset Your Password</a>
            <p style="font-size: 14px; color: #888888; margin-top: 30px;">This link will expire in 1 hour.</p>
        </div>
        <div class="footer" style="text-align: center; padding-top: 20px; font-size: 12px; color: #888888;">
            <p>Thank you for choosing Canel Restaurant.</p>
            <p>© ${new Date().getFullYear()} Canel Restaurant. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
  `;
};

export const highRiskOrderNotificationTemplate = ({
  adminName,
  orderName,
  customerEmail,
  riskReasons,
  orderLink,
}: {
  adminName: string;
  orderName: string;
  customerEmail: string;
  riskReasons: string[];
  orderLink: string;
}) => {
  const primaryColor = "#D32F2F";
  const accentColor = "#FFC107";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {
            margin: 0;
            padding: 0;
            background-color: #f4f4f4;
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
        }
        .container {
            width: 100%;
            max-width: 600px;
            margin: 20px auto;
            background-color: #ffffff;
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .header {
            background-color: ${primaryColor};
            color: #ffffff;
            padding: 20px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
        }
        .content {
            padding: 30px;
            color: #333333;
            line-height: 1.6;
        }
        .content h2 {
            color: ${primaryColor};
        }
        .order-details {
            background-color: #fff9c4; /* Light yellow background */
            border-left: 4px solid ${accentColor};
            padding: 15px;
            margin: 20px 0;
        }
        .order-details p {
            margin: 5px 0;
            font-size: 16px;
        }
        .reasons-list {
            list-style-type: disc;
            padding-left: 20px;
            margin-top: 10px;
        }
        .reasons-list li {
            margin-bottom: 5px;
        }
        .button-container {
            text-align: center;
            margin-top: 30px;
        }
        .button {
            background-color: #255BE9; /* Using the original primary blue for the button */
            color: #ffffff;
            padding: 12px 25px;
            text-decoration: none;
            border-radius: 5px;
            font-weight: bold;
        }
        .footer {
            text-align: center;
            padding: 20px;
            font-size: 12px;
            color: #888888;
            background-color: #f4f4f4;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>High-Risk Order Alert</h1>
        </div>
        <div class="content">
            <h2>Hello ${adminName},</h2>
            <p>A new order has been automatically flagged as high-risk and requires your immediate attention.</p>
            
            <div class="order-details">
                <p><strong>Order Number:</strong> ${orderName}</p>
                <p><strong>Customer Email:</strong> ${customerEmail}</p>
            </div>

            <p><strong>Reason(s) for Flagging:</strong></p>
            <ul class="reasons-list">
                ${riskReasons.map((reason) => `<li>${reason}</li>`).join("")}
            </ul>

            <p>Please review the order details promptly to determine the appropriate action (e.g., fulfill, contact customer, or cancel).</p>

            <div class="button-container">
                <a href="${orderLink}" class="button">Review Order Now</a>
            </div>
        </div>
        <div class="footer">
            <p>© ${new Date().getFullYear()} eComProducts. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
  `;
};
