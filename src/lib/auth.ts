import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin } from "better-auth/plugins";
import { prisma } from "./prisma";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

export const auth = betterAuth({
    database: prismaAdapter(prisma, {
        provider: "postgresql",
    }),
    plugins: [
        admin(),
    ],
    emailAndPassword: {
        enabled: true,
        async sendResetPassword(data) {
            await transporter.sendMail({
                from: process.env.SMTP_FROM || "noreply@ams.com",
                to: data.user.email,
                subject: "รีเซ็ตรหัสผ่าน - ระบบครุภัณฑ์",
                html: `
          <div style="font-family: 'Sarabun', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #1e40af;">ระบบครุภัณฑ์ - รีเซ็ตรหัสผ่าน</h2>
            <p>สวัสดีคุณ ${data.user.name},</p>
            <p>คุณได้ร้องขอรีเซ็ตรหัสผ่าน กรุณาคลิกลิงก์ด้านล่าง:</p>
            <a href="${data.url}" 
               style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 8px; margin: 16px 0;">
              รีเซ็ตรหัสผ่าน
            </a>
            <p style="color: #6b7280; font-size: 14px;">ลิงก์จะหมดอายุภายใน 1 ชั่วโมง</p>
          </div>
        `,
            });
        },
    },
    session: {
        expiresIn: 60 * 60 * 24 * 7, // 7 days
        updateAge: 60 * 60 * 24, // 1 day
    },
    user: {
        additionalFields: {
            role: {
                type: "string",
                defaultValue: "user",
            },
            phoneNumber: {
                type: "string",
                required: false,
            },
            status: {
                type: "string",
                defaultValue: "active",
            },
            fullImage: {
                type: "string",
                required: false,
            },
        },
    },
});

export type Session = typeof auth.$Infer.Session;
