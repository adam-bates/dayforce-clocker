const express = require("express");
const fs = require("fs");
const router = express.Router();
const puppeteer = require("puppeteer");
const AWS = require("aws-sdk");

const SCREENSHOT_FILEPATH = "./public/images/screenshot.png";
const SCREENSHOT_URL_REL_PATH = "/images/screenshot.png";
const DAYFORCE_LOGIN_URL = "https://www.dayforcehcm.com/mydayforce/login.aspx";

const S3_SCREENSHOT_URL = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${process.env.AWS_S3_KEY}`;

const DELETE_S3_OBJECT_PARAMS = {
  Bucket: process.env.AWS_S3_BUCKET,
  Key: process.env.AWS_S3_KEY,
};
const UPLOAD_S3_OBJECT_PARAMS = (filestream) => ({
  Bucket: process.env.AWS_S3_BUCKET,
  Key: process.env.AWS_S3_KEY,
  Body: filestream,
  ACL: "public-read",
});

const SCREENSHOT_RESPONSE = {
  S3_SCREENSHOT_URL,
};

const CLOCK_TYPE = {
  IN: 0,
  OUT: 1,
};

AWS.config.update({ region: process.env.AWS_REGION, accessKeyId: "" });

const deleteScreenshotLocal = () =>
  fs.unlink(SCREENSHOT_FILEPATH, function (err) {
    if (!err) console.log("Deleted previous screenshot.");
  });

const deleteScreenshotS3 = (s3) => {
  try {
    s3.deleteObject(DELETE_S3_OBJECT_PARAMS, (err, data) => {
      if (err) console.log("Error", err, err.stack);
      if (data) console.log("Deleted screenshot from s3");
    });
  } catch (e) {
    console.log(e);
  }
};

const newPuppeteerBrowser = async () => {
  console.log("Opening browser to check Dayforce...");
  return await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    env: {
      TZ: "America/Toronto",
      ...process.env,
    },
  });
};

const tryClockingOnPage = async (clockType, page) => {
  const clockingIn = clockType == CLOCK_TYPE.IN;
  const mouseX = clockingIn ? 240 : 380;

  console.log("Clocking " + (clockingIn ? "in" : "out"));

  try {
    await page.goto(DAYFORCE_LOGIN_URL);
    await page.type("#txtCompanyName", process.env.DAYFORCE_COMPANY);
    await page.type("#txtUserName", process.env.DAYFORCE_USERNAME);
    await page.type("#txtUserPass", process.env.DAYFORCE_PASSWORD);
    await page.click("#MainContent_loginUI_cmdLogin");

    await page.waitForNavigation({ waitUntil: "networkidle0" });

    // NOTE: The time clock should be favourited
    await page.click(".dfI_Nav_ESSTimeClock");

    await page.waitForTimeout(3000);

    const totalTime = 1000;
    const iterations = 10;
    for (let i = iterations; i >= 1; i--) {
      await page.mouse.move(mouseX / i, 280 / i);
      await page.waitForTimeout(totalTime / i);
    }
    // await page.mouse.down();
    // await page.waitForTimeout(200);
    // await page.mouse.up();
    await page.waitForTimeout(3000);
  } catch (e) {
    fs.appendFile(
      "last_error_html.txt",
      await page.evaluate(() => document.body.innerHTML),
      function (err) {
        console.log(e);
        if (err) console.log(err);
      }
    );
  }
};

const screenshotAndUpload = async (page, s3) => {
  try {
    await page.screenshot({ path: SCREENSHOT_FILEPATH });

    const filestream = fs.createReadStream(SCREENSHOT_FILEPATH);
    filestream.on("error", (err) => console.log(err));

    const params = UPLOAD_S3_OBJECT_PARAMS(filestream);
    s3.upload(params, (err, data) => {
      if (err) console.log("Error", err, err.stack);
      if (data) console.log("Uploaded screenshot to s3", data.Location);
    });
  } catch (e) {
    console.log(e);
  }
};

const closeBrowser = async (browser) => {
  try {
    await browser.close();
  } catch (e) {
    console.log(e);
  }
};

const clockInOut = async (clockType) => {
  deleteScreenshotLocal();

  const s3 = new AWS.S3();
  deleteScreenshotS3(s3);

  const browser = await newPuppeteerBrowser();
  const page = await browser.newPage();
  await tryClockingOnPage(clockType, page);

  console.log("Closing up");
  await screenshotAndUpload(page, s3);
  await closeBrowser(browser);
};

router.get("/", (req, res, next) => res.status(200).send("OK"));

router.post("/in", async (req, res, next) => {
  setTimeout(() => clockInOut(CLOCK_TYPE.IN), 0);
  res.status(200).send(SCREENSHOT_RESPONSE);
});

router.post("/out", async (req, res, next) => {
  setTimeout(() => clockInOut(CLOCK_TYPE.OUT), 0);
  res.status(200).send(SCREENSHOT_RESPONSE);
});

module.exports = router;
