import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import Database from 'better-sqlite3'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'

const serverPort = 3101
const serverOrigin = `http://127.0.0.1:${serverPort}`
const requestHeaders = {
  Origin: 'http://localhost:5173',
  'X-Requested-With': 'XMLHttpRequest',
}

let tempDirectory
let databaseFile
let serverProcess

class SessionClient {
  constructor() {
    this.cookieHeader = ''
  }

  async request(targetPath, { method = 'GET', body } = {}) {
    const headers = { ...requestHeaders }
    if (this.cookieHeader) {
      headers.Cookie = this.cookieHeader
    }
    if (body) {
      headers['Content-Type'] = 'application/json'
    }

    const response = await fetch(`${serverOrigin}${targetPath}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })

    const setCookie = response.headers.get('set-cookie')
    if (setCookie) {
      this.cookieHeader = setCookie.split(';', 1)[0]
    }

    const payload = response.status === 204 ? null : await response.json()
    return { response, payload }
  }
}

function waitForServerReady(childProcess) {
  return new Promise((resolve, reject) => {
    let settled = false
    const timeoutId = setTimeout(() => {
      if (!settled) {
        settled = true
        reject(new Error('Timed out waiting for test server to start.'))
      }
    }, 10000)

    childProcess.stdout.on('data', (chunk) => {
      const text = chunk.toString()
      if (!settled && text.includes('ESO Guild Bank API listening')) {
        settled = true
        clearTimeout(timeoutId)
        resolve()
      }
    })

    childProcess.stderr.on('data', (chunk) => {
      if (!settled) {
        settled = true
        clearTimeout(timeoutId)
        reject(new Error(chunk.toString()))
      }
    })

    childProcess.on('exit', (code) => {
      if (!settled) {
        settled = true
        clearTimeout(timeoutId)
        reject(new Error(`Test server exited early with code ${code}.`))
      }
    })
  })
}

async function waitForCondition(check, { timeoutMs = 10000, intervalMs = 100 } = {}) {
  const startTime = Date.now()

  while (Date.now() - startTime < timeoutMs) {
    if (await check()) {
      return
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }

  throw new Error('Timed out waiting for condition.')
}

describe('auth and guild sharing flows', () => {
  before(async () => {
    tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'eso-guild-bank-tests-'))
    databaseFile = path.join(tempDirectory, 'guild-bank-test.db')

    serverProcess = spawn('node', ['server/index.js'], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        NODE_ENV: 'test',
        PORT: String(serverPort),
        DATABASE_FILE: databaseFile,
        BACKUP_MIN_INTERVAL_MS: '0',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    await waitForServerReady(serverProcess)
  })

  after(async () => {
    if (serverProcess && !serverProcess.killed) {
      serverProcess.kill()
      await new Promise((resolve) => serverProcess.once('exit', resolve))
    }

    if (tempDirectory) {
      await fs.rm(tempDirectory, { recursive: true, force: true })
    }
  })

  it('supports signup and login', async () => {
    const user = new SessionClient()

    const signUpResult = await user.request('/api/auth/signup', {
      method: 'POST',
      body: { username: 'owner_user', password: 'password1234' },
    })

    assert.equal(signUpResult.response.status, 201)
    assert.equal(signUpResult.payload.user.username, 'owner_user')

    const sessionResult = await user.request('/api/session')
    assert.equal(sessionResult.response.status, 200)
    assert.equal(sessionResult.payload.user.username, 'owner_user')

    const logoutResult = await user.request('/api/auth/logout', { method: 'POST' })
    assert.equal(logoutResult.response.status, 204)

    const loginResult = await user.request('/api/auth/login', {
      method: 'POST',
      body: { username: 'owner_user', password: 'password1234' },
    })

    assert.equal(loginResult.response.status, 200)
    assert.equal(loginResult.payload.user.username, 'owner_user')
  })

  it('returns a JSON error when a username is already in use', async () => {
    const firstUser = new SessionClient()
    const secondUser = new SessionClient()

    const firstSignUp = await firstUser.request('/api/auth/signup', {
      method: 'POST',
      body: { username: 'taken_name', password: 'password1234' },
    })
    assert.equal(firstSignUp.response.status, 201)

    const duplicateSignUp = await secondUser.request('/api/auth/signup', {
      method: 'POST',
      body: { username: 'taken_name', password: 'password1234' },
    })

    assert.equal(duplicateSignUp.response.status, 409)
    assert.equal(duplicateSignUp.response.headers.get('content-type'), 'application/json; charset=utf-8')
    assert.equal(
      duplicateSignUp.payload.error,
      'That username is already in use. Choose a different username or log in instead.',
    )
  })

  it('supports guild invite, join, leave, and owner removal flows', async () => {
    const owner = new SessionClient()
    const member = new SessionClient()
    const removedMember = new SessionClient()

    const ownerSignUp = await owner.request('/api/auth/signup', {
      method: 'POST',
      body: { username: 'guild_owner', password: 'password1234' },
    })
    assert.equal(ownerSignUp.response.status, 201)

    const guildCreate = await owner.request('/api/guilds', {
      method: 'POST',
      body: { name: 'Shared Guild', weekStartDate: '2026-05-31' },
    })
    assert.equal(guildCreate.response.status, 201)
    const guildId = guildCreate.payload.user.selectedGuildId

    const memberSignUp = await member.request('/api/auth/signup', {
      method: 'POST',
      body: { username: 'shared_member', password: 'password1234' },
    })
    assert.equal(memberSignUp.response.status, 201)

    const inviteCreate = await owner.request(`/api/guilds/${guildId}/invites`, {
      method: 'POST',
      body: { singleUse: false, expiresInHours: 24 },
    })
    assert.equal(inviteCreate.response.status, 201)
    assert.ok(inviteCreate.payload.code)

    const inviteRedeem = await member.request('/api/invites/redeem', {
      method: 'POST',
      body: { code: inviteCreate.payload.code },
    })
    assert.equal(inviteRedeem.response.status, 200)
    assert.equal(inviteRedeem.payload.user.selectedGuildId, guildId)
    assert.equal(
      inviteRedeem.payload.user.guilds.some((guild) => guild.id === guildId),
      true,
    )

    const ownerSessionAfterJoin = await owner.request('/api/session')
    const ownerGuildAfterJoin = ownerSessionAfterJoin.payload.user.guilds.find((guild) => guild.id === guildId)
    assert.equal(ownerGuildAfterJoin.members.some((guildMember) => guildMember.username === 'shared_member'), true)

    const leaveResult = await member.request(`/api/guilds/${guildId}/membership`, {
      method: 'DELETE',
    })
    assert.equal(leaveResult.response.status, 200)
    assert.equal(leaveResult.payload.user.guilds.some((guild) => guild.id === guildId), false)

    const ownerSessionAfterLeave = await owner.request('/api/session')
    const ownerGuildAfterLeave = ownerSessionAfterLeave.payload.user.guilds.find((guild) => guild.id === guildId)
    assert.equal(ownerGuildAfterLeave.members.some((guildMember) => guildMember.username === 'shared_member'), false)

    const removedMemberSignUp = await removedMember.request('/api/auth/signup', {
      method: 'POST',
      body: { username: 'removed_member', password: 'password1234' },
    })
    assert.equal(removedMemberSignUp.response.status, 201)

    const secondRedeem = await removedMember.request('/api/invites/redeem', {
      method: 'POST',
      body: { code: inviteCreate.payload.code },
    })
    assert.equal(secondRedeem.response.status, 200)
    assert.equal(secondRedeem.payload.user.guilds.some((guild) => guild.id === guildId), true)

    const ownerSessionBeforeRemoval = await owner.request('/api/session')
    const ownerGuildBeforeRemoval = ownerSessionBeforeRemoval.payload.user.guilds.find((guild) => guild.id === guildId)
    const removableMember = ownerGuildBeforeRemoval.members.find((guildMember) => guildMember.username === 'removed_member')
    assert.ok(removableMember)

    const removeResult = await owner.request(`/api/guilds/${guildId}/members/${removableMember.userId}`, {
      method: 'DELETE',
    })
    assert.equal(removeResult.response.status, 200)
    const ownerGuildAfterRemoval = removeResult.payload.user.guilds.find((guild) => guild.id === guildId)
    assert.equal(ownerGuildAfterRemoval.members.some((guildMember) => guildMember.username === 'removed_member'), false)

    const removedMemberSession = await removedMember.request('/api/session')
    assert.equal(removedMemberSession.payload.user.guilds.some((guild) => guild.id === guildId), false)

    const backupDirectory = path.join(path.dirname(databaseFile), 'backups')
    await waitForCondition(async () => {
      const backupFiles = await fs.readdir(backupDirectory).catch(() => [])
      return backupFiles.some((fileName) => fileName.endsWith('.db'))
    })

    const testDb = new Database(databaseFile, { readonly: true })
    const auditActions = testDb.prepare('SELECT action FROM audit_logs ORDER BY id ASC').all()
    testDb.close()

    const actionNames = auditActions.map((row) => row.action)
    assert.equal(actionNames.includes('guild.create'), true)
    assert.equal(actionNames.includes('guild.invite_create'), true)
    assert.equal(actionNames.includes('guild.invite_redeem'), true)
    assert.equal(actionNames.includes('guild.leave'), true)
    assert.equal(actionNames.includes('guild.member_remove'), true)
  })
})
