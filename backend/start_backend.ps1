$env:DATABASE_URL = 'postgresql+asyncpg://postgres.hupqhiyxlghccdabqlrs:thandolwenkosi@aws-1-eu-west-1.pooler.supabase.com:6543/postgres'
$env:FIRMS_MAP_KEY = '17774b5a9e6ebbc6a3e485a2c1894905'
.\venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000

