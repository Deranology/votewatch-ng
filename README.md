# VoteWatch NG 🇳🇬

**Transparent Real-Time E-Voting Platform for Nigeria**

[![Live Demo](https://img.shields.io/badge/Live-Demo-00C853?style=for-the-badge)](https://dpp7dtwwhn3ff.cloudfront.net)
[![AWS](https://img.shields.io/badge/AWS-Serverless-FF9900?style=for-the-badge&logo=amazon-aws)](https://aws.amazon.com)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?style=for-the-badge&logo=react)](https://react.dev)

**🔗 Live Demo:** https://dpp7dtwwhn3ff.cloudfront.net

---

## 🎯 Problem Statement

During Nigeria's last election, I personally witnessed a candidate win at our polling unit — confirmed by all voters present. However, by the time results were televised, a different candidate was declared the winner of that same polling unit. The manual vote collation process created opportunities for manipulation between the polling station and final announcement.

**VoteWatch NG** is my response to that experience.

---

## 💡 Solution

A serverless, real-time e-voting platform where:
- Every vote is **immediately visible** to all watchers nationwide
- Results are **cryptographically immutable** using AWS QLDB
- Voters cast ballots from home using their **VIN and voter card**
- Vote counts aggregate live across Nigeria's **5-tier electoral hierarchy**
- Any discrepancy between local count and announced results is **instantly detectable**

---

## 🏗️ Architecture

### Tech Stack

**Frontend:**
- React 18 (Vite)
- AWS Amplify
- Hosted on S3 + CloudFront (HTTPS)

**Backend:**
- **AWS AppSync** — GraphQL API with real-time subscriptions
- **AWS Lambda** — 3 serverless functions (Node.js 20)
- **Amazon DynamoDB** — 10 tables for hierarchical data
- **Amazon QLDB** — Immutable ledger for audit trail
- **Amazon Cognito** — User authentication

**Infrastructure:**
- AWS CDK for Infrastructure as Code
- All services within AWS Free Tier

---

## 📊 Features

### For Voters
- ✅ Register with email + password
- ✅ Verify identity with VIN and voter card number
- ✅ Cast one secure vote per election
- ✅ Receive cryptographic receipt with Vote ID and QLDB confirmation

### For Watchers (Public)
- ✅ View live results without authentication
- ✅ Drill down from National → State → LGA → Ward → Polling Unit
- ✅ Real-time updates via WebSocket subscriptions
- ✅ See leading candidate and vote percentages

### For Admins (INEC Officials)
- ✅ Create elections with time windows
- ✅ Add candidates with party affiliations
- ✅ Open and close voting portals instantly
- ✅ View immutable QLDB audit logs

---

## 🛡️ Security & Fraud Prevention

| Feature | Implementation |
|---------|---------------|
| **Double-vote prevention** | DynamoDB atomic transactions — vote written AND voter marked as voted simultaneously (both or neither) |
| **VIN privacy** | SHA-256 hashing — raw VIN never stored, only hash checked against mock INEC registry |
| **Vote anonymity** | Votes table does NOT contain voter identity — only QLDB audit trail links voter to vote (accessible only to authorized officials) |
| **Immutability** | QLDB cryptographic hash chain — any tampering mathematically detectable |
| **Authentication** | Cognito JWT tokens with 8+ char passwords (uppercase, lowercase, digit required) |

---

## 📁 Project Structure

```
votewatch-ng/
├── backend/
│   ├── infrastructure/
│   │   ├── votewatch-stack.js    # AWS CDK infrastructure
│   │   ├── package.json
│   │   └── cdk.json
│   ├── lambdas/
│   │   ├── castVote.js           # Vote casting with atomic transaction
│   │   ├── verifyVoter.js        # VIN verification
│   │   ├── getResults.js         # Results aggregation
│   │   └── package.json
│   ├── seed/
│   │   ├── seedMockData.js       # Populate DB with test data
│   │   └── package.json
│   └── schema.graphql            # AppSync GraphQL schema
├── frontend/
│   ├── src/
│   │   ├── App.jsx               # Complete React application
│   │   ├── main.jsx              # Entry point with Amplify config
│   │   ├── aws-config.js         # AWS credentials
│   │   └── ErrorBoundary.jsx     # Error handling
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
└── README.md
```

---

## 🚀 Deployment Guide

### Prerequisites

- Node.js 20+
- AWS Account
- AWS CLI configured with credentials
- AWS CDK installed globally (`npm install -g aws-cdk`)

### 1. Clone the Repository

```bash
git clone https://github.com/Deranology/votewatch-ng.git
cd votewatch-ng
```

### 2. Deploy Backend

```bash
# Install dependencies
cd backend/lambdas
npm install

cd ../infrastructure
npm install

# Bootstrap CDK (first time only)
cdk bootstrap

# Deploy to AWS
cdk deploy
```

**Save the 4 output values:**
- `UserPoolId`
- `UserPoolClientId`
- `GraphQLApiUrl`
- `GraphQLApiKey`

### 3. Seed Database

```bash
cd ../seed
npm install
node seedMockData.js
```

This creates:
- 5 States (Lagos, FCT Abuja, Kano, Rivers, Enugu)
- 42 LGAs
- 210 Wards
- 1,050 Polling Units
- 500 Mock Voters
- 1 Active Election
- 4 Presidential Candidates

### 4. Configure Frontend

Update `frontend/src/aws-config.js` with your CDK output values:

```javascript
export const awsConfig = {
  Auth: {
    Cognito: {
      userPoolId:       "YOUR_USER_POOL_ID",
      userPoolClientId: "YOUR_CLIENT_ID",
      region:           "us-east-1",
    },
  },
  API: {
    GraphQL: {
      endpoint: "YOUR_GRAPHQL_API_URL",
      region:   "us-east-1",
      defaultAuthMode: "userPool",
    },
  },
};

export const PUBLIC_API_KEY = "YOUR_API_KEY";
```

### 5. Deploy Frontend to S3

```bash
cd ../../frontend
npm install
npm run build

# Create S3 bucket
aws s3 mb s3://votewatch-ng-YOUR-NAME --region us-east-1

# Enable website hosting
aws s3 website s3://votewatch-ng-YOUR-NAME \
  --index-document index.html \
  --error-document index.html

# Disable block public access
aws s3api put-public-access-block \
  --bucket votewatch-ng-YOUR-NAME \
  --public-access-block-configuration \
  BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false

# Set bucket policy
aws s3api put-bucket-policy \
  --bucket votewatch-ng-YOUR-NAME \
  --policy file://policy.json

# Upload files
aws s3 sync dist/ s3://votewatch-ng-YOUR-NAME --delete
```

### 6. Add CloudFront for HTTPS (Recommended)

```bash
# Create CloudFront distribution
aws cloudfront create-distribution \
  --distribution-config file://cloudfront-config.json \
  --query "Distribution.DomainName" \
  --output text
```

This gives you an HTTPS URL that works in all browsers including Chrome.

---

## 🧪 Testing

### Test Credentials

Use any of these VIN and voter card combinations:

| VIN | Voter Card |
|-----|------------|
| AB00000000001 | VC0000000001 |
| AC00000000002 | VC0000000002 |
| AD00000000003 | VC0000000003 |
| AE00000000004 | VC0000000004 |
| AF00000000005 | VC0000000005 |

### Test Flow

1. Open https://dpp7dtwwhn3ff.cloudfront.net
2. Click "Cast Your Vote"
3. Register with any email + password (8+ chars, uppercase, lowercase, digit)
4. Enter VIN and voter card from table above
5. Select a candidate and vote
6. View your QLDB receipt
7. Click "Watch Live Results" to see real-time aggregation

---

## 📈 Data Model

### Nigeria's Electoral Hierarchy

```
National (1)
  └── States (5 in demo, 37 in production)
      └── LGAs (42 in demo, 774 in production)
          └── Wards (210 in demo)
              └── Polling Units (1,050 in demo, 176,000+ in production)
```

### DynamoDB Tables

| Table | Purpose |
|-------|---------|
| votewatch-states | 5 Nigerian states |
| votewatch-lgas | LGAs linked to states (GSI: stateId-index) |
| votewatch-wards | Wards linked to LGAs (GSI: lgaId-index) |
| votewatch-polling-units | Polling units linked to wards (GSI: wardId-index) |
| votewatch-voters | Voter records with verification status and hasVoted flag (GSI: vinHash-index) |
| votewatch-inec-mock | Mock INEC voter registry (VIN and card hashes only) |
| votewatch-elections | Election portals with UPCOMING/OPEN/CLOSED status |
| votewatch-candidates | Candidates per election (GSI: electionId-index) |
| votewatch-votes | Individual vote records (NO voter identity for privacy) |
| votewatch-aggregates | Pre-computed running totals at all 5 hierarchy levels |

### QLDB Ledger

**Table:** `AuditVotes`
- Only place linking voter ID to vote
- Cryptographic hash chain prevents tampering
- Accessible only to authorized officials
- Cannot be deleted or modified (even by AWS root)

---

## 💰 Cost Breakdown

**Demo deployment (within AWS Free Tier):**

| Service | Free Tier | Demo Usage | Cost |
|---------|-----------|------------|------|
| DynamoDB | 25 GB storage, 25 WCU/RCU | 10 tables, <1 GB | $0 |
| Lambda | 1M requests/month | ~1,000 requests | $0 |
| AppSync | 250K requests/month | ~500 requests | $0 |
| Cognito | 50K MAU | 10 test users | $0 |
| S3 | 5 GB storage (12 months) | <1 MB | $0 |
| CloudFront | 1 TB transfer (12 months) | <10 MB | $0 |
| **Total** | | | **$0/month** |

**Production scale (1M voters, high turnout):**
- DynamoDB: ~$50/month
- Lambda: ~$30/month  
- AppSync: ~$40/month
- S3/CloudFront: ~$20/month
- **Total: ~$140/month** for nationwide deployment

---

## 🎓 What I Learned

This project was my first major AWS deployment after earning my **AWS Solutions Architect Associate** certification. Key learnings:

**Technical:**
- AppSync subscriptions for real-time data push (vs polling)
- DynamoDB atomic transactions for data integrity
- QLDB's immutable ledger for audit trails
- CDK Infrastructure as Code patterns
- Lambda cold start optimization
- Cognito user pool configuration
- CloudFront CDN setup for HTTPS delivery

**Architectural:**
- When to use DynamoDB vs QLDB
- Pre-computing aggregates vs on-demand queries
- Separating voter identity from vote records for privacy
- Hierarchical data modeling for electoral geography
- Serverless cost optimization strategies
- Multi-AZ deployment for high availability

**Product:**
- Building for a real problem I personally experienced
- Balancing transparency with voter privacy
- Designing for scale (176K polling units nationwide)
- Creating intuitive UX for non-technical voters

---

## 🚧 Roadmap

### Phase 1: Proof of Concept ✅
- [x] Complete backend architecture
- [x] Frontend with all user flows
- [x] Live deployment with HTTPS
- [x] Mock INEC verification
- [x] Error boundary for graceful failures

### Phase 2: Production Hardening (Future)
- [ ] Real INEC API integration
- [ ] Biometric verification (fingerprint)
- [ ] React Native mobile app
- [ ] All 36 states + FCT (774 LGAs, 176K polling units)
- [ ] Independent security audit
- [ ] Offline vote buffering for low-connectivity areas
- [ ] Unit and integration tests

### Phase 3: Government Engagement (Future)
- [ ] Pilot with one state electoral commission
- [ ] INEC stakeholder presentations
- [ ] International observer access portal
- [ ] Multi-election support (Presidential, Gubernatorial, Senatorial)

---

## 🤝 Contributing

This is currently a portfolio/demonstration project. If you'd like to contribute or discuss production deployment:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

## 👤 About Me

**Chidera Alamezie | AWS Solutions Architect Associate**

I built VoteWatch NG after personally witnessing election fraud in Nigeria's last election. This project demonstrates:
- Full-stack AWS serverless architecture
- Real-time data synchronization at scale
- Cryptographic immutability for high-stakes data
- Product thinking beyond engineering
- End-to-end deployment on AWS Free Tier

🔗 **Live Demo:** https://dpp7dtwwhn3ff.cloudfront.net  
💻 **GitHub:** https://github.com/Deranology/votewatch-ng  
📧 **Email:** chideraalamezieprince@gmail.com  
💼 **LinkedIn:** www.linkedin.com/in/alamezie-chidera-36a2a71b4


---

## 🙏 Acknowledgments

- **INEC** — Nigeria's Independent National Electoral Commission (for electoral hierarchy structure)
- **AWS** — For Free Tier making this demo possible
- **Nigerian voters** — Who deserve transparent, fraud-proof elections

---

## 📸 Screenshots

### Landing Page
![Landing Page](screenshots/landing.png)

### Voter Verification
![VIN Verification](screenshots/verification.png)

### Vote Receipt
![QLDB Receipt](screenshots/receipt.png)

### Live Results Dashboard
![Results Dashboard](screenshots/results.png)

---

**VoteWatch NG** — *Transparency. Integrity. Real-Time Democracy.* 🇳🇬

