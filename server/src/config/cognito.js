const AWS = require('aws-sdk');
require('dotenv').config();

const cognito = new AWS.CognitoIdentityServiceProvider({
  region: process.env.AWS_REGION,
});

const initiateAuth = async (phone, clientId) => {
  const params = {
    AuthFlow: 'CUSTOM_AUTH',
    ClientId: clientId,
    AuthParameters: { USERNAME: phone },
  };
  return cognito.initiateAuth(params).promise();
};

const respondToAuthChallenge = async (phone, code, session, clientId) => {
  const params = {
    ChallengeName: 'CUSTOM_CHALLENGE',
    ClientId: clientId,
    ChallengeResponses: { USERNAME: phone, ANSWER: code },
    Session: session,
  };
  return cognito.respondToAuthChallenge(params).promise();
};

module.exports = { initiateAuth, respondToAuthChallenge };