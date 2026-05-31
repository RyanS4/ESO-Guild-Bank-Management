import { Box, Button, Checkbox, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Divider, FormControl, FormControlLabel, InputLabel, List, ListItem, ListItemButton, ListItemText, MenuItem, Select, Stack, TextField, Typography, Alert } from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'

function GuildAccessDialog({
  guildAccessGuild,
  closeGuildAccess,
  guildAccessError,
  guildAccessInviteSingleUse,
  setGuildAccessInviteSingleUse,
  guildAccessInviteExpiry,
  setGuildAccessInviteExpiry,
  inviteExpiryOptions,
  handleCreateGuildInvite,
  mutationPending,
  guildAccessInviteCode,
  handleRemoveGuildMember,
}) {
  return (
    <Dialog open={Boolean(guildAccessGuild)} onClose={closeGuildAccess}>
      <DialogTitle>Guild Access</DialogTitle>
      <DialogContent>
        {guildAccessGuild && (
          <Stack spacing={2} sx={{ mt: 1, minWidth: 360 }}>
            <Typography variant="subtitle1">{guildAccessGuild.name}</Typography>
            {guildAccessError && <Alert severity="error">{guildAccessError}</Alert>}
            <FormControlLabel
              control={
                <Checkbox
                  checked={guildAccessInviteSingleUse}
                  onChange={(event) => setGuildAccessInviteSingleUse(event.target.checked)}
                />
              }
              label="Single use"
            />
            <FormControl fullWidth>
              <InputLabel id="invite-expiry-label">Expire time</InputLabel>
              <Select
                labelId="invite-expiry-label"
                label="Expire time"
                value={guildAccessInviteExpiry}
                onChange={(event) => setGuildAccessInviteExpiry(event.target.value)}
              >
                {inviteExpiryOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
              <Button variant="contained" onClick={handleCreateGuildInvite} disabled={mutationPending}>
                Generate invite code
              </Button>
              <TextField
                label="Code"
                value={guildAccessInviteCode}
                placeholder="Generate a code"
                InputProps={{ readOnly: true }}
                sx={{ flexGrow: 1 }}
              />
            </Stack>
            <Stack spacing={1}>
              <Typography variant="subtitle2">Shared users</Typography>
              <List dense sx={{ border: 1, borderColor: 'divider', borderRadius: 1, py: 0 }}>
                {guildAccessGuild.members.map((member, index) => (
                  <Box key={member.userId}>
                    {index > 0 && <Divider component="li" />}
                    <ListItem disablePadding>
                      <ListItemButton
                        disabled={mutationPending || member.isOwner}
                        onClick={() => handleRemoveGuildMember(guildAccessGuild, member)}
                      >
                        <ListItemText
                          primary={member.username}
                          secondary={member.isOwner ? 'Owner' : 'Click to remove access'}
                        />
                        {member.isOwner ? <Chip size="small" label="Owner" /> : <DeleteIcon fontSize="small" />}
                      </ListItemButton>
                    </ListItem>
                  </Box>
                ))}
              </List>
            </Stack>
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={closeGuildAccess} disabled={mutationPending}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default GuildAccessDialog