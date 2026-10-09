import 'dotenv/config'
import assert from 'node:assert/strict'
import { randomBytes, randomUUID } from 'node:crypto'
import { once } from 'node:events'
import mongoose from 'mongoose'
import Admin from '../src/models/Admin.js'
import AssistantPost from '../src/models/AssistantPost.js'
import Job from '../src/models/Job.js'
import Scholarship from '../src/models/Scholarship.js'
import Opportunity from '../src/models/Opportunity.js'
import { POST_FIELDS } from '../src/validation/ai-posts.js'
import { hashPassword } from '../src/auth/passwords.js'

// Never use the configured production database for verification writes.
// The URI remains private; the uniquely named database is created and dropped here.
const databaseName = 'bigi_verify_publication_' + randomUUID().replaceAll('-', '')
let server, ownsDatabase = false, transactionSupported = false
try {
  assert.ok(process.env.MONGODB_URI, 'Database is not configured')
  await mongoose.connect(process.env.MONGODB_URI, { dbName: databaseName, serverSelectionTimeoutMS: 7000 })
  const hello = await mongoose.connection.db.admin().command({ hello: 1 })
  const topologySupportsTransactions = Boolean(hello.setName || hello.msg === 'isdbgrid') && hello.logicalSessionTimeoutMinutes !== undefined
  console.log(JSON.stringify({ topologySupportsTransactions }))
  if (!process.argv.includes('--write-fixtures')) {
    console.log('Read-only topology check complete. Use --write-fixtures for isolated real-model/API verification.')
  } else {
    assert.deepEqual(await mongoose.connection.db.listCollections({}, { nameOnly: true }).toArray(), [])
    ownsDatabase = true
    process.env.NODE_ENV = 'test'
    process.env.ADMIN_ORIGINS = 'http://localhost:5174'
    process.env.ADMIN_JWT_SECRET = randomBytes(48).toString('hex')
    const { default: app } = await import('../src/app.js')
    const { COOKIE_NAME, issueToken } = await import('../src/auth/session.js')
    const admin = await Admin.create({ email: 'publication-check@example.invalid', passwordHash: await hashPassword(randomBytes(24).toString('hex')) })
    await Promise.all([Job.init(), Scholarship.init(), Opportunity.init(), AssistantPost.init()])
    const session = await mongoose.startSession()
    try {
      session.startTransaction()
      await AssistantPost.findOne().session(session).maxTimeMS(3000)
      await session.abortTransaction()
      transactionSupported = true
    } catch (error) {
      if (session.inTransaction()) await session.abortTransaction().catch(() => {})
      if (error.code !== 20 && error.codeName !== 'IllegalOperation') throw error
    } finally { await session.endSession() }
    console.log(JSON.stringify({ realTransactionSupported: transactionSupported }))
    server = app.listen(0, '127.0.0.1'); await once(server, 'listening')
    const base = `http://127.0.0.1:${server.address().port}/api`
    const send = (path, method = 'GET', body) => fetch(base + path, { method,
      headers: { Origin: 'http://localhost:5174', Cookie: COOKIE_NAME + '=' + issueToken(admin), ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
    for (const [destination, Model] of [['jobs', Job], ['opportunities', Opportunity], ['scholarships', Scholarship]]) {
      const fields = { ...Object.fromEntries(Object.keys(POST_FIELDS).map(key => [key, ''])),
        title: 'Publication verification ' + destination, organization: 'Test fixture', location: 'Nigeria', description: 'Isolated verification fixture', jobType: 'Full-time' }
      const draft = await AssistantPost.create({ postType: 'Other', fields, extractedFields: fields, createdBy: admin._id, sourceText: 'Verification original source', sourceImage: { name: 'fixture.png', mimeType: 'image/png', data: Buffer.from('fixture image bytes') } })
      const saved = await send('/admin/ai-posts/' + draft._id, 'PATCH', { revision: 0, postType: 'Other', fields, deadlineDate: '', destination, opportunityCategory: destination === 'opportunities' ? 'Training' : '' })
      assert.equal(saved.status, 200)
      const reviewed = (await saved.json()).data
      const approval = await send(`/admin/ai-posts/${draft._id}/approve`, 'POST', { revision: reviewed.revision, confirmed: true })
      assert.equal(approval.status, 200)
      const approved = (await approval.json()).data
      const response = await send(`/admin/ai-posts/${draft._id}/publish`, 'POST', { revision: approved.revision })
      assert.equal(response.status, 200)
      const published = (await response.json()).data
      const record = await Model.findById(published.publicRecordId)
      assert.ok(record); assert.equal(String(record.assistantPostId), String(draft._id)); assert.equal(record.publicationPending, false)
      assert.equal((await send(`/${destination}`)).status, 200)
      const list = await (await send(`/${destination}`)).json()
      assert.ok(list.data.some(item => item._id === String(draft._id)))
      const detail = await send(`/${destination}/${published.publicSlug}`)
      assert.equal(detail.status, 200); assert.equal((await detail.json()).data._id, String(draft._id))
      assert.equal((await send(`/admin/ai-posts/${draft._id}/publish`, 'POST', { revision: published.revision })).status, 409)
      assert.equal((await send(`/admin/ai-posts/${draft._id}`, 'DELETE', { revision: published.revision, confirmed: true, scope: 'assistant-only' })).status, 200)
      assert.equal(await AssistantPost.countDocuments({ _id: draft._id }), 0)
      assert.equal(await Model.countDocuments({ _id: draft._id }), 1)
      console.log(JSON.stringify({ destination, collection: Model.collection.name, realPublication: 'passed', publicList: 'passed', publicDetailAPI: 'passed', assistantOnlyDeletion: 'passed' }))
    }
  }
} catch (error) {
  // No URI, credentials, server message, headers or response bodies in output.
  console.error(JSON.stringify({ verification: 'failed', name: error.name, code: error.code || null }))
  process.exitCode = 1
} finally {
  if (server) await new Promise(resolve => { server.closeAllConnections(); server.close(resolve) })
  if (ownsDatabase) {
    assert.equal(mongoose.connection.db.databaseName, databaseName)
    assert.ok(databaseName.startsWith('bigi_verify_publication_'))
    await mongoose.connection.db.dropDatabase()
    console.log('Isolated verification database removed; configured production database was not modified.')
  }
  await mongoose.disconnect()
}
