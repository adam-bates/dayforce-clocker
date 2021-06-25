# Dayforce Clocker Setup
###### By Adam Bates

Below I detail how to set up clocking in and out through Dayforce using texts on your phone. After you finish these steps, you should be able to send the following texts:
- `in` to clock in
- `out` to clock out
- `probe` to wake up the server

If there are any concerns about morals of doing this, please be aware that you are still clocking in and out yourself, that part is not automated. When you start work, you clock in. When you leave, you clock out. This is just more convenient than logging in to the website.

---

#### AWS S3 (store screenshots)
1. Log in to the AWS S3 console: https://s3.console.aws.amazon.com/s3/home
2. Create a public bucket for the dayforce screenshot to upload to. Default settings block public access, be sure to disable those.


#### AWS IAM (upload to S3)
1. Log in to the AWS IAM console: https://console.aws.amazon.com/iam/home
2. Create a new user called `dayforce-screenshots` with programmatic access
3. Create a new permissions group called `s3-access` with the policy `AmazonS3FullAccess`
4. Note the access key id and secret when created, you will not have access to the secret after closing this window


#### Heroku App (run browser and click buttons)
1. Get this repo locally: `git clone https://github.com/adam-bates/dayforce-clocker.git && cd dayforce-clocker`
2. Create a new `.env` file to load environment variables: `cp example.env .env`
    - Use the access key id and secret setup with the IAM user
    - Use the public AWS S3 bucket set up earlier
    - Use whatever AWS S3 key you'd like here, for example: `dayforce/screenshot.png`
    - Be sure to double check the AWS region used for your S3 bucket
3. Setup a new heroku app
    - Log in and create the app on Heroku: https://dashboard.heroku.com/new-app
    - Get the Heroku CLI if you don't yet have it: https://devcenter.heroku.com/articles/heroku-cli
    - `heroku login`
    - Within the repo: `heroku git:remote -a {heroku-app-name}`
    - Add the required buildpacks: `heroku buildpacks:clear && heroku buildpacks:add --index 1 https://github.com/jontewks/puppeteer-heroku-buildpack && heroku buildpacks:add --index 1 heroku/nodejs`
    - Configure the environment: `cat .env | xargs heroku config:set`
    - Upload to heroku: `git push heroku master`


#### Twilio Service Function (clock in and out from text)
1. Create a Twilio account. Ensure your email and personal number are verified: https://www.twilio.com/try-twilio
2. Create a new service in the Twilio console: https://www.twilio.com/console/functions/overview/services
3. Create a new function in the service, copying the code from https://github.com/adam-bates/dayforce-clocker/blob/master/twilio/welcome.js
4. Set the environment variable `HEROKU_APP_NAME` in the settings (above the "deploy all" button)
5. Save and deploy
6. Go to your Twilio phone number: https://www.twilio.com/console/phone-numbers
7. Configure the function down at the bottom under "Messaging"
    - Configure with: Functions
    - A message comes in: Function
    - Service: {service-name}
    - Environment: ui
    - Function path: {function-name}
8. Save!


#### AWS Lambda (reminder texts)
1. Open and follow this guide: https://www.twilio.com/blog/aws-lambda-layers-node-js-twilio-sms
2. When adding environment variables to the lambda function, also add the following:
    - `PERSONAL_PHONE_NUMBER` -- This is your personal number configured with Twilio
    - `TWILIO_PHONE_NUMBER` -- This is the number Twilio gave you
3. When adding code to the function, use the following code: https://github.com/adam-bates/dayforce-clocker/blob/master/aws/dayforce-clocker-text.js
4. Use the following cron expression in the scheduled trigger: `0 11,20 ? * MON-FRI *`
    - The servers run on UTC, so this will trigger at 7am and 4pm EST every Monday to Friday
    - `0 12,21 ? * MON-FRI *` will need to be used from Winter - Spring to account for Daylight Savings

---

And that's it!
- You should now be reminded to clock in / out twice per day
- You can text `probe` until your Heroku app responds
- You can text `in` to clock in, or `out` to clock out
- Your clocking texts should return an S3 URL as a response
- After 10-30 seconds you should be able to see a screenshot of Dayforce at the S3 url
- You can add the number as a contact in your phone to make it cleaner (ie. Dayforce Punch Clock)
- You can mess around with the code to make it more interesting!
