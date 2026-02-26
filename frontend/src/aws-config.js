// ─────────────────────────────────────────────────────────────
// VoteWatch NG — AWS Connection Layer
// This file wires the frontend to your real AWS backend.
// Replace the mock values below with your CDK output values.
//
// After running: cdk deploy
// You will see these values printed in your terminal.
// ─────────────────────────────────────────────────────────────

// ── STEP 1: Paste your CDK output values here ────────────────
export const awsConfig = {
  Auth: {
    Cognito: {
      userPoolId:       "us-east-1_BnFovd1zl",       // From CDK output: UserPoolId
      userPoolClientId: "745hnuhqmo0eq99duadrhd58j", // From CDK output: UserPoolClientId
      region:           "us-east-1",
    },
  },
  API: {
    GraphQL: {
      endpoint: "https://cwna5ygkhjepjpe2ufpd7ujy2m.appsync-api.us-east-1.amazonaws.com/graphql", // From CDK output: GraphQLApiUrl
      region:   "us-east-1",
      defaultAuthMode: "userPool", // Authenticated voters use Cognito
    },
  },
};

// API key for unauthenticated watchers (public results view)
export const PUBLIC_API_KEY = "da2-2auqyee7avg4ppwetjblbttncm"; // From CDK output: GraphQLApiKey

// ── STEP 2: GraphQL Operations ───────────────────────────────

export const QUERIES = {
  GET_NATIONAL_RESULTS: `
    query GetNationalResults($electionId: String!) {
      getNationalResults(electionId: $electionId) {
        electionId
        electionName
        status
        totalVotes
        aggregates {
          aggregateId
          candidateId
          level
          locationId
          voteCount
          lastUpdated
        }
      }
    }
  `,

  GET_RESULTS_BY_STATE: `
    query GetResultsByState($electionId: String!, $stateId: String!) {
      getResultsByState(electionId: $electionId, stateId: $stateId) {
        electionId
        totalVotes
        aggregates {
          candidateId
          voteCount
          locationId
        }
      }
    }
  `,

  LIST_CANDIDATES: `
    query ListCandidates($electionId: String!) {
      listCandidatesByElection(electionId: $electionId) {
        candidateId
        fullName
        party
        position
        photo
        partyLogo
      }
    }
  `,

  GET_ACTIVE_ELECTION: `
    query GetActiveElection {
      getActiveElection {
        electionId
        electionName
        electionType
        description
        status
        startTime
        endTime
      }
    }
  `,

  GET_VOTER_STATUS: `
    query GetVoterStatus($voterId: ID!) {
      getVoterStatus(voterId: $voterId) {
        voterId
        hasVoted
        isVerified
        pollingUnitId
        wardId
        lgaId
        stateId
      }
    }
  `,
};

export const MUTATIONS = {
  VERIFY_VOTER: `
    mutation VerifyVoter($vin: String!, $voterCardNumber: String!) {
      verifyVoter(vin: $vin, voterCardNumber: $voterCardNumber) {
        isValid
        message
        pollingUnitId
        wardId
        lgaId
        stateId
      }
    }
  `,

  CAST_VOTE: `
    mutation CastVote($electionId: String!, $candidateId: String!) {
      castVote(electionId: $electionId, candidateId: $candidateId) {
        success
        message
        voteId
        timestamp
      }
    }
  `,
};

export const SUBSCRIPTIONS = {
  ON_NATIONAL_VOTE_UPDATE: `
    subscription OnNationalVoteUpdate($electionId: String!) {
      onNationalVoteUpdate(electionId: $electionId) {
        aggregateId
        candidateId
        level
        locationId
        voteCount
        lastUpdated
      }
    }
  `,

  ON_STATE_VOTE_UPDATE: `
    subscription OnStateVoteUpdate($electionId: String!, $stateId: String!) {
      onStateVoteUpdate(electionId: $electionId, stateId: $stateId) {
        aggregateId
        candidateId
        voteCount
        lastUpdated
      }
    }
  `,

  ON_ELECTION_STATUS_CHANGE: `
    subscription OnElectionStatusChange($electionId: String!) {
      onElectionStatusChange(electionId: $electionId) {
        electionId
        status
      }
    }
  `,
};

// ── STEP 3: How to connect Amplify in main.jsx ───────────────
//
// import { Amplify } from "aws-amplify";
// import { awsConfig } from "./aws-config";
// Amplify.configure(awsConfig);
//
// Then in your components:
// import { generateClient } from "aws-amplify/api";
// const client = generateClient();
//
// Query example:
// const { data } = await client.graphql({
//   query: QUERIES.GET_NATIONAL_RESULTS,
//   variables: { electionId: "ELECTION#2027#PRESIDENTIAL" },
// });
//
// Subscription example (real-time):
// const sub = client.graphql({
//   query: SUBSCRIPTIONS.ON_NATIONAL_VOTE_UPDATE,
//   variables: { electionId: "ELECTION#2027#PRESIDENTIAL" },
// }).subscribe({
//   next: ({ data }) => {
//     // Update your state here — fires every time a vote is cast
//     const update = data.onNationalVoteUpdate;
//     updateCandidateCount(update.candidateId, update.voteCount);
//   },
// });
//
// return () => sub.unsubscribe(); // Clean up in useEffect
