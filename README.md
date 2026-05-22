# CogniCare - AI-Powered Mental Health Practice Management System

CogniCare is a comprehensive practice management system designed for mental health professionals, integrating AI capabilities to enhance clinical workflows and patient care.

## Features

### Core Features

- **Client Management**: Comprehensive client profiles with demographic, clinical, and billing information
- **Session Documentation**: AI-assisted session notes and progress tracking
- **Billing & Invoicing**: Automated invoice generation and payment tracking
- **Document Management**: Secure storage and organization of clinical documents
- **AI Integration**: Multiple AI agents for different aspects of mental health practice
- **Audit Logging**: Comprehensive activity tracking for security and compliance

### AI Agents

1. **Assessment Agent**: Evaluates client needs and recommends appropriate interventions
2. **Diagnostic Agent**: Assists in clinical diagnosis and treatment planning
3. **Treatment Agent**: Provides evidence-based treatment recommendations
4. **Progress Agent**: Tracks and analyzes client progress over time
5. **Documentation Agent**: Assists with clinical documentation and note-taking
6. **Conversational Agent**: Provides general support and information

### Security Features

- **Role-Based Access Control**: Different access levels for counselors and admins
- **Audit Logging**: Tracks all system activities including:
  - User logins/logouts
  - Client data access and modifications
  - Session documentation changes
  - Invoice generation and updates
  - Document uploads and downloads
- **Data Encryption**: Secure storage of sensitive information
- **HIPAA Compliance**:
  - End-to-end encryption for all data
  - Secure authentication and authorization
  - Comprehensive audit trails
  - Automatic session timeouts
  - Secure data backup and recovery
  - Business Associate Agreement (BAA) support
  - Minimum Necessary Rule implementation
  - Data access controls and restrictions
  - Secure messaging and file sharing
  - Regular security assessments and updates

## Technical Stack

### Frontend

- Next.js 14 with App Router
- React 18
- Tailwind CSS for styling
- NextAuth.js for authentication

### Backend

- Next.js API Routes
- MongoDB with Mongoose ODM
- Google Cloud Storage for document storage

### AI Integration

- OpenAI GPT-4 for AI agents
- Custom prompt engineering for mental health context
- Vector embeddings for semantic search

### Security

- JWT-based authentication
- Role-based access control
- Comprehensive audit logging
- Secure file storage
- HIPAA-compliant data handling

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB
- Google Cloud Storage account
- OpenAI API key

### Environment Variables

Create a `.env.local` file with the following variables:

```env
# MongoDB
MONGODB_URI=your_mongodb_uri

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Google Cloud Storage
GOOGLE_CLOUD_PROJECT_ID=your_project_id
GOOGLE_CLOUD_CLIENT_EMAIL=your_client_email
GOOGLE_CLOUD_PRIVATE_KEY=your_private_key
GOOGLE_CLOUD_BUCKET_NAME=your_bucket_name
```

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```

## Usage

### Client Management

- Create and manage client profiles
- Track client progress and treatment plans
- Generate and manage invoices
- Store and organize clinical documents

### Session Documentation

- Create session notes with AI assistance
- Track client progress over time
- Generate treatment plans and recommendations

### Billing & Invoicing

- Set up billing rates for different session types
- Generate professional invoices
- Track payment status
- Export billing reports

### Document Management

- Upload and organize clinical documents
- Secure document storage
- Document version control
- Easy document retrieval

### Audit Logging

- View comprehensive activity logs in the Admin section
- Filter logs by:
  - User ID
  - Entity type (client, session, invoice, document)
  - Action type (create, read, update, delete)
  - Date range
- Track IP addresses and user agents
- Monitor system access and changes

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- OpenAI for GPT-4 integration
- Next.js team for the amazing framework
- MongoDB for the database solution
- Google Cloud for storage services

## What's New

### Enhanced Security

- Session timeout for inactivity
- Improved audit logging
- Role-based access control

### Billing Improvements

- Multiple rate types (standard, initial, group)
- Automated invoice generation
- Payment status tracking
- Payment reminder system
- Detailed invoice PDFs

### Document Management

- Secure document storage
- Consent form management
- Document versioning
- Electronic signatures

### Client Management

- Comprehensive client profiles
- Session tracking
- Billing history
- Document management

### Admin Features

- Audit logging system
- User management
- Role-based permissions
- Activity monitoring

### Technical Improvements

- PDF generation
- Email notifications
- Secure file storage
- Real-time updates

# Test credit card numbers

Visa 4242424242424242 Any 3 digits Any future date
Visa (debit) 4000056655665556 Any 3 digits Any future date

# AI Pricing Strategy (internal)

OpenAI API Costs
* GPT-4: ~$0.03/1K tokens input, ~$0.06/1K tokens output
* Average therapy session note: ~500-1000 tokens
* 6 AI agents per session = ~3000-6000 tokens
* Per session cost: ~$0.18-$0.36
* 20 sessions/month = ~$3.60-$7.20
* 100 sessions/month = ~$18-$36
