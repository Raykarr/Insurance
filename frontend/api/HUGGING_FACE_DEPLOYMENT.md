# 🚀 Hugging Face Spaces Deployment Guide

## ✅ Why Hugging Face Spaces?

**Advantages over Vercel:**
- ✅ **No 4.5MB file size limit** - Can handle larger PDFs
- ✅ **Better Python support** - Native Python environment
- ✅ **Longer execution times** - Perfect for AI processing
- ✅ **GPU support** - Available if needed for ML models
- ✅ **Free tier** - Generous limits
- ✅ **Easy environment management** - Built-in secrets management

## 📁 Files Ready for Deployment

Your `frontend/api/` directory now contains all necessary files:

```
frontend/api/
├── app.py              # FastAPI application
├── requirements.txt    # Python dependencies
├── Dockerfile         # Container configuration
├── README.md          # Documentation
└── HUGGING_FACE_DEPLOYMENT.md  # This guide
```

## 🚀 Step-by-Step Deployment

### 1. Create Hugging Face Account
- Go to [huggingface.co](https://huggingface.co)
- Sign up for a free account

### 2. Create a New Space
- Click "New Space" on your profile
- Choose a name (e.g., `insurance-document-analyzer`)
- Select **"Docker"** as the SDK
- Choose **"Public"** or **"Private"**

### 3. Upload Files
Upload these files to your Space:
- `app.py`
- `requirements.txt`
- `Dockerfile`
- `README.md`

### 4. Configure Environment Variables
In your Space settings, add these secrets:
```
GROQ_API_KEY=your_groq_api_key
PINECONE_API_KEY=your_pinecone_api_key
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
HF_API_KEY=your_huggingface_api_key
```

### 5. Deploy
- Hugging Face will automatically build and deploy
- Wait for the build to complete (usually 2-5 minutes)
- Your API will be available at: `https://your-username-insurance-document-analyzer.hf.space`

## 🔧 Testing Your Deployment

### Health Check
```bash
curl https://your-username-insurance-document-analyzer.hf.space/health
```

### API Documentation
Visit: `https://your-username-insurance-document-analyzer.hf.space/docs`

## 🔄 Updating Your Frontend

Once deployed, update your frontend API base URL:

```typescript
// In frontend/src/lib/api.ts
const API_BASE_URL = 'https://your-username-insurance-document-analyzer.hf.space'
```

## 📊 Monitoring

- **Build logs**: Available in your Space settings
- **Runtime logs**: View in the Space interface
- **Usage metrics**: Available in your account dashboard

## 🛠️ Troubleshooting

### Common Issues:

1. **Build fails**: Check that all files are uploaded correctly
2. **Import errors**: Ensure `requirements.txt` has all dependencies
3. **Environment variables**: Verify all secrets are set correctly
4. **Port issues**: Make sure app runs on port 7860

### Debug Commands:
```bash
# Test locally first
cd frontend/api
python app.py

# Check if all imports work
python -c "import app; print('✅ All imports successful')"
```

## 🎉 Benefits You'll Get

- **No more 404 errors** - Proper Python runtime
- **No file size limits** - Handle large PDFs
- **Better performance** - Optimized for AI workloads
- **Reliable deployment** - No more Vercel issues
- **Easy scaling** - Upgrade to paid plan if needed

## 📝 Next Steps

1. **Deploy to Hugging Face Spaces**
2. **Test the API endpoints**
3. **Update frontend API URL**
4. **Monitor performance**
5. **Scale as needed**

Your FastAPI app is now ready for reliable deployment on Hugging Face Spaces! 🚀 