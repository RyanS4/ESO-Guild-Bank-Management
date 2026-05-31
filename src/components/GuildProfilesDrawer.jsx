import { Button, Divider, Drawer, IconButton, List, ListItem, ListItemButton, ListItemText, Stack, TextField, Typography } from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import ExitToAppIcon from '@mui/icons-material/ExitToApp'
import GroupAddIcon from '@mui/icons-material/GroupAdd'

function GuildProfilesDrawer({
  currentUser,
  guildDrawerWidth,
  newGuildName,
  setNewGuildName,
  handleCreateGuild,
  mutationPending,
  handleOpenGuildAccess,
  handleRenameGuild,
  handleDeleteGuild,
  handleLeaveGuild,
  handleSelectGuild,
}) {
  if (!currentUser) {
    return null
  }

  return (
    <Drawer
      anchor="right"
      variant="permanent"
      sx={{
        width: guildDrawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: guildDrawerWidth,
          boxSizing: 'border-box',
          p: 2,
          top: { xs: 56, sm: 64 },
          height: { xs: 'calc(100% - 56px)', sm: 'calc(100% - 64px)' },
        },
      }}
    >
      <Typography variant="h6" sx={{ mt: 1 }}>
        Guild Profiles
      </Typography>
      <Stack direction="row" spacing={1} sx={{ my: 2 }}>
        <TextField
          size="small"
          label="New guild"
          value={newGuildName}
          onChange={(event) => setNewGuildName(event.target.value)}
          fullWidth
        />
        <Button variant="contained" onClick={handleCreateGuild} disabled={mutationPending}>
          Add
        </Button>
      </Stack>
      <Divider sx={{ mb: 1 }} />
      <List dense>
        {currentUser.guilds?.map((guild) => (
          <ListItem
            key={guild.id}
            disablePadding
            secondaryAction={
              <Stack direction="row" spacing={0.5}>
                {guild.isOwner && (
                  <>
                    <IconButton edge="end" onClick={() => handleOpenGuildAccess(guild.id)}>
                      <GroupAddIcon fontSize="small" />
                    </IconButton>
                    <IconButton edge="end" onClick={() => handleRenameGuild(guild.id, guild.name)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton edge="end" onClick={() => handleDeleteGuild(guild.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </>
                )}
                {!guild.isOwner && (
                  <IconButton edge="end" onClick={() => handleLeaveGuild(guild)} disabled={mutationPending}>
                    <ExitToAppIcon fontSize="small" />
                  </IconButton>
                )}
              </Stack>
            }
          >
            <ListItemButton
              selected={guild.id === currentUser.selectedGuildId}
              onClick={() => handleSelectGuild(guild.id)}
            >
              <ListItemText
                primary={guild.name}
                secondary={`${guild.entries.length} entries${guild.isOwner ? ' • Owner' : ` • Shared by ${guild.ownerUsername}`}`}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Drawer>
  )
}

export default GuildProfilesDrawer