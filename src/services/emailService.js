import transporter from "../config/nodemailer.js";

const sendOTPEmail = async (email, otp) => {
    const mailOptions = {
        from: `SSPM Community <${process.env.EMAIL}>`,
        to: email,
        subject: "SSPM Community - Email Verification OTP",
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #1a365d;">Email Verification</h2>
                <p>Your OTP for email verification is:</p>
                <h1 style="color: #2563eb; font-size: 32px; letter-spacing: 5px;">${otp}</h1>
                <p>This OTP will expire in 10 minutes.</p>
                <p>If you didn't request this, please ignore this email.</p>
            </div>
        `,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log("Email sent: ", info.messageId);
        return true;
    } catch (error) {
        console.error("Email sending failed:", error);
        return false;
    }
};

export { sendOTPEmail };
