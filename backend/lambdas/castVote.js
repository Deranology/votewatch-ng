// ─────────────────────────────────────────────────────────────
// VoteWatch NG — castVote Lambda Function
// This is the most critical function in the entire system.
// It handles: double-vote prevention, vote recording,
// QLDB audit writing, and aggregate counter updates.
// ─────────────────────────────────────────────────────────────

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
  TransactWriteCommand,
} = require("@aws-sdk/lib-dynamodb");
const { QLDBClient, SendCommandCommand } = require("@aws-sdk/client-qldb");
const { v4: uuidv4 } = require("uuid");

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const VOTERS_TABLE = process.env.VOTERS_TABLE;
const VOTES_TABLE = process.env.VOTES_TABLE;
const ELECTIONS_TABLE = process.env.ELECTIONS_TABLE;
const AGGREGATES_TABLE = process.env.AGGREGATES_TABLE;
const QLDB_LEDGER = process.env.QLDB_LEDGER;

exports.handler = async (event) => {
  const { electionId, candidateId } = event.arguments;
  const voterId = event.identity.sub; // Cognito user ID

  console.log(`Vote attempt by voter: ${voterId} for candidate: ${candidateId} in election: ${electionId}`);

  try {
    // ─────────────────────────────────────────
    // STEP 1: Check election is OPEN
    // ─────────────────────────────────────────
    const electionResult = await dynamo.send(
      new GetCommand({
        TableName: ELECTIONS_TABLE,
        Key: { electionId },
      })
    );

    if (!electionResult.Item) {
      return { success: false, message: "Election not found." };
    }

    if (electionResult.Item.status !== "OPEN") {
      return {
        success: false,
        message: `This election is currently ${electionResult.Item.status}. Voting is not allowed.`,
      };
    }

    // ─────────────────────────────────────────
    // STEP 2: Check voter exists and is verified
    // ─────────────────────────────────────────
    const voterResult = await dynamo.send(
      new GetCommand({
        TableName: VOTERS_TABLE,
        Key: { voterId },
      })
    );

    if (!voterResult.Item) {
      return { success: false, message: "Voter not found. Please complete registration." };
    }

    const voter = voterResult.Item;

    if (!voter.isVerified) {
      return { success: false, message: "Your voter ID has not been verified. Please verify your VIN first." };
    }

    // ─────────────────────────────────────────
    // STEP 3: Prevent double voting
    // This is the most important check.
    // ─────────────────────────────────────────
    if (voter.hasVoted && voter.votedElectionId === electionId) {
      return {
        success: false,
        message: "You have already voted in this election. Each voter can only vote once.",
      };
    }

    // ─────────────────────────────────────────
    // STEP 4: Build the vote record
    // ─────────────────────────────────────────
    const voteId = uuidv4();
    const timestamp = new Date().toISOString();

    const voteRecord = {
      voteId,
      electionId,
      candidateId,
      pollingUnitId: voter.pollingUnitId,
      wardId: voter.wardId,
      lgaId: voter.lgaId,
      stateId: voter.stateId,
      timestamp,
    };

    // ─────────────────────────────────────────
    // STEP 5: Atomic transaction
    // Write vote + update voter status atomically.
    // If either fails, both are rolled back.
    // This guarantees no vote is recorded without
    // the voter being marked as having voted.
    // ─────────────────────────────────────────
    await dynamo.send(
      new TransactWriteCommand({
        TransactItems: [
          // Write the vote
          {
            Put: {
              TableName: VOTES_TABLE,
              Item: voteRecord,
              // Extra safety: reject if this voteId somehow already exists
              ConditionExpression: "attribute_not_exists(voteId)",
            },
          },
          // Mark the voter as having voted
          {
            Update: {
              TableName: VOTERS_TABLE,
              Key: { voterId },
              UpdateExpression:
                "SET hasVoted = :true, votedElectionId = :electionId, votedAt = :timestamp",
              ConditionExpression: "hasVoted = :false", // Extra double-vote guard
              ExpressionAttributeValues: {
                ":true": true,
                ":false": false,
                ":electionId": electionId,
                ":timestamp": timestamp,
              },
            },
          },
        ],
      })
    );

    console.log(`Vote recorded successfully: ${voteId}`);

    // ─────────────────────────────────────────
    // STEP 6: Update aggregates at all levels
    // Polling Unit → Ward → LGA → State → National
    // Uses atomic ADD to increment counters safely
    // even under high concurrent load
    // ─────────────────────────────────────────
    const levels = [
      {
        level: "POLLING_UNIT",
        locationId: voter.pollingUnitId,
        aggregateId: `PU#${voter.pollingUnitId}#${electionId}#${candidateId}`,
      },
      {
        level: "WARD",
        locationId: voter.wardId,
        aggregateId: `WARD#${voter.wardId}#${electionId}#${candidateId}`,
      },
      {
        level: "LGA",
        locationId: voter.lgaId,
        aggregateId: `LGA#${voter.lgaId}#${electionId}#${candidateId}`,
      },
      {
        level: "STATE",
        locationId: voter.stateId,
        aggregateId: `STATE#${voter.stateId}#${electionId}#${candidateId}`,
      },
      {
        level: "NATIONAL",
        locationId: "NIGERIA",
        aggregateId: `NATIONAL#${electionId}#${candidateId}`,
      },
    ];

    // Update all levels in parallel for speed
    await Promise.all(
      levels.map((l) =>
        dynamo.send(
          new UpdateCommand({
            TableName: AGGREGATES_TABLE,
            Key: {
              aggregateId: l.aggregateId,
              electionId,
            },
            UpdateExpression:
              "ADD voteCount :one SET #level = :level, locationId = :locationId, candidateId = :candidateId, lastUpdated = :timestamp",
            ExpressionAttributeNames: {
              "#level": "level",
            },
            ExpressionAttributeValues: {
              ":one": 1,
              ":level": l.level,
              ":locationId": l.locationId,
              ":candidateId": candidateId,
              ":timestamp": timestamp,
            },
          })
        )
      )
    );

    console.log(`Aggregates updated at all 5 levels`);

    // ─────────────────────────────────────────
    // STEP 7: Write to QLDB — Immutable Audit
    // This record can NEVER be altered or deleted
    // ─────────────────────────────────────────
    // NOTE: In production use the QLDB driver.
    // For demo purposes we log the audit record.
    // Full QLDB integration shown in qldb-audit.js
    const auditRecord = {
      voteId,
      voterId, // Only stored in QLDB, not in DynamoDB votes table
      electionId,
      candidateId,
      pollingUnitId: voter.pollingUnitId,
      wardId: voter.wardId,
      lgaId: voter.lgaId,
      stateId: voter.stateId,
      timestamp,
    };

    console.log("QLDB Audit Record:", JSON.stringify(auditRecord));
    // await writeToQLDB(auditRecord); // Uncomment when QLDB driver is configured

    // ─────────────────────────────────────────
    // STEP 8: Return success
    // AppSync will automatically trigger
    // subscriptions to notify all watchers
    // ─────────────────────────────────────────
    return {
      success: true,
      message: "Your vote has been cast successfully. Thank you for participating!",
      voteId,
      timestamp,
    };

  } catch (error) {
    // Handle the case where the atomic transaction
    // was rejected because voter already voted
    if (error.name === "TransactionCanceledException") {
      console.error("Double vote attempt blocked:", voterId);
      return {
        success: false,
        message: "Vote rejected. You may have already voted or there was a conflict. Please try again.",
      };
    }

    console.error("Error casting vote:", error);
    return {
      success: false,
      message: "An unexpected error occurred. Please try again.",
    };
  }
};
