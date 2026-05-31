import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField } from '@mui/material'

function AuthDialog({
  authOpen,
  setAuthOpen,
  authMode,
  setAuthMode,
  authError,
  authDraft,
  setAuthDraft,
  authSubmitting,
  handleAuth,
}) {
  return (
    <Dialog open={authOpen} onClose={() => setAuthOpen(false)}>
      <DialogTitle>{authMode === 'login' ? 'Log in' : 'Create account'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1, minWidth: 320 }}>
          {authError && <Alert severity="error">{authError}</Alert>}
          <TextField
            label="Username"
            value={authDraft.username}
            onChange={(event) =>
              setAuthDraft((prev) => ({ ...prev, username: event.target.value }))
            }
            fullWidth
          />
          <TextField
            label="Password"
            type="password"
            value={authDraft.password}
            onChange={(event) =>
              setAuthDraft((prev) => ({ ...prev, password: event.target.value }))
            }
            helperText="Use at least 10 characters."
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'space-between', px: 3, pb: 2 }}>
        <Button
          onClick={() => {
            setAuthMode((prev) => (prev === 'login' ? 'signup' : 'login'))
            setAuthError('')
          }}
        >
          {authMode === 'login' ? 'Need an account?' : 'Have an account?'}
        </Button>
        <Button variant="contained" onClick={handleAuth} disabled={authSubmitting}>
          {authMode === 'login' ? 'Log in' : 'Create account'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default AuthDialog