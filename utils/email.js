// const sgMail = require("@sendgrid/mail");

// sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// const sendVerifyEmail = async () => {
//   const emailOptions = {
//     to: "test@example.com", // Change to your recipient
//     from: "test@example.com", // Change to your verified sender
//     subject: "Sending with SendGrid is Fun",
//     text: "and easy to do anywhere, even with Node.js",
//     html: "<strong>and easy to do anywhere, even with Node.js</strong>",
//   };

//   const response = await sgMail.send(emailOptions);
//   console.log("this is the response from email: ", response);
// };

// module.exports = {
//   sendVerifyEmail,
// };

const { MailerSend, EmailParams, Sender, Recipient } = require("mailersend");

const mailerSend = new MailerSend({
  apiKey: process.env.MAILSEND_API_TOKEN,
});

const sendVerifyEmail = async ({ email, url }) => {
  const sentFrom = new Sender(
    "hayan@trial-3yxj6ljy077ldo2r.mlsender.net",
    "Hayan Beigh"
  );

  const recipients = [new Recipient(email, "Your Client")];

  const emailParams = new EmailParams()
    .setFrom(sentFrom)
    .setTo(recipients)
    .setReplyTo(sentFrom)
    .setSubject("Verify email")
    .setHtml(
      `<strong>
     Please click <a href="${url}">here</a> to verify your email
    </strong>`
    )
    .setText("This is the text content");

  const response = await mailerSend.email.send(emailParams);
  console.log("email send: ", response);
};

module.exports = {
  sendVerifyEmail,
};
