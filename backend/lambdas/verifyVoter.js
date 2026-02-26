// ─────────────────────────────────────────────────────────────
// VoteWatch NG — verifyVoter Lambda Function
// Verifies a voter's VIN and voter card number against
// the mock INEC database. In production this would call
// the real INEC API endpoint.
// ─────────────────────────────────────────────────────────────

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  GetCommand,
  UpdateCommand,
} = require("@aws-sdk/lib-dynamodb");
const crypto = require("crypto");

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const VOTERS_TABLE = process.env.VOTERS_TABLE;
const INEC_MOCK_TABLE = process.env.INEC_MOCK_TABLE;

// Hash function — we never store raw VIN or voter card numbers
const hashValue = (value) => {
  return crypto
    .createHash("sha256")
    .update(value.trim().toUpperCase()) // Normalize before hashing
    .digest("hex");
};

exports.handler = async (event) => {
  const { vin, voterCardNumber } = event.arguments;
  const voterId = event.identity.sub; // Cognito user ID

  console.log(`Verification attempt for voter: ${voterId}`);

  try {
    // ─────────────────────────────────────────
    // STEP 1: Hash the VIN and voter card
    // Never log or store the raw values
    // ─────────────────────────────────────────
    const vinHash = hashValue(vin);
    const voterCardHash = hashValue(voterCardNumber);

    console.log(`VIN hash generated. Looking up in INEC mock database...`);

    // ─────────────────────────────────────────
    // STEP 2: Look up in mock INEC database
    // ─────────────────────────────────────────
    const inecResult = await dynamo.send(
      new GetCommand({
        TableName: INEC_MOCK_TABLE,
        Key: { vinHash },
      })
    );

    if (!inecResult.Item) {
      return {
        isValid: false,
        message: "VIN not found in the voter registry. Please check your voter card and try again.",
      };
    }

    const inecRecord = inecResult.Item;

    // ─────────────────────────────────────────
    // STEP 3: Verify voter card matches the VIN
    // ─────────────────────────────────────────
    if (inecRecord.voterCardHash !== voterCardHash) {
      return {
        isValid: false,
        message: "Voter card number does not match this VIN. Please check your details and try again.",
      };
    }

    // ─────────────────────────────────────────
    // STEP 4: Check voter is eligible
    // ─────────────────────────────────────────
    if (!inecRecord.isActive) {
      return {
        isValid: false,
        message: "This voter registration is not active. Please contact INEC.",
      };
    }

    // ─────────────────────────────────────────
    // STEP 5: Check this VIN isn't already
    // registered to another account
    // ─────────────────────────────────────────
    const existingVoterResult = await dynamo.send(
      new GetCommand({
        TableName: VOTERS_TABLE,
        Key: { voterId },
      })
    );

    if (existingVoterResult.Item?.isVerified) {
      return {
        isValid: true,
        message: "Your voter ID is already verified.",
        pollingUnitId: existingVoterResult.Item.pollingUnitId,
        wardId: existingVoterResult.Item.wardId,
        lgaId: existingVoterResult.Item.lgaId,
        stateId: existingVoterResult.Item.stateId,
      };
    }

    // ─────────────────────────────────────────
    // STEP 6: Update voter record with verified
    // status and location data from INEC
    // ─────────────────────────────────────────
    await dynamo.send(
      new UpdateCommand({
        TableName: VOTERS_TABLE,
        Key: { voterId },
        UpdateExpression:
          "SET isVerified = :true, vinHash = :vinHash, voterCardHash = :voterCardHash, pollingUnitId = :pollingUnitId, wardId = :wardId, lgaId = :lgaId, stateId = :stateId, verifiedAt = :timestamp",
        ExpressionAttributeValues: {
          ":true": true,
          ":vinHash": vinHash,
          ":voterCardHash": voterCardHash,
          ":pollingUnitId": inecRecord.pollingUnitId,
          ":wardId": inecRecord.wardId,
          ":lgaId": inecRecord.lgaId,
          ":stateId": inecRecord.stateId,
          ":timestamp": new Date().toISOString(),
        },
      })
    );

    console.log(`Voter ${voterId} verified successfully`);

    return {
      isValid: true,
      message: "Verification successful! You are now eligible to vote.",
      pollingUnitId: inecRecord.pollingUnitId,
      wardId: inecRecord.wardId,
      lgaId: inecRecord.lgaId,
      stateId: inecRecord.stateId,
    };

  } catch (error) {
    console.error("Error verifying voter:", error);
    return {
      isValid: false,
      message: "An unexpected error occurred during verification. Please try again.",
    };
  }
};
