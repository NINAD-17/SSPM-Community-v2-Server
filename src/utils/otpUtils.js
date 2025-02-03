import crypto from "crypto";

// Store OTPs in memory (in production, we'll use Redis or similar)
const otpStore = new Map();

const generateOTP = () => {
    return crypto.randomInt(100000, 999999).toString();
};

const storeOTP = (email, otp) => {
    const expiryTime = Date.now() + 10 * 60 * 1000; // 10 minutes expiry - 10 minutes * 60 seconds * 1000 milliseconds
    otpStore.set(email, { otp, expiryTime });
};

const verifyOTP = (email, otp) => {
    const storedData = otpStore.get(email);
    if (!storedData) return false;

    if (Date.now() > storedData.expiryTime) {
        console.log("expired??: ", Date.now() > storedData.expiryTime);
        otpStore.delete(email);
        return false;
    }

    if (storedData.otp === otp.toString()) {
        otpStore.delete(email); // Delete after successful verification
        return true;
    }
    return false;
};

const hasOTPSent = (email) => {
    return otpStore.has(email);
};

export { generateOTP, storeOTP, verifyOTP, hasOTPSent };
