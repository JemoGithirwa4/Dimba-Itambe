import env from "dotenv";
import axios from "axios";
import express from "express";

const app = express();
app.use(express.json()); // ✅ Ensure Express can handle JSON

env.config();

async function generateToken() {
    const consumerKey = process.env.CONSUMER_KEY;
    const consumerSecret = process.env.CONSUMER_SECRET;
    const url = "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials";

    const encodedCredentials = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");

    try {
        const response = await axios.get(url, {
            headers: { Authorization: `Basic ${encodedCredentials}` }
        });
        return response.data.access_token;
    } catch (error) {
        console.error("Token Error:", error.response?.data || error.message);
        throw new Error("Failed to get access token.");
    }
}

async function sendStkPush() {
    const token = await generateToken();
    const date = new Date();
    const timestamp =
        date.getFullYear() +
        ("0" + (date.getMonth() + 1)).slice(-2) +
        ("0" + date.getDate()).slice(-2) +
        ("0" + date.getHours()).slice(-2) +
        ("0" + date.getMinutes()).slice(-2) +
        ("0" + date.getSeconds()).slice(-2);

    const shortCode = "174379"; // ✅ Sandbox Paybill
    const passkey = process.env.PASS_KEY;

    const stk_password = Buffer.from(shortCode + passkey + timestamp).toString("base64");

    const url = "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest";

    const headers = {
        Authorization: "Bearer " + token,
        "Content-Type": "application/json"
    };

    const requestBody = {
        BusinessShortCode: shortCode,
        Password: stk_password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: "10",
        PartyA: "254759807494", // ✅ Ensure this is a test M-Pesa number
        PartyB: shortCode,
        PhoneNumber: "254759807494", // ✅ Must match PartyA
        CallBackURL: "https://yourwebsite.co.ke/callbackurl",
        AccountReference: "TestAccount",
        TransactionDesc: "Test Payment"
    };

    try {
        const response = await axios.post(url, requestBody, { headers });
        console.log("STK Push Response:", response.data);
    } catch (error) {
        console.error("STK Push Error:", error.response?.data || error.message);
    }
}

// ✅ Run STK Push Test
sendStkPush();

// ✅ Callback URL Route (Handles M-Pesa Response)
app.post('/callback', (req, res) => {
    const callbackData = req.body;

    if (!callbackData?.Body?.stkCallback) {
        console.error("Invalid callback data:", callbackData);
        return res.status(400).json({ message: "Invalid callback data" });
    }

    const resultCode = callbackData.Body.stkCallback.ResultCode;
    if (resultCode !== 0) {
        const errorMessage = callbackData.Body.stkCallback.ResultDesc;
        console.log("STK Push Failed:", errorMessage);
        return res.json({ ResultCode: resultCode, ResultDesc: errorMessage });
    }

    const body = callbackData.Body.stkCallback.CallbackMetadata;
    if (!body?.Item) {
        console.error("Missing Callback Metadata");
        return res.status(400).json({ message: "Missing Callback Metadata" });
    }

    // ✅ Get Payment Details
    const amountObj = body.Item.find(obj => obj.Name === 'Amount');
    const amount = amountObj?.Value || 0;

    const codeObj = body.Item.find(obj => obj.Name === 'MpesaReceiptNumber');
    const mpesaCode = codeObj?.Value || "N/A";

    const phoneNumberObj = body.Item.find(obj => obj.Name === 'PhoneNumber');
    const phone = phoneNumberObj?.Value || "N/A";

    console.log(`✅ Payment Received: ${amount} KES from ${phone}, Mpesa Code: ${mpesaCode}`);

    return res.json({ message: "Success", amount, mpesaCode, phone });
});

// ✅ Start Express Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));