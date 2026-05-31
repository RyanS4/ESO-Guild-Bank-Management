import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField } from '@mui/material'

function DeleteAccountDialog({
  deleteAccountOpen,
  mutationPending,
  setDeleteAccountOpen,
  deleteAccountDraft,
  setDeleteAccountDraft,
  deleteAccountError,
  setDeleteAccountError,
  handleDeleteAccount,
}) {
  return (
    <Dialog
      open={deleteAccountOpen}
      onClose={() => {
        if (mutationPending) {
          return
        }

        setDeleteAccountOpen(false)
        setDeleteAccountDraft({ password: '' })
        setDeleteAccountError('')
      }}
    >
      <DialogTitle>Delete Account</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1, minWidth: 320 }}>
          <Alert severity="warning">
            This permanently deletes your account, guilds, entries, and active session.
          </Alert>
          {deleteAccountError && <Alert severity="error">{deleteAccountError}</Alert>}
          <TextField
            label="Confirm password"
            type="password"
            value={deleteAccountDraft.password}
            onChange={(event) => setDeleteAccountDraft({ password: event.target.value })}
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          onClick={() => {
            setDeleteAccountOpen(false)
            setDeleteAccountDraft({ password: '' })
            setDeleteAccountError('')
          }}
          disabled={mutationPending}
        >
          Cancel
        </Button>
        <Button color="error" variant="contained" onClick={handleDeleteAccount} disabled={mutationPending}>
          Delete account
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default DeleteAccountDialog