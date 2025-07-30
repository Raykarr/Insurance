# 🚀 Vercel Deployment Guide

## Overview
This guide will help you deploy your Insurance Document Analysis app to Vercel. You can deploy both frontend and backend from a single repository.

## 📋 Prerequisites

1. **GitHub Account** - Your code should be in a GitHub repository
2. **Vercel Account** - Sign up at [vercel.com](https://vercel.com)
3. **API Keys** - You'll need these environment variables:
   - `GROQ_API_KEY`
   - `PINECONE_API_KEY` 
   - `SUPABASE_URL`
   - `SUPABASE_KEY`
   - `HF_API_KEY`

## 🎯 Option 1: Single Repository Deployment (Recommended)

### Step 1: Prepare Your Repository

Your repository structure should look like this:
```
your-repo/
├── frontend/           # React frontend
│   ├── src/
│   ├── api/           # Backend API (copied from backend-vercel)
│   │   ├── app.py
│   │   └── requirements.txt
│   ├── vercel.json
│   └── package.json
├── backend-vercel/     # Original backend (for reference)
└── README.md
```

### Step 2: Deploy to Vercel

1. **Connect to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Select the repository containing your code

2. **Configure Project Settings:**
   - **Framework Preset:** Vite
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`

3. **Set Environment Variables:**
   In the Vercel dashboard, go to Settings → Environment Variables and add:
   ```
   GROQ_API_KEY=your_groq_api_key
   PINECONE_API_KEY=your_pinecone_api_key
   SUPABASE_URL=your_supabase_url
   SUPABASE_KEY=your_supabase_key
   HF_API_KEY=your_huggingface_api_key
   VITE_API_URL=https://your-vercel-domain.vercel.app/api
   ```

4. **Deploy:**
   - Click "Deploy"
   - Vercel will automatically build and deploy your app

### Step 3: Update Frontend API URL

After deployment, update the `VITE_API_URL` environment variable to point to your deployed domain:
```
VITE_API_URL=https://your-app-name.vercel.app/api
```

## 🎯 Option 2: Separate Repositories

If you prefer separate repositories:

### Backend Repository
1. Create a new GitHub repository for the backend
2. Copy the `backend-vercel` folder contents
3. Deploy to Vercel as a Python function
4. Get the backend URL (e.g., `https://your-backend.vercel.app`)

### Frontend Repository  
1. Create a new GitHub repository for the frontend
2. Copy the `frontend` folder contents
3. Set `VITE_API_URL` to your backend URL
4. Deploy to Vercel

## 🔧 Configuration Files

### Frontend Vercel Config (`frontend/vercel.json`)
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/api/$1"
    }
  ],
  "functions": {
    "api/app.py": {
      "maxDuration": 300
    }
  }
}
```

### Backend Vercel Config (`backend-vercel/vercel.json`)
```json
{
  "version": 2,
  "builds": [
    {
      "src": "app.py",
      "use": "@vercel/python"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "app.py"
    }
  ],
  "functions": {
    "app.py": {
      "maxDuration": 300
    }
  }
}
```

## 🌐 Alternative: Hugging Face Spaces

If Vercel deployment is complex, Hugging Face Spaces might be easier:

### Advantages of HF Spaces:
- ✅ Simpler deployment process
- ✅ Built-in support for Python backends
- ✅ Free tier available
- ✅ Automatic HTTPS
- ✅ Easy environment variable management

### Deployment Steps:
1. Go to [huggingface.co/spaces](https://huggingface.co/spaces)
2. Click "Create new Space"
3. Choose "Gradio" or "Streamlit" for the frontend
4. Upload your code
5. Set environment variables in the Space settings

## 🚨 Troubleshooting

### Common Issues:

1. **Build Failures:**
   - Check that all dependencies are in `requirements.txt`
   - Ensure Python version compatibility

2. **API Connection Errors:**
   - Verify `VITE_API_URL` is set correctly
   - Check CORS settings in backend

3. **Environment Variables:**
   - Ensure all API keys are set in Vercel dashboard
   - Check for typos in variable names

4. **File Upload Issues:**
   - Vercel has a 4.5MB file size limit for serverless functions
   - Consider using external storage for larger files

### Debug Commands:
```bash
# Test backend locally
cd backend-vercel
python app.py

# Test frontend locally  
cd frontend
npm run dev

# Check API health
curl https://your-app.vercel.app/api/health
```

## 📞 Support

If you encounter issues:
1. Check Vercel deployment logs
2. Verify all environment variables are set
3. Test API endpoints individually
4. Check browser console for frontend errors

## 🎉 Success!

Once deployed, your app will be available at:
- **Frontend:** `https://your-app-name.vercel.app`
- **API:** `https://your-app-name.vercel.app/api`

The app will automatically handle both frontend and backend requests through Vercel's serverless functions. 