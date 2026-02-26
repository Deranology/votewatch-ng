// ─────────────────────────────────────────────────────────────
// VoteWatch NG — Seed Data Script
// Populates DynamoDB with realistic Nigerian electoral data
// Run: node seedMockData.js
// ─────────────────────────────────────────────────────────────

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  PutCommand,
  BatchWriteCommand,
} = require("@aws-sdk/lib-dynamodb");
const crypto = require("crypto");
const { v4: uuidv4 } = require("uuid");

const client = new DynamoDBClient({ region: "us-east-1" });
const dynamo = DynamoDBDocumentClient.from(client);

// ─────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────

const hashValue = (value) =>
  crypto.createHash("sha256").update(value.trim().toUpperCase()).digest("hex");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const batchWrite = async (tableName, items) => {
  // DynamoDB batch write max is 25 items at a time
  const chunks = [];
  for (let i = 0; i < items.length; i += 25) {
    chunks.push(items.slice(i, i + 25));
  }

  for (const chunk of chunks) {
    await dynamo.send(
      new BatchWriteCommand({
        RequestItems: {
          [tableName]: chunk.map((item) => ({
            PutRequest: { Item: item },
          })),
        },
      })
    );
    await sleep(100); // Avoid throttling
  }
  console.log(`✅ Seeded ${items.length} items into ${tableName}`);
};

// ─────────────────────────────────────────
// NIGERIA ELECTORAL DATA
// 5 States, ~10 LGAs each, 5 Wards each,
// 5 Polling Units each
// ─────────────────────────────────────────

const NIGERIA_DATA = {
  states: [
    { stateId: "STATE#LAGOS", stateName: "Lagos", stateCode: "LA" },
    { stateId: "STATE#ABUJA", stateName: "FCT Abuja", stateCode: "AB" },
    { stateId: "STATE#KANO", stateName: "Kano", stateCode: "KN" },
    { stateId: "STATE#RIVERS", stateName: "Rivers", stateCode: "RV" },
    { stateId: "STATE#ENUGU", stateName: "Enugu", stateCode: "EN" },
  ],

  lgas: {
    "STATE#LAGOS": [
      "Ikeja", "Lagos Island", "Surulere", "Alimosho",
      "Eti-Osa", "Kosofe", "Mushin", "Oshodi-Isolo",
      "Agege", "Ifako-Ijaiye",
    ],
    "STATE#ABUJA": [
      "Municipal Area Council", "Abaji", "Bwari",
      "Gwagwalada", "Kuje", "Kwali",
    ],
    "STATE#KANO": [
      "Kano Municipal", "Fagge", "Dala", "Gwale",
      "Kumbotso", "Nassarawa", "Tarauni", "Ungogo",
      "Bagwai", "Bebeji",
    ],
    "STATE#RIVERS": [
      "Port Harcourt", "Obio-Akpor", "Okrika",
      "Eleme", "Oyigbo", "Etche",
      "Ikwerre", "Emohua",
    ],
    "STATE#ENUGU": [
      "Enugu North", "Enugu South", "Igbo-Eze North",
      "Nkanu East", "Udi", "Awgu",
      "Ezeagu", "Igbo-Eze South",
    ],
  },
};

// Generate ward names per LGA
const generateWards = (lgaName, count = 5) =>
  Array.from({ length: count }, (_, i) => `${lgaName} Ward ${i + 1}`);

// Generate polling unit names per ward
const POLLING_UNIT_SUFFIXES = [
  "Primary School", "Town Hall", "Community Centre",
  "Market Square", "Village Hall",
];

// ─────────────────────────────────────────
// ELECTION DATA
// ─────────────────────────────────────────

const ELECTIONS = [
  {
    electionId: "ELECTION#2027#PRESIDENTIAL",
    electionName: "2027 Nigerian Presidential Election",
    electionType: "PRESIDENTIAL",
    description:
      "Vote for the next President and Commander-in-Chief of the Federal Republic of Nigeria.",
    status: "OPEN",
    startTime: "2027-02-20T08:00:00Z",
    endTime: "2027-02-20T17:00:00Z",
    createdBy: "ADMIN",
    createdAt: new Date().toISOString(),
  },
];

const CANDIDATES = [
  {
    candidateId: "CANDIDATE#2027#PRES#APC#001",
    electionId: "ELECTION#2027#PRESIDENTIAL",
    fullName: "Adebayo Olusegun",
    party: "APC",
    position: "President",
    partyLogo: "",
    photo: "",
    createdAt: new Date().toISOString(),
  },
  {
    candidateId: "CANDIDATE#2027#PRES#PDP#002",
    electionId: "ELECTION#2027#PRESIDENTIAL",
    fullName: "Emeka Chukwudi",
    party: "PDP",
    position: "President",
    partyLogo: "",
    photo: "",
    createdAt: new Date().toISOString(),
  },
  {
    candidateId: "CANDIDATE#2027#PRES#LP#003",
    electionId: "ELECTION#2027#PRESIDENTIAL",
    fullName: "Fatima Aliyu",
    party: "LP",
    position: "President",
    partyLogo: "",
    photo: "",
    createdAt: new Date().toISOString(),
  },
  {
    candidateId: "CANDIDATE#2027#PRES#NNPP#004",
    electionId: "ELECTION#2027#PRESIDENTIAL",
    fullName: "Chidi Okoro",
    party: "NNPP",
    position: "President",
    partyLogo: "",
    photo: "",
    createdAt: new Date().toISOString(),
  },
];

// ─────────────────────────────────────────
// MOCK VOTER GENERATOR
// Generates realistic Nigerian VINs
// Format: 2 letters + 11 digits (INEC format)
// ─────────────────────────────────────────

const generateVIN = (index) => {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const l1 = letters[Math.floor(index / 100) % 26];
  const l2 = letters[index % 26];
  const digits = String(index).padStart(11, "0");
  return `${l1}${l2}${digits}`;
};

const generateVoterCardNumber = (index) => {
  return `VC${String(index).padStart(10, "0")}`;
};

const NIGERIAN_FIRST_NAMES = [
  "Chidi", "Amaka", "Emeka", "Ngozi", "Obinna", "Chioma",
  "Adebayo", "Folake", "Segun", "Funmi", "Tunde", "Bisi",
  "Musa", "Fatima", "Ibrahim", "Aisha", "Yusuf", "Halima",
  "Kelechi", "Uchenna", "Ifeoma", "Nnamdi", "Obiora", "Adaeze",
  "Sola", "Wale", "Kunle", "Yemi", "Dele", "Toyin",
];

const NIGERIAN_LAST_NAMES = [
  "Okonkwo", "Adeyemi", "Ibrahim", "Okafor", "Bello",
  "Nwosu", "Fashola", "Abdullahi", "Eze", "Olawale",
  "Musa", "Chukwu", "Abubakar", "Obi", "Danjuma",
  "Nwachukwu", "Adesanya", "Usman", "Okeke", "Tinubu",
];

// ─────────────────────────────────────────
// MAIN SEED FUNCTION
// ─────────────────────────────────────────

async function seedAll() {
  console.log("\n🇳🇬 VoteWatch NG — Starting Seed...\n");

  // ── STATES ──────────────────────────────
  console.log("📍 Seeding States...");
  const stateItems = NIGERIA_DATA.states.map((s) => ({
    ...s,
    totalLGAs: NIGERIA_DATA.lgas[s.stateId]?.length || 0,
    createdAt: new Date().toISOString(),
  }));
  await batchWrite("votewatch-states", stateItems);

  // ── LGAs, WARDS, POLLING UNITS ───────────
  console.log("\n🏛️  Seeding LGAs, Wards, and Polling Units...");

  const lgaItems = [];
  const wardItems = [];
  const pollingUnitItems = [];

  // We'll collect all polling units with their full location context
  // so we can assign voters to them
  const allPollingUnits = [];

  for (const state of NIGERIA_DATA.states) {
    const lgaNames = NIGERIA_DATA.lgas[state.stateId] || [];

    for (const lgaName of lgaNames) {
      const lgaId = `LGA#${state.stateId}#${lgaName.replace(/\s+/g, "_").toUpperCase()}`;

      lgaItems.push({
        lgaId,
        stateId: state.stateId,
        lgaName,
        createdAt: new Date().toISOString(),
      });

      const wards = generateWards(lgaName, 5);

      for (const wardName of wards) {
        const wardId = `WARD#${lgaId}#${wardName.replace(/\s+/g, "_").toUpperCase()}`;

        wardItems.push({
          wardId,
          lgaId,
          wardName,
          createdAt: new Date().toISOString(),
        });

        for (let p = 0; p < 5; p++) {
          const pollingUnitId = `PU#${wardId}#PU${String(p + 1).padStart(3, "0")}`;
          const pollingUnitName = `${wardName} — ${POLLING_UNIT_SUFFIXES[p]}`;

          pollingUnitItems.push({
            pollingUnitId,
            wardId,
            pollingUnitName,
            address: `${pollingUnitName}, ${lgaName}, ${state.stateName}`,
            createdAt: new Date().toISOString(),
          });

          allPollingUnits.push({
            pollingUnitId,
            wardId,
            lgaId,
            stateId: state.stateId,
          });
        }
      }
    }
  }

  await batchWrite("votewatch-lgas", lgaItems);
  await batchWrite("votewatch-wards", wardItems);
  await batchWrite("votewatch-polling-units", pollingUnitItems);

  console.log(`\n📊 Electoral Geography Summary:`);
  console.log(`   States: ${stateItems.length}`);
  console.log(`   LGAs: ${lgaItems.length}`);
  console.log(`   Wards: ${wardItems.length}`);
  console.log(`   Polling Units: ${pollingUnitItems.length}`);

  // ── ELECTIONS + CANDIDATES ───────────────
  console.log("\n🗳️  Seeding Elections and Candidates...");
  await batchWrite("votewatch-elections", ELECTIONS);
  await batchWrite("votewatch-candidates", CANDIDATES);

  // ── MOCK INEC VOTERS ─────────────────────
  console.log("\n👥 Seeding Mock INEC Voter Registry (500 voters)...");

  const inecItems = [];
  const voterCount = 500;

  for (let i = 0; i < voterCount; i++) {
    // Assign voter to a random polling unit
    const pollingUnit =
      allPollingUnits[Math.floor(Math.random() * allPollingUnits.length)];

    const vin = generateVIN(i + 1);
    const voterCardNumber = generateVoterCardNumber(i + 1);

    inecItems.push({
      vinHash: hashValue(vin),
      voterCardHash: hashValue(voterCardNumber),
      pollingUnitId: pollingUnit.pollingUnitId,
      wardId: pollingUnit.wardId,
      lgaId: pollingUnit.lgaId,
      stateId: pollingUnit.stateId,
      isActive: true,
    });
  }

  await batchWrite("votewatch-inec-mock", inecItems);

  // ── PRINT SAMPLE TEST CREDENTIALS ────────
  // Print 10 sample VIN + voter card pairs for testing
  console.log("\n─────────────────────────────────────────────────────");
  console.log("🔑 SAMPLE TEST CREDENTIALS (use these to test voting)");
  console.log("─────────────────────────────────────────────────────");

  for (let i = 0; i < 10; i++) {
    const vin = generateVIN(i + 1);
    const voterCard = generateVoterCardNumber(i + 1);
    const firstName =
      NIGERIAN_FIRST_NAMES[Math.floor(Math.random() * NIGERIAN_FIRST_NAMES.length)];
    const lastName =
      NIGERIAN_LAST_NAMES[Math.floor(Math.random() * NIGERIAN_LAST_NAMES.length)];

    console.log(`\nVoter ${i + 1}: ${firstName} ${lastName}`);
    console.log(`  VIN:               ${vin}`);
    console.log(`  Voter Card Number: ${voterCard}`);
  }

  console.log("\n─────────────────────────────────────────────────────");
  console.log("\n✅ Seed complete! VoteWatch NG is ready for testing.");
  console.log("\nActive Election: 2027 Nigerian Presidential Election");
  console.log("Candidates: Adebayo Olusegun (APC) | Emeka Chukwudi (PDP)");
  console.log("           Fatima Aliyu (LP)       | Chidi Okoro (NNPP)\n");
}

// Run it
seedAll().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
