const axios = require("axios");

const REQUEST_TYPE = {
  IN: (msg) => msg.includes("in"),
  OUT: (msg) => msg.includes("out"),
  PROBE: (msg) => msg === "probe",
  BOTH: "both",
  NEITHER: "neither",
};

const parseInput = (input) => {
  if (REQUEST_TYPE.PROBE(input)) {
    return REQUEST_TYPE.PROBE;
  }

  const isIn = REQUEST_TYPE.IN(input);
  const isOut = REQUEST_TYPE.OUT(input);

  if (isIn && isOut) {
    return REQUEST_TYPE.BOTH;
  } else if (!isIn && !isOut) {
    return REQUEST_TYPE.NEITHER;
  }

  return isIn ? REQUEST_TYPE.IN : REQUEST_TYPE.OUT;
};

function response(callback, message) {
  const twiml = new Twilio.twiml.MessagingResponse();
  twiml.message(message);
  return callback(null, twiml);
}

exports.handler = function (context, event, callback) {
  const input = event.Body.toLowerCase();

  const requestType = parseInput(input);

  if (requestType === REQUEST_TYPE.BOTH) {
    return response(
      callback,
      "Found both 'in' and 'out', please specifiy one."
    );
  } else if (requestType === REQUEST_TYPE.NEITHER) {
    return response(callback, "Please specify either 'in' or 'out'.");
  }

  const url = `https://${process.env.HEROKU_APP_NAME}.herokuapp.com`;
  const instance = axios.create({
    baseURL: url,
    timeout: 30000,
    headers: {},
  });

  if (requestType === REQUEST_TYPE.PROBE) {
    instance
      .get("/")
      .then(() => response(callback, "Ready"))
      .catch((err) => response(callback, "Got error: " + err));
  } else {
    const action = requestType === REQUEST_TYPE.IN ? "/in" : "/out";
    instance
      .post(action)
      .then((res) => {
        return response(
          callback,
          "Wait a minute for the screenshot to upload: " +
            res.data.screenshotS3Url
        );
      })
      .catch((err) => response(callback, "Got error: " + err));
  }
};
