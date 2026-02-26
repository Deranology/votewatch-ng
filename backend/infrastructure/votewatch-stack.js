// ─────────────────────────────────────────────────────────────
// VoteWatch NG — AWS CDK Infrastructure
// Run this to deploy the ENTIRE backend to AWS with one command:
// > cdk deploy
// ─────────────────────────────────────────────────────────────

const cdk = require("aws-cdk-lib");
const dynamodb = require("aws-cdk-lib/aws-dynamodb");
const lambda = require("aws-cdk-lib/aws-lambda");
const appsync = require("aws-cdk-lib/aws-appsync");
const cognito = require("aws-cdk-lib/aws-cognito");
const iam = require("aws-cdk-lib/aws-iam");
const path = require("path");

class VoteWatchStack extends cdk.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    // ─────────────────────────────────────────
    // 1. COGNITO — Authentication
    // ─────────────────────────────────────────
    const userPool = new cognito.UserPool(this, "VoteWatchUserPool", {
      userPoolName: "votewatch-users",
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      autoVerify: { email: true },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // Change to RETAIN in production
    });

    const userPoolClient = new cognito.UserPoolClient(this, "VoteWatchClient", {
      userPool,
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
    });

    // Admin group
    new cognito.CfnUserPoolGroup(this, "AdminGroup", {
      userPoolId: userPool.userPoolId,
      groupName: "Admins",
      description: "Election administrators",
    });

    // ─────────────────────────────────────────
    // 2. DYNAMODB TABLES
    // ─────────────────────────────────────────

    // States
    const statesTable = new dynamodb.Table(this, "StatesTable", {
      tableName: "votewatch-states",
      partitionKey: { name: "stateId", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST, // No upfront cost
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // LGAs
    const lgasTable = new dynamodb.Table(this, "LGAsTable", {
      tableName: "votewatch-lgas",
      partitionKey: { name: "lgaId", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "stateId", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    lgasTable.addGlobalSecondaryIndex({
      indexName: "stateId-index",
      partitionKey: { name: "stateId", type: dynamodb.AttributeType.STRING },
    });

    // Wards
    const wardsTable = new dynamodb.Table(this, "WardsTable", {
      tableName: "votewatch-wards",
      partitionKey: { name: "wardId", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "lgaId", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    wardsTable.addGlobalSecondaryIndex({
      indexName: "lgaId-index",
      partitionKey: { name: "lgaId", type: dynamodb.AttributeType.STRING },
    });

    // Polling Units
    const pollingUnitsTable = new dynamodb.Table(this, "PollingUnitsTable", {
      tableName: "votewatch-polling-units",
      partitionKey: { name: "pollingUnitId", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "wardId", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    pollingUnitsTable.addGlobalSecondaryIndex({
      indexName: "wardId-index",
      partitionKey: { name: "wardId", type: dynamodb.AttributeType.STRING },
    });

    // Voters
    const votersTable = new dynamodb.Table(this, "VotersTable", {
      tableName: "votewatch-voters",
      partitionKey: { name: "voterId", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    votersTable.addGlobalSecondaryIndex({
      indexName: "vinHash-index",
      partitionKey: { name: "vinHash", type: dynamodb.AttributeType.STRING },
    });

    // Mock INEC Table
    const inecMockTable = new dynamodb.Table(this, "InecMockTable", {
      tableName: "votewatch-inec-mock",
      partitionKey: { name: "vinHash", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Elections
    const electionsTable = new dynamodb.Table(this, "ElectionsTable", {
      tableName: "votewatch-elections",
      partitionKey: { name: "electionId", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Candidates
    const candidatesTable = new dynamodb.Table(this, "CandidatesTable", {
      tableName: "votewatch-candidates",
      partitionKey: { name: "candidateId", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "electionId", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    candidatesTable.addGlobalSecondaryIndex({
      indexName: "electionId-index",
      partitionKey: { name: "electionId", type: dynamodb.AttributeType.STRING },
    });

    // Votes
    const votesTable = new dynamodb.Table(this, "VotesTable", {
      tableName: "votewatch-votes",
      partitionKey: { name: "voteId", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "electionId", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Aggregates — the live dashboard engine
    const aggregatesTable = new dynamodb.Table(this, "AggregatesTable", {
      tableName: "votewatch-aggregates",
      partitionKey: { name: "aggregateId", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "electionId", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // ─────────────────────────────────────────
    // 3. LAMBDA FUNCTIONS
    // ─────────────────────────────────────────

    const commonEnv = {
      VOTERS_TABLE: votersTable.tableName,
      VOTES_TABLE: votesTable.tableName,
      ELECTIONS_TABLE: electionsTable.tableName,
      CANDIDATES_TABLE: candidatesTable.tableName,
      AGGREGATES_TABLE: aggregatesTable.tableName,
      INEC_MOCK_TABLE: inecMockTable.tableName,
      QLDB_LEDGER: "votewatch-audit-ledger",
    };

    const castVoteFn = new lambda.Function(this, "CastVoteFunction", {
      functionName: "votewatch-cast-vote",
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "castVote.handler",
      code: lambda.Code.fromAsset(path.join(__dirname, "../lambdas")),
      environment: commonEnv,
      timeout: cdk.Duration.seconds(10),
    });

    const verifyVoterFn = new lambda.Function(this, "VerifyVoterFunction", {
      functionName: "votewatch-verify-voter",
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "verifyVoter.handler",
      code: lambda.Code.fromAsset(path.join(__dirname, "../lambdas")),
      environment: commonEnv,
      timeout: cdk.Duration.seconds(10),
    });

    const getResultsFn = new lambda.Function(this, "GetResultsFunction", {
      functionName: "votewatch-get-results",
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "getResults.handler",
      code: lambda.Code.fromAsset(path.join(__dirname, "../lambdas")),
      environment: commonEnv,
      timeout: cdk.Duration.seconds(10),
    });

    // Grant Lambda functions access to DynamoDB tables
    [votersTable, votesTable, electionsTable, candidatesTable,
     aggregatesTable, inecMockTable, statesTable, lgasTable,
     wardsTable, pollingUnitsTable].forEach((table) => {
      table.grantReadWriteData(castVoteFn);
      table.grantReadWriteData(verifyVoterFn);
      table.grantReadData(getResultsFn);
    });
    aggregatesTable.grantReadWriteData(getResultsFn);

    // ─────────────────────────────────────────
    // 4. APPSYNC API — Real-Time GraphQL
    // ─────────────────────────────────────────
    const api = new appsync.GraphqlApi(this, "VoteWatchAPI", {
      name: "VoteWatchNG",
      schema: appsync.SchemaFile.fromAsset(
        path.join(__dirname, "../schema.graphql")
      ),
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: appsync.AuthorizationType.USER_POOL,
          userPoolConfig: { userPool },
        },
        additionalAuthorizationModes: [
          {
            // Allow unauthenticated watchers to view results
            authorizationType: appsync.AuthorizationType.API_KEY,
            apiKeyConfig: {
              expires: cdk.Expiration.after(cdk.Duration.days(365)),
            },
          },
        ],
      },
      xrayEnabled: true,
    });

    // Connect Lambda resolvers to AppSync
    const castVoteDS = api.addLambdaDataSource("CastVoteDS", castVoteFn);
    const verifyVoterDS = api.addLambdaDataSource("VerifyVoterDS", verifyVoterFn);
    const getResultsDS = api.addLambdaDataSource("GetResultsDS", getResultsFn);

    castVoteDS.createResolver("CastVoteResolver", {
      typeName: "Mutation",
      fieldName: "castVote",
    });

    verifyVoterDS.createResolver("VerifyVoterResolver", {
      typeName: "Mutation",
      fieldName: "verifyVoter",
    });

    ["getNationalResults", "getResultsByState", "getResultsByLGA",
     "getResultsByWard", "getResultsByPollingUnit"].forEach((field) => {
      getResultsDS.createResolver(`${field}Resolver`, {
        typeName: "Query",
        fieldName: field,
      });
    });

    // ─────────────────────────────────────────
    // 5. STACK OUTPUTS
    // These values appear in your AWS console
    // after deployment — save them!
    // ─────────────────────────────────────────
    new cdk.CfnOutput(this, "UserPoolId", {
      value: userPool.userPoolId,
      description: "Cognito User Pool ID",
    });

    new cdk.CfnOutput(this, "UserPoolClientId", {
      value: userPoolClient.userPoolClientId,
      description: "Cognito User Pool Client ID",
    });

    new cdk.CfnOutput(this, "GraphQLApiUrl", {
      value: api.graphqlUrl,
      description: "AppSync GraphQL API URL",
    });

    new cdk.CfnOutput(this, "GraphQLApiKey", {
      value: api.apiKey || "",
      description: "AppSync API Key (for watchers)",
    });
  }
}

const app = new cdk.App();
new VoteWatchStack(app, "VoteWatchNG", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || "us-east-1",
  },
});
