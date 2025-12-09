# Environment Variables Setup

Create a `.env` file in the root directory with the following variables:

```env
BASECAMP_CLIENT_ID=940e6cb90c30464ef29fd42877da9f771edf26f8
BASECAMP_CLIENT_SECRET=933eabc064e25cb3d76f6f74c7a75a355e5aceee
BASECAMP_REDIRECT_URI=http://localhost:5173/auth/callback
SESSION_SECRET=your-random-secret-key-change-in-production

# Supabase Configuration
SUPABASE_URL=your-supabase-project-url
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

## Notes

- The `.env` file is already in `.gitignore` and will not be committed to version control
- `SESSION_SECRET` should be a random string for production (used for cookie encryption)
- Make sure `BASECAMP_REDIRECT_URI` matches the redirect URI configured in your Basecamp app settings
- `SUPABASE_URL` is your Supabase project URL (found in your Supabase project settings)
- `SUPABASE_SERVICE_ROLE_KEY` is your Supabase service role key (found in your Supabase project settings under API > Service Role key)
  - This key bypasses Row Level Security (RLS) and is used for server-side operations
  - Keep this key secure and never expose it to the client

## Database Setup

After setting up your Supabase project, you need to create the following tables:

### kanban_cards table

```sql
CREATE TABLE kanban_cards (
  id TEXT PRIMARY KEY,
  column_id TEXT NOT NULL,
  title TEXT NOT NULL,
  image_url TEXT,
  assignee TEXT,
  date_created TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  date_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  material TEXT,
  machine TEXT,
  due_date TEXT,
  content TEXT
);

CREATE INDEX idx_kanban_cards_column_id ON kanban_cards(column_id);
```

### kanban_config table

```sql
CREATE TABLE kanban_config (
  id TEXT PRIMARY KEY DEFAULT 'default',
  columns JSONB NOT NULL
);
```
