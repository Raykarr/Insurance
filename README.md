# 🏥 AI Insurance Document Analyzer

An intelligent web application that analyzes insurance documents using AI to identify potential policyholder concerns, exclusions, and important clauses.

## ✨ Features

- **📄 PDF Document Upload** - Upload insurance policies and certificates
- **🤖 AI-Powered Analysis** - Uses Groq LLM to analyze document content
- **🎯 Smart Finding Detection** - Identifies exclusions, limitations, deductibles, and more
- **📊 Interactive Dashboard** - View findings with severity levels and recommendations
- **💬 Contextual Chat** - Ask questions about specific findings
- **📱 Responsive Design** - Works on desktop and mobile devices
- **⚡ Real-time Processing** - Background analysis with progress tracking

## 🏗️ Architecture

```
Frontend (React + TypeScript)
├── Document Upload & Processing
├── Interactive Dashboard
├── PDF Viewer
└── Chat Interface

Backend (FastAPI + Python)
├── PDF Text Extraction
├── AI Analysis Engine
├── Database Operations
└── Vector Search (Pinecone)
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Python 3.8+
- API Keys for:
  - [Groq](https://console.groq.com/) (LLM)
  - [Supabase](https://supabase.com/) (Database)
  - [Pinecone](https://pinecone.io/) (Vector Search)
  - [Hugging Face](https://huggingface.co/) (Embeddings)

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/Raykarr/AI-Insurance-Document-Analyzer-Cloud.git
   cd AI-Insurance-Document-Analyzer-Cloud
   ```

2. **Set up the backend**
   ```bash
   cd backend-vercel
   pip install -r requirements.txt
   ```

3. **Set up the frontend**
   ```bash
   cd ../frontend
   npm install
   ```

4. **Configure environment variables**
   Create `.env` files in both `backend-vercel/` and `frontend/` directories:
   ```env
   GROQ_API_KEY=your_groq_api_key
   PINECONE_API_KEY=your_pinecone_api_key
   SUPABASE_URL=your_supabase_url
   SUPABASE_KEY=your_supabase_key
   HF_API_KEY=your_huggingface_api_key
   ```

5. **Start the development servers**
   ```bash
   # Backend (in backend-vercel directory)
   python app.py
   
   # Frontend (in frontend directory)
   npm run dev
   ```

6. **Open your browser**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000

## 🌐 Deployment

### Vercel Deployment (Recommended)

1. **Push to GitHub** - All files are ready for deployment
2. **Connect to Vercel** - Import your GitHub repository
3. **Set Environment Variables** - Add all API keys in Vercel dashboard
4. **Deploy** - Vercel will automatically build and deploy

See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for detailed instructions.

### Alternative: Hugging Face Spaces

For simpler deployment, consider using [Hugging Face Spaces](https://huggingface.co/spaces).

## 📊 Database Schema

The application uses Supabase with the following tables:

- `documents` - Document metadata and analysis status
- `findings` - AI-detected concerns and recommendations
- `cache` - Cached analysis results for performance

See [supabase-schema.sql](./supabase-schema.sql) for the complete schema.

## 🔧 API Endpoints

- `POST /ingest` - Upload and process PDF documents
- `GET /analysis/{id}` - Get analysis status
- `GET /findings/{id}` - Get analysis findings
- `GET /progress/{id}` - Get processing progress
- `POST /findings/{id}/chat` - Chat about specific findings
- `GET /health` - Health check

## 🎯 Analysis Categories

The AI analyzes documents for these types of concerns:

- **EXCLUSION** - Policy exclusions and limitations
- **DEDUCTIBLE** - Deductible amounts and conditions
- **COPAYMENT** - Copayment requirements
- **COINSURANCE** - Coinsurance percentages
- **WAITING_PERIOD** - Waiting periods for coverage
- **POLICYHOLDER_DUTY** - Policyholder obligations
- **CLAIM_PROCESS** - Claims filing requirements
- **NETWORK_RESTRICTION** - Network limitations
- **RENEWAL_RESTRICTION** - Renewal conditions

## 🛠️ Technology Stack

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Shadcn/ui** - UI components
- **React Query** - Data fetching
- **React Router** - Navigation

### Backend
- **FastAPI** - API framework
- **Python 3.8+** - Runtime
- **PyMuPDF** - PDF processing
- **Groq** - LLM integration
- **Pinecone** - Vector search
- **Supabase** - Database
- **Hugging Face** - Embeddings

## 📁 Project Structure

```
AI-Insurance-Document-Analyzer-Cloud/
├── frontend/                    # React frontend
│   ├── src/
│   │   ├── components/         # React components
│   │   ├── pages/             # Page components
│   │   ├── lib/               # Utilities and API
│   │   └── hooks/             # Custom hooks
│   ├── api/                   # Backend API (for Vercel)
│   │   ├── app.py            # FastAPI application
│   │   └── requirements.txt  # Python dependencies
│   └── vercel.json           # Vercel configuration
├── backend-vercel/            # Original backend
├── Diagrams/                  # Architecture diagrams
├── supabase-schema.sql       # Database schema
└── DEPLOYMENT_GUIDE.md       # Deployment instructions
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Groq](https://groq.com/) for fast LLM inference
- [Supabase](https://supabase.com/) for database and authentication
- [Pinecone](https://pinecone.io/) for vector search
- [Hugging Face](https://huggingface.co/) for embeddings
- [Vercel](https://vercel.com/) for deployment platform

## 📞 Support

If you encounter any issues:

1. Check the [deployment guide](./DEPLOYMENT_GUIDE.md)
2. Review the troubleshooting section
3. Open an issue on GitHub
4. Check the API health endpoint: `/health`

---

**Made with ❤️ for better insurance document analysis** 
