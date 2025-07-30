-- Supabase Database Schema for Insurance Document Analysis

-- Enable Row Level Security
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';

-- Documents table
CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    total_pages INTEGER,
    analysis_status TEXT DEFAULT 'pending',
    analysis_completed_at TIMESTAMP WITH TIME ZONE
);

-- Findings table
CREATE TABLE IF NOT EXISTS findings (
    id SERIAL PRIMARY KEY,
    document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    page_num INTEGER NOT NULL,
    coordinates TEXT NOT NULL, -- JSON: [x0, y0, x1, y1]
    text_content TEXT NOT NULL,
    category TEXT NOT NULL,
    severity TEXT NOT NULL,
    summary TEXT NOT NULL,
    recommendation TEXT,
    confidence_score REAL DEFAULT 0.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cache table for temporary storage
CREATE TABLE IF NOT EXISTS cache (
    key TEXT PRIMARY KEY,
    value TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_findings_document_id ON findings(document_id);
CREATE INDEX IF NOT EXISTS idx_findings_category ON findings(category);
CREATE INDEX IF NOT EXISTS idx_findings_severity ON findings(severity);
CREATE INDEX IF NOT EXISTS idx_cache_created_at ON cache(created_at);

-- Enable Row Level Security (optional for public access)
-- ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE findings ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE cache ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (if RLS is enabled)
-- CREATE POLICY "Allow public read access" ON documents FOR SELECT USING (true);
-- CREATE POLICY "Allow public insert access" ON documents FOR INSERT WITH CHECK (true);
-- CREATE POLICY "Allow public read access" ON findings FOR SELECT USING (true);
-- CREATE POLICY "Allow public insert access" ON findings FOR INSERT WITH CHECK (true);
-- CREATE POLICY "Allow public read access" ON cache FOR SELECT USING (true);
-- CREATE POLICY "Allow public insert access" ON cache FOR INSERT WITH CHECK (true); 