import { Auth as SupabaseAuth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { supabase } from '../lib/supabaseClient'

const Auth = () => (
  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f8f9fa' }}>
    <div style={{ width: '320px', padding: '2rem', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)', borderRadius: '8px', backgroundColor: 'white' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '2rem', color: '#343a40' }}>GuardianAI</h2>
      <SupabaseAuth
        supabaseClient={supabase}
        appearance={{
          theme: ThemeSupa,
          style: {
            button: { background: '#28a745', color: 'white', borderColor: '#28a745' },
            anchor: { color: '#007bff' },
          },
        }}
        providers={[]}
      />
    </div>
  </div>
)

export default Auth