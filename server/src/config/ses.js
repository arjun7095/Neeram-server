const AWS = require('aws-sdk');
require('dotenv').config();

const ses = new AWS.SES({ region: process.env.AWS_REGION || 'us-east-1' });

const sendEmail = async (to, subject, html, text = '') => {
  const params = {
    Source: process.env.SES_FROM,
    Destination: { ToAddresses: [to] },
    Message: {
      Subject: { Data: subject, Charset: 'UTF-8' },
      Body: {
        Html: { Data: html, Charset: 'UTF-8' },
        Text: text ? { Data: text, Charset: 'UTF-8' } : undefined,
      },
    },
  };

  try {
    const result = await ses.sendEmail(params).promise();
    console.log('SES Email sent:', result.MessageId);
    return result;
  } catch (error) {
    console.error('SES Error:', error.message);
    throw error;
  }
};

module.exports = { sendEmail };