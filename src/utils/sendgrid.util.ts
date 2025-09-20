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
  const primaryColor = "#1a2a4c";
  const accentColor = "#007bff";
  const backgroundColor = "#f0f4f8";
  const textColor = "#555555";
  const cardBackgroundColor = "#ffffff";

  const logoUrl = "https://your-domain.com/path-to-your-logo.png";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Reset</title>
    <style>
      /* Basic responsive styles */
      @media screen and (max-width: 600px) {
        .container {
          width: 100% !important;
          padding: 15px !important;
        }
        .content {
          padding: 25px !important;
        }
      }
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: ${backgroundColor}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol';">

    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
            <td style="padding: 20px 0;">
                <table class="container" role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" align="center" style="margin: auto; background-color: ${cardBackgroundColor}; border-radius: 12px; box-shadow: 0 6px 24px rgba(0,0,0,0.08);">
                    
                    <!-- Header with Logo -->
                    <tr>
                        <td style="padding: 30px; text-align: center;">
                            <img src="${logoUrl}" alt="Canel Restaurant Logo" style="max-width: 140px;"/>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td class="content" style="padding: 10px 40px 40px 40px; text-align: center;">
                            <h1 style="color: ${primaryColor}; font-size: 26px; font-weight: 600; margin-bottom: 15px;">Reset Your Password</h1>
                            <p style="color: ${textColor}; font-size: 16px; line-height: 1.6;">Hello ${userName},</p>
                            <p style="color: ${textColor}; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
                                A request was made to reset your password. Please click the button below to set a new one.
                            </p>
                            
                            <!-- CTA Button -->
                            <a href="${resetLink}" target="_blank" style="background-color: ${accentColor}; color: #ffffff; padding: 15px 35px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 500; display: inline-block; border: 1px solid ${accentColor}; background-image: linear-gradient(to right, #007bff, #0056b3); box-shadow: 0 4px 12px rgba(0, 123, 255, 0.2);">
                                Set a New Password
                            </a>
                            
                            <p style="font-size: 14px; color: #888888; margin-top: 30px;">
                                If you did not request this, you can safely ignore this email.
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 30px; text-align: center; font-size: 12px; color: #888888; border-top: 1px solid #e9ecef;">
                            <p style="margin: 0;">&copy; ${new Date().getFullYear()} Canel Restaurant. All rights reserved.</p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>

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
