// ─────────────────────────────────────────────────────────────
// VoteWatch NG — getResults Lambda Function
// Powers the live dashboard at every hierarchy level.
// Returns pre-computed aggregates for instant response.
// National → State → LGA → Ward → Polling Unit
// ─────────────────────────────────────────────────────────────

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  QueryCommand,
  GetCommand,
} = require("@aws-sdk/lib-dynamodb");

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const AGGREGATES_TABLE = process.env.AGGREGATES_TABLE;
const ELECTIONS_TABLE = process.env.ELECTIONS_TABLE;
const CANDIDATES_TABLE = process.env.CANDIDATES_TABLE;

exports.handler = async (event) => {
  const { field } = event.info; // Which query was called
  const args = event.arguments;

  console.log(`getResults called: ${field}`, args);

  try {
    switch (field) {
      case "getNationalResults":
        return await getResultsAtLevel({
          electionId: args.electionId,
          level: "NATIONAL",
          locationId: "NIGERIA",
          prefix: `NATIONAL#${args.electionId}`,
        });

      case "getResultsByState":
        return await getResultsAtLevel({
          electionId: args.electionId,
          level: "STATE",
          locationId: args.stateId,
          prefix: `STATE#${args.stateId}#${args.electionId}`,
        });

      case "getResultsByLGA":
        return await getResultsAtLevel({
          electionId: args.electionId,
          level: "LGA",
          locationId: args.lgaId,
          prefix: `LGA#${args.lgaId}#${args.electionId}`,
        });

      case "getResultsByWard":
        return await getResultsAtLevel({
          electionId: args.electionId,
          level: "WARD",
          locationId: args.wardId,
          prefix: `WARD#${args.wardId}#${args.electionId}`,
        });

      case "getResultsByPollingUnit":
        return await getResultsAtLevel({
          electionId: args.electionId,
          level: "POLLING_UNIT",
          locationId: args.pollingUnitId,
          prefix: `PU#${args.pollingUnitId}#${args.electionId}`,
        });

      default:
        throw new Error(`Unknown field: ${field}`);
    }
  } catch (error) {
    console.error("Error fetching results:", error);
    throw error;
  }
};

// ─────────────────────────────────────────
// Core function: fetch aggregates for a
// specific level and return formatted results
// ─────────────────────────────────────────
async function getResultsAtLevel({ electionId, level, locationId, prefix }) {

  // Fetch election details
  const electionResult = await dynamo.send(
    new GetCommand({
      TableName: ELECTIONS_TABLE,
      Key: { electionId },
    })
  );

  if (!electionResult.Item) {
    throw new Error(`Election ${electionId} not found`);
  }

  const election = electionResult.Item;

  // Fetch all aggregate records for this level
  const aggregatesResult = await dynamo.send(
    new QueryCommand({
      TableName: AGGREGATES_TABLE,
      KeyConditionExpression:
        "begins_with(aggregateId, :prefix) AND electionId = :electionId",
      ExpressionAttributeValues: {
        ":prefix": prefix,
        ":electionId": electionId,
      },
    })
  );

  const aggregates = aggregatesResult.Items || [];

  // Calculate total votes across all candidates
  const totalVotes = aggregates.reduce((sum, a) => sum + (a.voteCount || 0), 0);

  // Sort by vote count descending (leading candidate first)
  aggregates.sort((a, b) => (b.voteCount || 0) - (a.voteCount || 0));

  return {
    electionId,
    electionName: election.electionName,
    status: election.status,
    totalVotes,
    aggregates: aggregates.map((a) => ({
      ...a,
      percentage: totalVotes > 0
        ? ((a.voteCount / totalVotes) * 100).toFixed(2)
        : "0.00",
    })),
  };
}
