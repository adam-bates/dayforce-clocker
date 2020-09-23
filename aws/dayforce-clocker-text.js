const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilio = require("twilio");

exports.handler = (event, context, callback) => {
  const client = twilio(accountSid, authToken);

  client.messages
    .create({
      body: "Would you like to clock in or out?",
      to: process.env.PERSONAL_PHONE_NUMBER,
      from: process.env.TWILIO_PHONE_NUMBER,
    })
    .then((message) => callback(null, message.sid))
    .catch((e) => callback(Error(e)));
};
