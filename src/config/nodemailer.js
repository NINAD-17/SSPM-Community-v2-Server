import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
    service: "gmail",
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
        user: process.env.EMAIL,
        pass: process.env.APP_PASSWORD,
    },
});

// Verify connection configuration
const verifyTransporter = async () => {
    try {
        await transporter.verify();
        console.log("Email server is ready to send messages");
        return true;
    } catch (error) {
        console.error("Email server configuration error:", error);
        return false;
    }
};

verifyTransporter();

export default transporter;
