import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Stack, TextField, Typography } from '@mui/material'

function SettingsDialog({
  settingsOpen,
  closeSettings,
  mutationPending,
  settingsInviteError,
  settingsInviteCode,
  setSettingsInviteCode,
  handleRedeemInviteCode,
  handleOpenDeleteAccountFromSettings,
}) {
  return (
    <Dialog open={settingsOpen} onClose={closeSettings}>
      <DialogTitle>Settings</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1, minWidth: 340 }}>
          <Stack spacing={2}>
            <Typography variant="subtitle1">Join Shared Guild</Typography>
            {settingsInviteError && <Alert severity="error">{settingsInviteError}</Alert>}
            <TextField
              label="Invite code"
              value={settingsInviteCode}
              onChange={(event) => setSettingsInviteCode(event.target.value.toUpperCase())}
              placeholder="ABCD-EF12-3456"
              fullWidth
            />
            <Button variant="contained" onClick={handleRedeemInviteCode} disabled={mutationPending}>
              Join guild
            </Button>
          </Stack>
          <Divider />
          <Stack spacing={1.5}>
            <Typography variant="subtitle1">Account</Typography>
            <Button
              color="error"
              variant="outlined"
              onClick={handleOpenDeleteAccountFromSettings}
              disabled={mutationPending}
            >
              Delete account
            </Button>
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={closeSettings} disabled={mutationPending}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default SettingsDialog