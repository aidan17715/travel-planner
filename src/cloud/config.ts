// The Supabase project that stores shared trips. Both values are safe to commit: the anon key is
// public by design, and the database policies in supabase/schema.sql are what protect the data.
// Leave them empty to run the app without sharing.
export const SUPABASE_URL: string = 'https://ddenlvllabzdewprbyop.supabase.co'
export const SUPABASE_ANON_KEY: string = 'sb_publishable_w-K9LIiCt5K38OVHu7tTRw_rFHOZ58N'

export const cloudConfigured = SUPABASE_URL !== '' && SUPABASE_ANON_KEY !== ''
